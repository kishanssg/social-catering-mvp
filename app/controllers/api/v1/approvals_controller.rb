class Api::V1::ApprovalsController < Api::V1::BaseController
  before_action :authenticate_user!
  before_action :set_event, only: [:show, :approve_event]
  before_action :set_assignment, only: [:update_hours, :mark_no_show, :remove]

  # GET /api/v1/events/:event_id/approvals
  def show
    assignments = @event.shifts
      .includes(assignments: :worker)
      .flat_map(&:assignments)
      .select { |a| a.status.in?(['assigned', 'confirmed', 'completed']) }
    
    # Deduplicate: Keep only the most recent assignment for each worker+shift combo
    # This prevents showing duplicate assignments even if they exist in the database
    assignments = assignments.group_by { |a| [a.shift_id, a.worker_id] }
                            .values
                            .map { |group| group.max_by(&:created_at) }

    render json: {
      status: 'success',
      data: {
        event: serialize_event_for_approval(@event),
        assignments: assignments.map { |a| serialize_assignment_for_approval(a) },
        cost_summary: @event.cost_summary
      }
    }
  end

  # PATCH /api/v1/approvals/:id/update_hours
  def update_hours
    unless @assignment.can_edit_hours?
      return render json: {
        status: 'error',
        message: 'Cannot edit hours for this assignment. Shift must be completed.'
      }, status: :unprocessable_entity
    end

    was_approved = @assignment.approved?
    previous_approver = was_approved ? @assignment.approved_by&.email : nil
    previous_approval_time = was_approved ? @assignment.approved_at_utc : nil
    
    ActiveRecord::Base.transaction do
      # If re-editing approved hours, un-approve and log it
      if was_approved
        @assignment.update_columns(
          approved: false,
          approved_by_id: nil,
          approved_at_utc: nil
        )
        
        ActivityLog.create!(
          actor_user_id: Current.user&.id,
          entity_type: 'Assignment',
          entity_id: @assignment.id,
          action: 'hours_reopened_for_editing',
          after_json: { 
            message: "Hours re-opened for editing by #{Current.user&.email}",
            previous_approver: previous_approver,
            previous_approval_time: previous_approval_time
          },
          created_at_utc: Time.current
        )
      end
      
      @assignment.update!(
        hours_worked: params[:hours_worked],
        actual_start_time_utc: params[:actual_start_time_utc],
        actual_end_time_utc: params[:actual_end_time_utc],
        hourly_rate: params[:hourly_rate].presence || @assignment.hourly_rate,
        edited_by: Current.user,
        edited_at_utc: Time.current
      )

      ActivityLog.create!(
        actor_user_id: Current.user&.id,
        entity_type: 'Assignment',
        entity_id: @assignment.id,
        action: was_approved ? 'hours_re_edited' : 'hours_updated',
        before_json: { original_hours_worked: @assignment.original_hours_worked },
        after_json: { hours_worked: @assignment.hours_worked },
        created_at_utc: Time.current
      )
    end

    render json: { 
      status: 'success', 
      message: was_approved ? 'Hours re-edited and un-approved. Please re-approve after review.' : 'Hours updated successfully',
      data: serialize_assignment_for_approval(@assignment.reload) 
    }
  rescue => e
    render json: { status: 'error', message: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/approvals/:id/mark_no_show
  def mark_no_show
    ActiveRecord::Base.transaction do
      @assignment.mark_no_show!(Current.user, notes: params[:notes])

      # Get worker and event names for activity log
      worker_name = @assignment.worker ? "#{@assignment.worker.first_name} #{@assignment.worker.last_name}" : nil
      event_name = @assignment.shift&.event&.title || @assignment.shift&.client_name || nil
      role = @assignment.shift&.role_needed || nil

      ActivityLog.create!(
        actor_user_id: Current.user&.id,
        entity_type: 'Assignment',
        entity_id: @assignment.id,
        action: 'marked_no_show',
        after_json: { 
          status: 'no_show', 
          notes: params[:notes],
          worker_name: worker_name,
          event_name: event_name,
          role: role
        },
        created_at_utc: Time.current
      )
    end

    render json: { status: 'success', data: serialize_assignment_for_approval(@assignment.reload) }
  rescue => e
    render json: { status: 'error', message: e.message }, status: :unprocessable_entity
  end

  # DELETE /api/v1/approvals/:id/remove
  def remove
    ActiveRecord::Base.transaction do
      @assignment.remove_from_job!(Current.user, notes: params[:notes])

      # Get worker and event names for activity log
      worker_name = @assignment.worker ? "#{@assignment.worker.first_name} #{@assignment.worker.last_name}" : nil
      event_name = @assignment.shift&.event&.title || @assignment.shift&.client_name || nil
      role = @assignment.shift&.role_needed || nil

      ActivityLog.create!(
        actor_user_id: Current.user&.id,
        entity_type: 'Assignment',
        entity_id: @assignment.id,
        action: 'removed_from_job',
        after_json: { 
          status: 'cancelled', 
          notes: params[:notes],
          worker_name: worker_name,
          event_name: event_name,
          role: role
        },
        created_at_utc: Time.current
      )
    end

    render json: { status: 'success', message: 'Assignment removed' }
  rescue => e
    render json: { status: 'error', message: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/events/:event_id/approve_all
  def approve_event
    approved_count = 0

    ActiveRecord::Base.transaction do
      assignments = @event.shifts
        .includes(:assignments)
        .flat_map(&:assignments)
        .select { |a| a.status.in?(['assigned', 'confirmed', 'completed']) && !a.approved? }

      assignments.each do |assignment|
        if assignment.can_approve?
          assignment.approve!(Current.user)
          approved_count += 1
        end
      end

      ActivityLog.create!(
        actor_user_id: Current.user&.id,
        entity_type: 'Event',
        entity_id: @event.id,
        action: 'event_hours_approved',
        after_json: { approved_count: approved_count },
        created_at_utc: Time.current
      )
    end

    render json: {
      status: 'success',
      message: "Approved #{approved_count} assignments",
      data: { approved_count: approved_count }
    }
  rescue => e
    render json: { status: 'error', message: e.message }, status: :unprocessable_entity
  end

  private

  def set_event
    @event = Event.find(params[:event_id] || params[:id])
  end

  def set_assignment
    @assignment = Assignment.find(params[:id])
  end

  def serialize_event_for_approval(event)
    # Derive a reliable event date from schedule or earliest shift
    start_ts = event.event_schedule&.start_time_utc ||
               (event.respond_to?(:schedule) ? event.schedule&.start_time_utc : nil) ||
               event.shifts.minimum(:start_time_utc)
    {
      id: event.id,
      title: event.title,
      event_date: start_ts&.to_date,
      venue_name: event.venue&.name,
      status: event.status,
      total_hours: event.total_hours_worked,
      total_cost: event.total_pay_amount
    }
  end

  def serialize_assignment_for_approval(a)
    {
      id: a.id,
      worker_id: a.worker_id,
      worker_name: [a.worker&.first_name, a.worker&.last_name].compact.join(' '),
      shift_id: a.shift_id,
      shift_role: a.shift&.role_needed,
      shift_date: a.shift&.start_time_utc&.to_date,
      
      # Scheduled times
      scheduled_start: a.shift&.start_time_utc,
      scheduled_end: a.shift&.end_time_utc,
      scheduled_hours: a.scheduled_hours,
      
      # Actual times
      actual_start: a.actual_start_time_utc,
      actual_end: a.actual_end_time_utc,
      
      # Hours and pay
      hours_worked: a.hours_worked,
      effective_hours: a.effective_hours,
      hourly_rate: a.hourly_rate,
      effective_hourly_rate: a.effective_hourly_rate,
      effective_pay: a.effective_pay,
      
      # Status and approval
      status: a.status,
      approved: a.approved,
      approved_by_name: a.approved_by&.email,
      approved_at: a.approved_at_utc,
      
      # Audit trail
      original_hours_worked: a.original_hours_worked,
      # omit edited_at fields if schema not present to avoid 500s
      edited_at: a.respond_to?(:edited_at_utc) ? a.edited_at_utc : nil,
      edited_by_name: a.edited_by&.email,
      approval_notes: a.approval_notes,
      
      # Permissions
      can_edit_hours: a.respond_to?(:can_edit_hours?) ? a.can_edit_hours? : true,
      can_approve: a.respond_to?(:can_approve?) ? a.can_approve? : true
    }
  end
end


