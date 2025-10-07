class CheckConflicts < ApplicationService
  def initialize(worker:, shift:)
    @worker = worker
    @shift = shift
  end

  def call
    conflicts = []
    
    # Rule 1: Time Overlap Check
    overlap_conflicts = check_time_overlap
    conflicts.concat(overlap_conflicts) if overlap_conflicts.any?
    
    # Rule 2: Capacity Check
    capacity_conflicts = check_capacity
    conflicts.concat(capacity_conflicts) if capacity_conflicts.any?
    
    # Rule 3: Certification Expiration Check
    cert_conflicts = check_certification_expiration
    conflicts.concat(cert_conflicts) if cert_conflicts.any?
    
    if conflicts.any?
      failure(conflicts.join('; '))
    else
      success(conflicts: [])
    end
  rescue => e
    failure("Failed to check conflicts: #{e.message}")
  end

  private

  def check_time_overlap
    conflicts = []
    
    # Check for overlapping assignments
    overlapping_assignments = Assignment.joins(:shift)
      .where(worker_id: @worker.id, status: 'assigned')
      .where("shifts.start_time_utc < ? AND shifts.end_time_utc > ?",
             @shift.end_time_utc, @shift.start_time_utc)
    
    if overlapping_assignments.exists?
      conflicts << "Worker has overlapping shift assignment"
    end
    
    conflicts
  end

  def check_capacity
    conflicts = []
    
    # Check if shift is at capacity
    assigned_count = Assignment.where(shift_id: @shift.id, status: 'assigned').count
    
    if assigned_count >= @shift.capacity
      conflicts << "Shift is at capacity (#{assigned_count}/#{@shift.capacity})"
    end
    
    conflicts
  end

  def check_certification_expiration
    conflicts = []
    
    # Check if shift requires certification
    if @shift.required_cert_id
      cert_ok = @worker.worker_certifications
        .where(cert_id: @shift.required_cert_id)
        .where("expires_at_utc >= ?", @shift.end_time_utc)
        .exists?
      
      unless cert_ok
        conflicts << "Worker's certification expires before shift ends or is missing"
      end
    end
    
    conflicts
  end
end
