class Api::V1::EventSkillRequirementsController < Api::V1::BaseController
  before_action :authenticate_user!
  before_action :set_event
  before_action :set_event_skill_requirement, only: [ :update, :destroy, :eligible_workers ]

  # POST /api/v1/events/:event_id/event_skill_requirements
  def create
    @event_skill_requirement = @event.event_skill_requirements.new(event_skill_requirement_params)

    if @event_skill_requirement.save
      render json: {
        status: "success",
        data: serialize_event_skill_requirement(@event_skill_requirement)
      }, status: :created
    else
      render json: {
        status: "validation_error",
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
          status: "success",
          data: serialize_event_skill_requirement(@event_skill_requirement)
        }
      end
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      status: "validation_error",
      errors: e.record.errors.full_messages
    }, status: :unprocessable_entity
  rescue => e
    Rails.logger.error "EventSkillRequirement#update failed: #{e.message}"
    render json: {
      status: "error",
      errors: [ e.message ]
    }, status: :unprocessable_entity
  end

  # DELETE /api/v1/events/:event_id/event_skill_requirements/:id
  def destroy
    @event_skill_requirement.destroy
    render json: { status: "success" }
  end

  def eligible_workers
    shift = if params[:shift_id].present?
              @event.shifts.find_by(id: params[:shift_id])
    else
              @event.shifts.where(role_needed: @event_skill_requirement.skill_name).order(:start_time_utc).first
    end

    service = Events::EligibleWorkersForRole.new(event: @event, requirement: @event_skill_requirement, shift: shift)
    result = service.call

    window_end = result[:shift][:end_time_utc]

    render json: {
      status: "success",
      data: {
        role: result[:role],
        shift: result[:shift],
        eligible_workers: result[:workers].map { |worker| serialize_worker(worker, @event_skill_requirement, window_end) }
      }
    }
  end

  private

  def set_event
    @event = Event.find(params[:event_id])
  rescue ActiveRecord::RecordNotFound
    render json: { status: "error", error: "Event not found" }, status: :not_found
  end

  def set_event_skill_requirement
    @event_skill_requirement = @event.event_skill_requirements.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { status: "error", error: "Event skill requirement not found" }, status: :not_found
  end

  def event_skill_requirement_params
    params.require(:event_skill_requirement).permit(
      :skill_name,
      :needed_workers,
      :description,
      :uniform_name,
      :certification_name,
      :required_certification_id,
      :pay_rate
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
      required_certification: event_skill_requirement.required_certification&.slice(:id, :name),
      pay_rate: event_skill_requirement.pay_rate,
      created_at: event_skill_requirement.created_at_utc,
      updated_at: event_skill_requirement.updated_at_utc
    }
  end

  def serialize_worker(worker, requirement, shift_end_time)
    has_required = if requirement.required_certification_id.present?
                     worker.has_valid_certification?(requirement.required_certification_id, shift_end_time)
    else
                     true
    end

    {
      id: worker.id,
      first_name: worker.first_name,
      last_name: worker.last_name,
      full_name: worker.full_name,
      email: worker.email,
      phone: worker.phone,
      skills: worker.skills,
      certifications: worker.worker_certifications.includes(:certification).map do |wc|
        {
          id: wc.certification_id,
          name: wc.certification&.name,
          expires_at_utc: wc.expires_at_utc
        }
      end,
      has_required_certification: has_required
    }
  end
end
