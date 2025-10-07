class CreateShift < ApplicationService
  def initialize(shift_params:, created_by:)
    @shift_params = shift_params
    @created_by = created_by
  end

  def call
    # Set current user for activity logging
    Current.user = @created_by
    
    shift = Shift.new(@shift_params.merge(created_by: @created_by))
    
    if shift.save
      success(shift: shift)
    else
      failure(shift.errors.full_messages.join(', '))
    end
  rescue => e
    failure("Failed to create shift: #{e.message}")
  end
end
