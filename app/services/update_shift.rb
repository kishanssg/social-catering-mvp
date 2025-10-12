class UpdateShift < ApplicationService
  def initialize(shift:, shift_params:, updated_by:)
    @shift = shift
    @shift_params = shift_params
    @updated_by = updated_by
  end

  def call
    # Set current user for activity logging
    Current.user = @updated_by

    if @shift.update(@shift_params)
      success(shift: @shift)
    else
      failure(@shift.errors.full_messages.join(", "))
    end
  rescue => e
    failure("Failed to update shift: #{e.message}")
  end
end
