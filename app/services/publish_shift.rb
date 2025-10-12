class PublishShift < ApplicationService
  def initialize(shift:, published_by:)
    @shift = shift
    @published_by = published_by
  end

  def call
    # Set current user for activity logging
    Current.user = @published_by

    if @shift.status == "draft"
      if @shift.update(status: "published")
        success(shift: @shift)
      else
        failure(@shift.errors.full_messages.join(", "))
      end
    else
      failure("Shift is already published or in an invalid state")
    end
  rescue => e
    failure("Failed to publish shift: #{e.message}")
  end
end
