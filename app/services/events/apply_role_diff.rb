# frozen_string_literal: true

# Service to apply role diffs to published events
# Handles: adding/removing shifts, validating assignments, logging activity
class Events::ApplyRoleDiff
  attr_reader :event, :roles, :force, :summary, :errors

  def initialize(event:, roles:, force: false, reason: nil, apply_time_to_all_shifts: false)
    @event = event
    @roles = roles
    @force = force
    @reason = reason
    @apply_time_to_all_shifts = apply_time_to_all_shifts
    @added = 0
    @removed = 0
    @unchanged = 0
    @errors = []
    @summary = {}
  end

  def call
    validate_prerequisites
    return failure_response if errors.any?

    ActiveRecord::Base.transaction(isolation: :serializable) do
      # Lock the event row to prevent concurrent edits
      event.lock!
      
      # Process each role
      @roles.each do |role_params|
        process_role_diff(role_params)
      end
      
      # Update event schedule if provided
      update_event_schedule if params_include_schedule?
      
      build_summary
      
      success_response
    end
  rescue ActiveRecord::RecordInvalid => e
    @errors << e.message
    failure_response
  rescue ActiveRecord::StaleObjectError => e
    @errors << "This event was modified by another user. Please refresh and try again."
    failure_response
  rescue StandardError => e
    Rails.logger.error("Events::ApplyRoleDiff failed: #{e.message}\n#{e.backtrace.join("\n")}")
    @errors << e.message
    failure_response
  end

  private

  def validate_prerequisites
    # Can edit events that haven't started yet (published, draft, or partial status)
    # Cannot edit completed or deleted events
    if event.status.in?(['completed', 'deleted'])
      @errors << "Cannot edit #{event.status} events. Current status: #{event.status}"
    end
    
    # Cannot edit if event has started
    if event.event_schedule && event.event_schedule.start_time_utc < Time.current
      @errors << "Cannot edit event that has already started at #{event.event_schedule.start_time_utc.strftime('%I:%M %p')}"
    end
    
    # lock_version is handled automatically by ActiveRecord's optimistic locking
    # No need to manually check it
  end

  def process_role_diff(role_params)
    skill_name = role_params[:skill_name]
    new_needed = role_params[:needed].to_i
    existing_req = event.event_skill_requirements.find_by(skill_name: skill_name)
    
    Rails.logger.info "=== ApplyRoleDiff: Processing #{skill_name} ==="
    Rails.logger.info "  new_needed: #{new_needed}"
    
    if existing_req.nil?
      # New role - create shifts
      create_role_and_shifts(role_params, new_needed)
      @added += new_needed
    else
      # ✅ CRITICAL FIX: Check both actual shifts AND assigned workers
      # Use Shift.where instead of event.shifts to avoid cached association
      actual_shift_count = Shift.where(event_id: event.id, event_skill_requirement_id: existing_req.id).count
      assigned_count = Shift.where(event_id: event.id, event_skill_requirement_id: existing_req.id)
                          .joins(:assignments)
                          .where.not(assignments: { status: ['cancelled', 'no_show'] })
                          .distinct
                          .count
      
      Rails.logger.info "  actual_shift_count: #{actual_shift_count}"
      Rails.logger.info "  assigned_count: #{assigned_count}"
      
      # Don't allow reducing below assigned workers (protects assigned people)
      effective_needed = [new_needed, assigned_count].max
      Rails.logger.info "  effective_needed: #{effective_needed} (max of #{new_needed}, #{assigned_count})"
      
      # Calculate diff based on actual shifts vs. effective needed
      diff = effective_needed - actual_shift_count
      Rails.logger.info "  diff: #{diff} (#{effective_needed} - #{actual_shift_count})"
      
      if diff == 0
        # No change needed (but still update other fields like pay_rate)
        @unchanged += effective_needed
        Rails.logger.info "  Action: No change (diff == 0)"
      elsif diff > 0
        # Add shifts - we're below the requested count
        add_shifts_for_role(existing_req, diff)
        @added += diff
        Rails.logger.info "  Action: Adding #{diff} shifts"
      else
        # Remove ONLY unassigned shifts (never touches assigned ones)
        Rails.logger.info "  Action: Removing #{diff.abs} unassigned shifts"
        remove_shifts_for_role(existing_req, diff.abs)
        @removed += diff.abs
      end
      
      # Update the requirement with new details (use effective_needed, not user's request if too low)
      update_requirement(existing_req, role_params.merge(needed: effective_needed))
      Rails.logger.info "  Updated needed_workers to: #{effective_needed}"
    end
  end

  def create_role_and_shifts(role_params, count)
    req = event.event_skill_requirements.create!(
      skill_name: role_params[:skill_name],
      needed_workers: count,
      pay_rate: role_params[:pay_rate],
      description: role_params[:description],
      uniform_name: role_params[:uniform_id] ? get_uniform_name(role_params[:uniform_id]) : nil,
      certification_name: role_params[:cert_id] ? get_cert_name(role_params[:cert_id]) : nil,
      required_certification_id: role_params[:cert_id]
    )
    
    create_shifts_for_requirement(req, count)
  end

  def add_shifts_for_role(requirement, count)
    event.with_lock do
      create_shifts_for_requirement(requirement, count)
    end
  end

  def remove_shifts_for_role(requirement, count_to_remove)
    # ✅ SIMPLIFIED: Only delete unassigned shifts, never touch assigned ones
    # The caller (process_role_diff) already ensures we never try to go below assigned count
    Rails.logger.info "=== remove_shifts_for_role: #{requirement.skill_name}, count_to_remove: #{count_to_remove} ==="
    
    unfilled_shifts = event.shifts
      .where(event_skill_requirement_id: requirement.id)
      .left_joins(:assignments)
      .where(assignments: { id: nil })
      .order(id: :desc) # Delete newest first
      .limit(count_to_remove)
    
    Rails.logger.info "  Found #{unfilled_shifts.count} unassigned shifts (shift IDs: #{unfilled_shifts.pluck(:id).join(', ')})"
    
    # Delete unfilled shifts (will be 0 to count_to_remove shifts)
    removed_count = 0
    unfilled_shifts.each do |shift|
      Rails.logger.info "  Deleting shift #{shift.id}..."
      log_shift_deletion(shift, nil)
      shift.destroy!
      removed_count += 1
      Rails.logger.info "  ✓ Deleted shift #{shift.id}"
    end
    
    Rails.logger.info "Removed #{removed_count} orphaned shifts for #{requirement.skill_name}"
  end

  def unassign_workers_and_delete_shift(shift)
    assignments = shift.assignments.where.not(status: ['cancelled', 'no_show'])
    
    worker_ids = assignments.pluck(:worker_id)
    
    # Log unassignments
    assignments.each do |assignment|
      ActivityLog.create!(
        actor_user_id: Current.user&.id,
        entity_type: 'Assignment',
        entity_id: assignment.id,
        action: 'unassigned',
        before_json: assignment.attributes,
        after_json: { status: 'cancelled', reason: @reason },
        created_at_utc: Time.current
      )
      assignment.update!(status: 'cancelled')
    end
    
    # Log shift deletion
    log_shift_deletion(shift, worker_ids)
    shift.destroy!
  end

  def log_shift_deletion(shift, affected_worker_ids)
    ActivityLog.create!(
      actor_user_id: Current.user&.id,
      entity_type: 'Shift',
      entity_id: shift.id,
      action: 'deleted',
      before_json: shift.attributes,
      after_json: { 
        reason: @reason,
        affected_worker_ids: affected_worker_ids || []
      },
      created_at_utc: Time.current
    )
  end

  def create_shifts_for_requirement(requirement, count)
    count.times do
      shift = event.shifts.create!(
        client_name: event.title,
        role_needed: requirement.skill_name,
        start_time_utc: event.event_schedule.start_time_utc,
        end_time_utc: event.event_schedule.end_time_utc,
        capacity: 1,
        pay_rate: requirement.pay_rate || 0,
        notes: event.check_in_instructions,
        event_skill_requirement_id: requirement.id,
        auto_generated: true,
        required_skill: requirement.skill_name,
        required_cert_id: requirement.required_certification_id,
        uniform_name: requirement.uniform_name,
        status: 'published',
        created_by: Current.user
      )
      
      # Shift creation is logged by Auditable concern
    end
  end

  def update_requirement(existing_req, role_params)
    # Update the requirement with the requested needed_workers count
    # The shift creation/deletion logic already handled making the actual shifts match
    existing_req.update!(
      needed_workers: role_params[:needed].to_i, # Use the requested count from role_params
      pay_rate: role_params[:pay_rate],
      uniform_name: role_params[:uniform_id] ? get_uniform_name(role_params[:uniform_id]) : nil,
      certification_name: role_params[:cert_id] ? get_cert_name(role_params[:cert_id]) : nil,
      required_certification_id: role_params[:cert_id],
      description: role_params[:description]
    )
  end

  def update_event_schedule
    return unless params_include_schedule?
    
    schedule_params = extract_schedule_params
    return if schedule_params.empty?
    
    if event.event_schedule
      old_schedule = event.event_schedule.attributes.dup
      event.event_schedule.update!(schedule_params)
      
      if @apply_time_to_all_shifts
        # Update all child shift times
        update_all_child_shift_times(schedule_params)
      end
      
      # Log schedule update
      ActivityLog.create!(
        actor_user_id: Current.user&.id,
        entity_type: 'EventSchedule',
        entity_id: event.event_schedule.id,
        action: 'updated',
        before_json: old_schedule,
        after_json: event.event_schedule.attributes,
        created_at_utc: Time.current
      )
    end
  end

  def update_all_child_shift_times(schedule_params)
    # Use centralized service for shift time synchronization (Single Source of Truth)
    Events::SyncShiftTimes.new(
      event: event,
      start_time_utc: schedule_params[:start_time_utc],
      end_time_utc: schedule_params[:end_time_utc]
    ).call
  end

  def params_include_schedule?
    # Check if roles params include schedule data
    false # Will be implemented when extracting from controller
  end

  def extract_schedule_params
    {} # Will be implemented when extracting from controller
  end

  def get_uniform_name(uniform_id)
    # Fetch from database or config
    # TODO: Implement uniform lookup
    nil
  end

  def get_cert_name(cert_id)
    # Fetch from database or config
    # TODO: Implement cert lookup
    nil
  end

  def build_summary
    @summary = {
      added: @added,
      removed: @removed,
      unchanged: @unchanged,
      total: @added + @removed + @unchanged
    }
  end

  def success_response
    { success: true, summary: @summary }
  end

  def failure_response
    { success: false, errors: @errors }
  end
end

