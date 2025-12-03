# app/services/shift_assignment_service.rb

class ShiftAssignmentService
  def initialize(shift:, worker:, assigned_by:)
    @shift = shift
    @worker = worker
    @assigned_by = assigned_by
    @validation_error = nil
  end

  def call
    if validate_assignment
      assignment = Assignment.create!(
        shift: @shift,
        worker: @worker,
        assigned_by: @assigned_by,
        assigned_at_utc: Time.current,
        status: "assigned"
      )
      { success: true, assignment: assignment }
    else
      { success: false, error: @validation_error || "Unable to assign worker" }
    end
  rescue => e
    { success: false, error: e.message }
  end

  private

  def validate_assignment
    return false unless ensure_skill!
    return false unless ensure_capacity!
    return false unless ensure_availability!
    return false unless ensure_required_certification!
    true
  end

  def ensure_skill!
    return true if worker_has_skill?

    @validation_error = "Worker does not have required skill"
    false
  end

  def ensure_capacity!
    return true if shift_has_capacity?

    @validation_error = "Shift is at capacity"
    false
  end

  def ensure_availability!
    return true if worker_available?

    @validation_error = "Worker has overlapping assignment"
    false
  end

  def ensure_required_certification!
    cert_id = required_certification_id
    return true unless cert_id

    certification_record = @worker.worker_certifications.find_by(certification_id: cert_id)

    if certification_record.nil?
      @validation_error = "Worker lacks required certification"
      return false
    end

    if certification_record.expires_at_utc && certification_record.expires_at_utc < @shift.end_time_utc
      @validation_error = "Worker certification has expired"
      return false
    end

    true
  end

  def worker_has_skill?
    return true if @shift.role_needed.blank?
    @worker.has_skill?(@shift.role_needed)
  end

  def shift_has_capacity?
    @shift.assignments.where.not(status: %w[cancelled no_show]).count < @shift.capacity
  end

  def worker_available?
    @worker.available_for_shift?(@shift)
  end

  def required_certification_id
    @required_certification_id ||= @shift.required_cert_id || @shift.skill_requirement&.required_certification_id
  end

  def required_certification_name
    @shift.required_certification&.name || @shift.skill_requirement&.required_certification&.name
  end
end
