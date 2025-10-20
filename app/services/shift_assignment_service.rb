# app/services/shift_assignment_service.rb

class ShiftAssignmentService
  def initialize(shift:, worker:, assigned_by:)
    @shift = shift
    @worker = worker
    @assigned_by = assigned_by
  end

  def call
    return { success: false, error: 'Worker does not have required skill' } unless worker_has_skill?
    return { success: false, error: 'Shift is at capacity' } unless shift_has_capacity?
    return { success: false, error: 'Worker has overlapping assignment' } unless worker_available?

    assignment = Assignment.create!(
      shift: @shift,
      worker: @worker,
      assigned_by: @assigned_by,
      assigned_at_utc: Time.current,
      status: 'assigned'
    )

    { success: true, assignment: assignment }
  rescue => e
    { success: false, error: e.message }
  end

  private

  def worker_has_skill?
    @worker.has_skill?(@shift.role_needed)
  end

  def shift_has_capacity?
    @shift.assignments.count < @shift.capacity
  end

  def worker_available?
    @worker.available_for_shift?(@shift)
  end
end
