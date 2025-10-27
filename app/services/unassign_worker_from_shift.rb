class UnassignWorkerFromShift < ApplicationService
  def initialize(assignment, unassigned_by)
    @assignment = assignment
    @unassigned_by = unassigned_by
  end

  def call
    # Set current user for activity logging
    Current.user = @unassigned_by

    # Use advisory lock to prevent race conditions
    Assignment.transaction do
      conn = ActiveRecord::Base.connection
      conn.execute("SELECT pg_advisory_lock(#{@assignment.worker_id})")

      begin
        # Check if assignment can be removed
        if @assignment.status != "assigned"
          return failure("Assignment is not in assigned status")
        end

        # Log the unassignment before destroying
        ActivityLog.create!(
          actor_user_id: @unassigned_by.id,
          entity_type: "Assignment",
          entity_id: @assignment.id,
          action: "unassigned_worker",
          before_json: {
            worker_id: @assignment.worker_id,
            worker_name: "#{@assignment.worker.first_name} #{@assignment.worker.last_name}",
            worker_first_name: @assignment.worker.first_name,
            worker_last_name: @assignment.worker.last_name,
            shift_id: @assignment.shift_id,
            shift_name: @assignment.shift.client_name,
            event_name: @assignment.shift.client_name,
            role: @assignment.shift.role_needed,
            hourly_rate: @assignment.hourly_rate
          },
          after_json: nil,
          created_at_utc: Time.current
        )

        # Remove the assignment
        @assignment.destroy!

        success({ message: "Worker successfully unassigned from shift" })
      ensure
        conn.execute("SELECT pg_advisory_unlock(#{@assignment.worker_id})")
      end
    end
  rescue => e
    failure("Failed to unassign worker from shift: #{e.message}")
  end
end
