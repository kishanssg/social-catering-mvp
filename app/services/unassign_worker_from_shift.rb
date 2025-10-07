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
        if @assignment.status != 'assigned'
          return failure("Assignment is not in assigned status")
        end
        
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
