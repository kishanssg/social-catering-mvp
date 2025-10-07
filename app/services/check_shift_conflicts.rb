class CheckShiftConflicts
  def self.call(shift, worker)
    new(shift, worker).call
  end
  
  def initialize(shift, worker)
    @shift = shift
    @worker = worker
  end
  
  def call
    conflicts = []
    
    conflicts << check_time_overlap
    conflicts << check_capacity
    conflicts << check_certification_expiration
    
    conflicts.compact
  end
  
  private
  
  def check_time_overlap
    overlapping = Assignment.joins(:shift)
      .where(worker_id: @worker.id, status: 'assigned')
      .where(
        "(shifts.start_time_utc < ? AND shifts.end_time_utc > ?)",
        @shift.end_time_utc,
        @shift.start_time_utc
      )
    
    if overlapping.exists?
      existing = overlapping.first.shift
      {
        type: 'time_overlap',
        message: "Worker has overlapping shift from #{existing.start_time_utc.strftime('%I:%M%p')} to #{existing.end_time_utc.strftime('%I:%M%p')}",
        shift_id: existing.id
      }
    end
  end
  
  def check_capacity
    assigned_count = Assignment.where(
      shift_id: @shift.id,
      status: 'assigned'
    ).count
    
    if assigned_count >= @shift.capacity
      {
        type: 'capacity_exceeded',
        message: "Shift is at full capacity (#{@shift.capacity} workers)",
        current_count: assigned_count
      }
    end
  end
  
  def check_certification_expiration
    # Check if shift requires certification
    if @shift.required_cert_id
      cert_ok = @worker.worker_certifications
        .where(certification_id: @shift.required_cert_id)
        .where("expires_at_utc >= ?", @shift.end_time_utc)
        .exists?
      
      unless cert_ok
        {
          type: 'certification_expired',
          message: "Worker's certification expires before shift ends or is missing",
          required_cert_id: @shift.required_cert_id
        }
      end
    end
  end
end
