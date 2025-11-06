class Api::V1::EventSkillRequirementsController < Api::V1::BaseController
  before_action :authenticate_user!
  before_action :set_event
  before_action :set_event_skill_requirement, only: [:update, :destroy]

  # POST /api/v1/events/:event_id/event_skill_requirements
  def create
    @event_skill_requirement = @event.event_skill_requirements.new(event_skill_requirement_params)

    if @event_skill_requirement.save
      render json: {
        status: 'success',
        data: serialize_event_skill_requirement(@event_skill_requirement)
      }, status: :created
    else
      render json: {
        status: 'validation_error',
        errors: @event_skill_requirement.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/events/:event_id/event_skill_requirements/:id
  def update
    # Wrap in transaction to ensure atomicity with cascade operations
    ActiveRecord::Base.transaction do
      if @event_skill_requirement.update!(event_skill_requirement_params)
        # Callback will cascade pay_rate to shifts and recalculate totals
        render json: {
          status: 'success',
          data: serialize_event_skill_requirement(@event_skill_requirement)
        }
      end
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      status: 'validation_error',
      errors: e.record.errors.full_messages
    }, status: :unprocessable_entity
  rescue => e
    Rails.logger.error "EventSkillRequirement#update failed: #{e.message}"
    render json: {
      status: 'error',
      errors: [e.message]
    }, status: :unprocessable_entity
  end

  # DELETE /api/v1/events/:event_id/event_skill_requirements/:id
  def destroy
    @event_skill_requirement.destroy
    render json: { status: 'success' }
  end

  private

  def set_event
    @event = Event.find(params[:event_id])
  rescue ActiveRecord::RecordNotFound
    render json: { status: 'error', error: 'Event not found' }, status: :not_found
  end

  def set_event_skill_requirement
    @event_skill_requirement = @event.event_skill_requirements.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { status: 'error', error: 'Event skill requirement not found' }, status: :not_found
  end

  def event_skill_requirement_params
    params.require(:event_skill_requirement).permit(
      :skill_name, :needed_workers, :description, :uniform_name, :certification_name, :pay_rate
    )
  end

  def serialize_event_skill_requirement(event_skill_requirement)
    {
      id: event_skill_requirement.id,
      event_id: event_skill_requirement.event_id,
      skill_name: event_skill_requirement.skill_name,
      needed_workers: event_skill_requirement.needed_workers,
      description: event_skill_requirement.description,
      uniform_name: event_skill_requirement.uniform_name,
      certification_name: event_skill_requirement.certification_name,
      pay_rate: event_skill_requirement.pay_rate,
      created_at: event_skill_requirement.created_at_utc,
      updated_at: event_skill_requirement.updated_at_utc
    }
  end
end
