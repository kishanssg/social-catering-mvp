class Api::V1::EventsController < Api::V1::BaseController
  before_action :authenticate_user!
  before_action :set_event, only: [:show, :update, :destroy, :publish, :complete]

  # GET /api/v1/events
  def index
    events = Event.includes(:venue, :event_skill_requirements, :event_schedule)
    
    # Filter by status
    events = events.where(status: params[:status]) if params[:status].present?
    
    # Filter by date range (if schedule exists)
    if params[:start_date].present? && params[:end_date].present?
      events = events.joins(:event_schedule).where(
        event_schedules: { 
          start_time_utc: Date.parse(params[:start_date])..Date.parse(params[:end_date]) 
        }
      )
    end
    
    render json: {
      status: 'success',
      data: events.map { |event| serialize_event(event) }
    }
  end

  # GET /api/v1/events/:id
  def show
    render json: {
      status: 'success',
      data: serialize_event_detailed(@event)
    }
  end

      # POST /api/v1/events
      def create
        ActiveRecord::Base.transaction do
          @event = Event.new(event_params.except(:skill_requirements, :schedule))
          # Use the status from params or default to 'draft'
          @event.status = params[:event][:status] || 'draft'
          @event.save!
          
          # Create skill requirements
          if params[:event][:skill_requirements].present?
            params[:event][:skill_requirements].each do |skill_req|
              @event.event_skill_requirements.create!(skill_requirement_params(skill_req))
            end
          end
          
          # Create schedule
          if params[:event][:schedule].present?
            @event.create_event_schedule!(schedule_params(params[:event][:schedule]))
          end
          
          # Auto-publish if requested
          if params[:auto_publish] == 'true'
            @event.update!(status: 'published')
            @event.generate_shifts!
          end
          
          render json: {
            status: 'success',
            message: params[:auto_publish] == 'true' ? 'Event created and published' : 'Event saved as draft',
            data: serialize_event(@event.reload)
          }, status: :created
        end
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      status: 'validation_error',
      errors: e.record.errors.full_messages
    }, status: :unprocessable_entity
  end

  # PATCH/PUT /api/v1/events/:id
  def update
    ActiveRecord::Base.transaction do
      @event.update!(event_params.except(:skill_requirements, :schedule))
      
      # Update skill requirements (replace all)
      if params[:event][:skill_requirements].present?
        @event.event_skill_requirements.destroy_all
        params[:event][:skill_requirements].each do |skill_req|
          @event.event_skill_requirements.create!(skill_requirement_params(skill_req))
        end
      end
      
      # Update schedule
      if params[:event][:schedule].present?
        if @event.event_schedule
          @event.event_schedule.update!(schedule_params(params[:event][:schedule]))
        else
          @event.create_event_schedule!(schedule_params(params[:event][:schedule]))
        end
      end
      
      render json: {
        status: 'success',
        data: serialize_event(@event.reload)
      }
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      status: 'validation_error',
      errors: e.record.errors.full_messages
    }, status: :unprocessable_entity
  end

  # DELETE /api/v1/events/:id
  def destroy
    @event.destroy
    render json: { status: 'success' }
  end

  # POST /api/v1/events/:id/publish
  # Publishes a draft event, generates shifts, and returns summary
  def publish
    unless @event.status == 'draft' || @event.status == 'published'
      return render json: { status: 'error', message: 'Only draft or already published events can be published' }, status: :unprocessable_entity
    end

    ActiveRecord::Base.transaction do
      # Set status to published (triggers generation via callback) if still draft
      if @event.status == 'draft'
        @event.update!(status: 'published')
      else
        # If already published but shifts not generated, attempt generation
        @event.generate_shifts! unless @event.shifts_generated
      end
    end

    render json: {
      status: 'success',
      message: "Generated #{@event.shifts.count} shifts",
      data: serialize_event_detailed(@event.reload)
    }
  rescue ActiveRecord::RecordInvalid => e
    render json: { status: 'validation_error', errors: e.record.errors.full_messages }, status: :unprocessable_entity
  rescue => e
    render json: { status: 'error', message: e.message }, status: 500
  end

  # PATCH /api/v1/events/:id/status
  def update_status
    new_status = params[:status]
    
    unless %w[draft published assigned completed].include?(new_status)
      return render json: {
        errors: ['Invalid status. Must be draft, published, assigned, or completed'],
        status: 'validation_error'
      }, status: :unprocessable_entity
    end

    if @event.update(status: new_status)
      render json: {
        data: event_json(@event),
        status: 'success'
      }
    else
      render json: {
        errors: @event.errors.full_messages,
        status: 'validation_error'
      }, status: :unprocessable_entity
    end
  end

  # POST /api/v1/events/:id/complete
  def complete
    unless @event.can_be_completed?
      return render json: {
        status: 'error',
        message: 'Event cannot be completed. Must be published and past end time.'
      }, status: :unprocessable_entity
    end

    if @event.complete!(notes: params[:completion_notes])
      render json: {
        status: 'success',
        message: 'Event completed successfully',
        data: serialize_event_detailed(@event.reload)
      }
    else
      render json: {
        status: 'error',
        message: 'Failed to complete event'
      }, status: :unprocessable_entity
    end
  end

  private

  def set_event
    @event = Event.find(params[:id])
  end

  def event_params
    params.require(:event).permit(
      :title, :status, :venue_id, :check_in_instructions,
      :supervisor_name, :supervisor_phone, :completion_notes
    )
  end

  def skill_requirement_params(skill_req)
    skill_req.permit(:skill_name, :needed_workers, :description, :uniform_name, :certification_name)
  end

  def schedule_params(schedule)
    schedule.permit(:start_time_utc, :end_time_utc, :break_minutes)
  end

  def serialize_event(event)
    {
      id: event.id,
      title: event.title,
      status: event.status,
      venue: event.venue&.as_json(only: [:id, :name, :formatted_address, :city, :state]),
      check_in_instructions: event.check_in_instructions,
      supervisor_name: event.supervisor_name,
      supervisor_phone: event.supervisor_phone,
      skill_requirements: event.event_skill_requirements.as_json(
        only: [:id, :skill_name, :needed_workers, :description, :uniform_name, :certification_name, :pay_rate]
      ),
      schedule: event.event_schedule&.as_json(
        only: [:id, :start_time_utc, :end_time_utc, :break_minutes]
      ),
      total_workers_needed: event.total_workers_needed,
      duration_hours: event.duration_hours,
      assigned_workers_count: event.assigned_workers_count,
      unfilled_roles_count: event.unfilled_roles_count,
      staffing_percentage: event.staffing_percentage,
      staffing_summary: event.staffing_summary,
      total_shifts_count: event.total_shifts_count,
      assigned_shifts_count: event.assigned_shifts_count,
      shifts_generated: event.shifts_generated,
      completed_at_utc: event.completed_at_utc,
      total_hours_worked: event.total_hours_worked,
      total_pay_amount: event.total_pay_amount,
      completion_notes: event.completion_notes,
      created_at: event.created_at_utc,
      updated_at: event.updated_at_utc
    }
  end

  def serialize_event_detailed(event)
    serialize_event(event).merge(
      shifts: event.shifts.order(:start_time_utc).map do |s|
        {
          id: s.id,
          client_name: s.client_name,
          role_needed: s.role_needed,
          start_time_utc: s.start_time_utc,
          end_time_utc: s.end_time_utc,
          capacity: s.capacity,
          status: s.current_status,
          staffing_summary: s.staffing_summary
        }
      end
    )
  end
end
