class EventCreationService
  def initialize(event_params, skill_requirements_params = [], schedule_params = nil)
    @event_params = event_params
    @skill_requirements_params = skill_requirements_params
    @schedule_params = schedule_params
  end

  def call
    ActiveRecord::Base.transaction do
      # Create the event
      @event = Event.create!(@event_params)

      # Create skill requirements
      create_skill_requirements if @skill_requirements_params.any?

      # Create schedule
      create_schedule if @schedule_params.present?

      # Return success response
      {
        success: true,
        event: @event,
        message: "Event created successfully"
      }
    end
  rescue ActiveRecord::RecordInvalid => e
    {
      success: false,
      errors: e.record.errors.full_messages,
      message: "Event creation failed due to validation errors"
    }
  rescue => e
    {
      success: false,
      errors: [ e.message ],
      message: "Event creation failed due to unexpected error"
    }
  end

  private

  def create_skill_requirements
    @skill_requirements_params.each do |skill_data|
      @event.event_skill_requirements.create!(
        skill_name: skill_data[:skill_name] || skill_data["skill_name"],
        needed_workers: skill_data[:needed_workers] || skill_data["needed_workers"] || 1,
        description: skill_data[:description] || skill_data["description"],
        uniform_name: skill_data[:uniform_name] || skill_data["uniform_name"],
        certification_name: skill_data[:certification_name] || skill_data["certification_name"],
        required_certification_id: skill_data[:required_certification_id] || skill_data["required_certification_id"]
      )
    end
  end

  def create_schedule
    return if @schedule_params.blank?

    start_time = @schedule_params[:start_time_utc] || @schedule_params["start_time_utc"]
    end_time = @schedule_params[:end_time_utc] || @schedule_params["end_time_utc"]
    break_minutes = @schedule_params[:break_minutes] || @schedule_params["break_minutes"] || 0

    @event.create_event_schedule!(
      start_time_utc: Time.parse(start_time),
      end_time_utc: Time.parse(end_time),
      break_minutes: break_minutes
    )
  end
end
