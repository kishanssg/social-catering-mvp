# app/services/event_publishing_service.rb

class EventPublishingService
  def initialize(event:)
    @event = event
  end

  def call
    return { success: false, error: 'Event is already published' } if @event.status == 'published'
    return { success: false, error: 'Event must have skill requirements' } unless @event.event_skill_requirements.any?
    return { success: false, error: 'Event must have schedule' } unless @event.event_schedule.present?

    @event.publish!
    @event.generate_shifts!

    { success: true, event: @event }
  rescue => e
    { success: false, error: e.message }
  end

  private

  def validate_event
    @event.event_skill_requirements.any? && @event.event_schedule.present?
  end

  def generate_shifts_for_skill_requirement(skill_requirement)
    schedule = @event.event_schedule
    return unless schedule

    skill_requirement.needed_workers.times do
      @event.shifts.create!(
        role_needed: skill_requirement.skill_name,
        capacity: 1,
        start_time_utc: schedule.start_time_utc,
        end_time_utc: schedule.end_time_utc,
        status: 'published',
        client_name: @event.title,
        location: @event.venue&.formatted_address
      )
    end
  end
end
