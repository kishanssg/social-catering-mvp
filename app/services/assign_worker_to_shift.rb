class AssignWorkerToShift < ApplicationService
  def initialize(shift, worker, assigned_by)
    @shift = shift
    @worker = worker
    @assigned_by = assigned_by
  end
  
  def call
    # Set current user for activity logging
    Current.user = @assigned_by
    
    Assignment.transaction do
      acquire_lock!
      
      begin
        check_conflicts!
        create_assignment
        
        success(assignment: @assignment)
      ensure
        release_lock!
      end
    end
  rescue ActiveRecord::RecordInvalid => e
    failure(e.message)
  rescue ConflictError => e
    failure(e.message, status: :conflict)
  rescue LockTimeoutError => e
    failure("Worker is being assigned by another admin. Please try again.", status: :conflict)
  rescue => e
    failure("Assignment failed: #{e.message}")
  end
  
  private
  
  def acquire_lock!
    conn = ActiveRecord::Base.connection
    result = conn.execute("SELECT pg_advisory_lock(#{@worker.id})")
    
    # PostgreSQL advisory lock doesn't timeout by default
    # We rely on transaction timeout instead
  end
  
  def release_lock!
    conn = ActiveRecord::Base.connection
    conn.execute("SELECT pg_advisory_unlock(#{@worker.id})")
  end
  
  def check_conflicts!
    conflicts = CheckShiftConflicts.call(@shift, @worker)
    
    if conflicts.any?
      raise ConflictError, format_conflicts(conflicts)
    end
  end
  
  def create_assignment
    @assignment = Assignment.create!(
      shift: @shift,
      worker: @worker,
      assigned_by: @assigned_by,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )
  end
  
  def format_conflicts(conflicts)
    conflicts.map { |c| c[:message] }.join("; ")
  end
end

class ConflictError < StandardError; end
class LockTimeoutError < StandardError; end
