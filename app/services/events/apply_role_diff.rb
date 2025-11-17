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
    # Only published events can be edited
    unless event.status == 'published'
      @errors << "Only published events can be edited. Current status: #{event.status}"
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
    
    if existing_req.nil?
      # New role - create shifts
      create_role_and_shifts(role_params, new_needed)
      @added += new_needed
    else
      # Calculate diff based on needed_workers in the requirement, not actual shift count
      current_needed = existing_req.needed_workers
      diff = new_needed - current_needed
      
      if diff == 0
        # No change needed (but still update other fields like pay_rate)
        @unchanged += new_needed
      elsif diff > 0
        # Add shifts
        add_shifts_for_role(existing_req, diff)
        @added += diff
      else
        # Remove shifts - check for assignments
        remove_shifts_for_role(existing_req, diff.abs)
        @removed += diff.abs
      end
      
      # Update the requirement with new details
      update_requirement(existing_req, role_params)
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
    # Find unfilled shifts
    unfilled_shifts = event.shifts
      .where(role_needed: requirement.skill_name)
      .left_joins(:assignments)
      .where(assignments: { id: nil })
      .limit(count_to_remove)
    
    # Check if we have enough empty shifts
    if unfilled_shifts.count < count_to_remove
      # Check if there are assigned shifts that need force
      assigned_shifts = event.shifts
        .where(role_needed: requirement.skill_name)
        .joins(:assignments)
        .where.not(assignments: { status: ['cancelled', 'no_show'] })
        .distinct
      
      if assigned_shifts.any?
        required = count_to_remove
        available = unfilled_shifts.count
        needed_from_assigned = required - available
        
        if !@force
          @errors << "Can't remove #{count_to_remove} shifts; only #{available} unfilled shifts are available. #{needed_from_assigned} would require unassigning workers. Use force: true to proceed."
          return
        end
        
        # With force, unassign and delete
        assigned_shifts.limit(needed_from_assigned).each do |shift|
          unassign_workers_and_delete_shift(shift)
          @removed += 1
        end
      end
    end
    
    # Delete unfilled shifts
    unfilled_shifts.each do |shift|
      log_shift_deletion(shift, nil)
      shift.destroy!
    end
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
    # Calculate new needed_workers based on current shift count
    # We need to find the total shifts for this role
    total_shifts = event.shifts.where(role_needed: existing_req.skill_name).count
    
    existing_req.update!(
      needed_workers: total_shifts, # Update to match actual shifts
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

