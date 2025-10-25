class Api::V1::EventsController < Api::V1::BaseController
  before_action :authenticate_user!
  before_action :set_event, only: [:show, :update, :destroy, :publish, :complete]

  # GET /api/v1/events
  # Supports: ?tab=draft|active|past
  def index
    # For staging compatibility - map shifts to events
    if Event.table_exists?
      events = Event.includes(:venue, :event_skill_requirements, :event_schedule, 
                              shifts: { assignments: :worker })
    else
      # Staging environment - use shifts as events
      shifts = Shift.includes(:location, assignments: :worker)
      return render json: {
        status: 'success',
        data: shifts.map { |shift| serialize_shift_as_event(shift) }
      }
    end
    
    # Filter by tab (support 'completed' alias for 'past')
    tab_param = params[:tab] == 'completed' ? 'past' : params[:tab]
    case tab_param
    when 'draft'
      events = events.draft
    when 'active'
      events = events.published
                   .joins(:event_schedule)
                   .where('event_schedules.end_time_utc > ?', Time.current)
                   .order('event_schedules.start_time_utc ASC')
    when 'past'
      events = events.published
                   .joins(:event_schedule)
                   .where('event_schedules.end_time_utc <= ?', Time.current)
                   .order('event_schedules.end_time_utc DESC')
    else
      events = events.where(status: ['draft', 'published'])
    end
    
    # Additional filters for active tab (only apply if filter parameter is explicitly provided)
    if params[:filter].present?
      case params[:filter]
      when 'needs_workers'
        events = events.select { |e| e.unfilled_roles_count > 0 }
      when 'partially_filled'
        events = events.select { |e| e.staffing_status == 'partially_staffed' }
      when 'fully_staffed'
        events = events.select { |e| e.staffing_status == 'fully_staffed' }
      end
    end
    
    # Search functionality
    if params[:search].present?
      search_term = "%#{params[:search]}%"
      events = events.joins(:venue)
                    .where("events.title ILIKE ? OR venues.name ILIKE ?", search_term, search_term)
    end
    
    render json: {
      status: 'success',
      data: events.map { |event| serialize_event(event, tab_param) }
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
          
          # Create skill requirements and cache pay rates
          if params[:event][:skill_requirements].present?
            params[:event][:skill_requirements].each do |skill_req|
              skill_req_params = skill_requirement_params(skill_req)
              @event.event_skill_requirements.create!(skill_req_params)
              
              # Cache pay rate for this skill
              if skill_req_params[:pay_rate].present? && skill_req_params[:skill_name].present?
                skill = Skill.find_by(name: skill_req_params[:skill_name])
                skill&.cache_pay_rate!(skill_req_params[:pay_rate])
              end
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
    # Instead of destroying, move to deleted status for potential undo
    @event.update!(status: 'deleted')
    render json: { 
      status: 'success',
      message: 'Event moved to trash',
      event_id: @event.id,
      event_title: @event.title
    }
  end

  # POST /api/v1/events/:id/restore
  # Restore a deleted event back to draft status
  def restore
    unless @event.status == 'deleted'
      return render json: {
        status: 'error',
        message: 'Event is not deleted and cannot be restored'
      }, status: :unprocessable_entity
    end

    @event.update!(status: 'draft')
    render json: {
      status: 'success',
      message: 'Event restored to draft',
      data: serialize_event(@event.reload)
    }
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
    if Event.table_exists?
      @event = Event.includes(:venue, :event_skill_requirements, :event_schedule, 
                             shifts: { assignments: :worker })
                    .find(params[:id])
    else
      # Staging environment - use shifts as events
      @event = Shift.includes(:location, assignments: :worker).find(params[:id])
    end
  end

  def event_params
    params.require(:event).permit(
      :title, :status, :venue_id, :check_in_instructions,
      :supervisor_name, :supervisor_phone, :completion_notes
    )
  end

  def skill_requirement_params(skill_req)
    skill_req.permit(:skill_name, :needed_workers, :description, :uniform_name, :certification_name, :pay_rate)
  end

  def schedule_params(schedule)
    schedule.permit(:start_time_utc, :end_time_utc, :break_minutes)
  end

  def serialize_event(event, tab = nil)
    base = {
      id: event.id,
      title: event.title,
      status: event.status,
      staffing_status: event.staffing_status,
      venue_id: event.venue_id,
      venue: event.venue ? {
        id: event.venue.id,
        name: event.venue.name,
        formatted_address: event.venue.formatted_address
      } : nil,
      schedule: event.event_schedule ? {
        start_time_utc: event.event_schedule.start_time_utc,
        end_time_utc: event.event_schedule.end_time_utc,
        break_minutes: event.event_schedule.break_minutes
      } : nil,
      total_workers_needed: event.total_workers_needed,
      assigned_workers_count: event.assigned_workers_count,
      unfilled_roles_count: event.unfilled_roles_count,
      staffing_percentage: event.staffing_percentage,
      staffing_summary: event.staffing_summary,
      shifts_count: event.shifts.count,
      created_at: event.created_at_utc
    }
    
    # Add shifts with assignments for active/past tabs
    if ['active', 'past'].include?(tab) || event.status != 'draft'
      base[:shifts_by_role] = group_shifts_by_role(event.shifts)
    end
    
    base
  end

  def serialize_event_with_assignments(event)
    base_data = {
      id: event.id,
      title: event.title,
      status: event.status,
      staffing_status: event.staffing_status,
      venue: event.venue ? {
        id: event.venue.id,
        name: event.venue.name,
        formatted_address: event.venue.formatted_address
      } : nil,
      schedule: event.event_schedule ? {
        start_time_utc: event.event_schedule.start_time_utc,
        end_time_utc: event.event_schedule.end_time_utc,
        break_minutes: event.event_schedule.break_minutes
      } : nil,
      total_workers_needed: event.total_workers_needed,
      assigned_workers_count: event.assigned_workers_count,
      unfilled_roles_count: event.unfilled_roles_count,
      staffing_percentage: event.staffing_percentage,
      shifts_count: event.shifts.count,
      created_at: event.created_at_utc
    }
    
    # Add assignment details for active/past tabs
    if ['published', 'completed'].include?(event.status)
      base_data[:shifts] = event.shifts.map { |shift|
        {
          id: shift.id,
          role_needed: shift.role_needed,
          status: shift.current_status,
          staffing_progress: shift.staffing_progress,
          start_time_utc: shift.start_time_utc,
          end_time_utc: shift.end_time_utc,
          assignments: shift.assignments.map { |assignment|
            {
              id: assignment.id,
              worker: {
                id: assignment.worker.id,
                first_name: assignment.worker.first_name,
                last_name: assignment.worker.last_name,
                email: assignment.worker.email
              },
              hours_worked: assignment.hours_worked,
              status: assignment.status
            }
          }
        }
      }
    end
    
    base_data
  end

  def serialize_event_detailed(event)
    serialize_event(event, event.status).merge(
      skill_requirements: event.event_skill_requirements.map { |sr|
        {
          id: sr.id,
          skill_name: sr.skill_name,
          needed_workers: sr.needed_workers,
          description: sr.description,
          uniform_name: sr.uniform_name,
          certification_name: sr.certification_name,
          pay_rate: sr.pay_rate
        }
      },
      check_in_instructions: event.check_in_instructions,
      supervisor_name: event.supervisor_name,
      supervisor_phone: event.supervisor_phone
    )
  end
  
  def group_shifts_by_role(shifts)
    Rails.logger.info "=== GROUP_SHIFTS_BY_ROLE DEBUG ==="
    Rails.logger.info "Shifts count: #{shifts.count}"
    shifts.each_with_index do |shift, index|
      Rails.logger.info "Shift #{index + 1}: ID=#{shift.id}, role_needed=#{shift.role_needed.inspect}, capacity=#{shift.capacity.inspect}"
    end
    
    grouped = {}
    
    shifts.each do |shift|
      role = shift.role_needed
      grouped[role] ||= {
        role_name: role,
        total_shifts: 0,
        filled_shifts: 0,
        shifts: []
      }
      
      grouped[role][:total_shifts] += 1
      grouped[role][:filled_shifts] += 1 if shift.staffing_progress[:percentage] == 100
      
      grouped[role][:shifts] << {
        id: shift.id,
        role_needed: shift.role_needed,
        capacity: shift.capacity,
        filled_positions: shift.assignments.where(status: ['confirmed', 'assigned', 'completed']).count,
        start_time_utc: shift.start_time_utc,
        end_time_utc: shift.end_time_utc,
        status: shift.current_status,
        staffing_progress: shift.staffing_progress,
        fully_staffed: shift.fully_staffed?,
        pay_rate: shift.pay_rate,
        assignments: shift.assignments.map { |a|
          {
            id: a.id,
            worker: {
              id: a.worker.id,
              first_name: a.worker.first_name,
              last_name: a.worker.last_name
            },
            hours_worked: a.hours_worked&.to_f,
            hourly_rate: a.hourly_rate,
            status: a.status
          }
        }
      }
    end
    
    Rails.logger.info "Grouped result: #{grouped.keys}"
    grouped.values
  end

  def serialize_shift_as_event(shift)
    {
      id: shift.id,
      title: shift.client_name,
      status: shift.status,
      staffing_status: shift.staffing_progress[:status],
      venue_id: shift.location_id,
      venue: shift.location ? {
        id: shift.location.id,
        name: shift.location.name,
        formatted_address: "#{shift.location.address}, #{shift.location.city}, #{shift.location.state}"
      } : nil,
      schedule: {
        start_time_utc: shift.start_time_utc,
        end_time_utc: shift.end_time_utc,
        break_minutes: 0
      },
      total_workers_needed: shift.capacity,
      assigned_workers_count: shift.assignments.where(status: ['assigned', 'confirmed', 'completed']).count,
      unfilled_roles_count: shift.capacity - shift.assignments.where(status: ['assigned', 'confirmed', 'completed']).count,
      staffing_percentage: shift.staffing_progress[:percentage],
      staffing_summary: shift.staffing_progress[:summary],
      shifts_count: 1,
      created_at: shift.created_at_utc,
      role_needed: shift.role_needed,
      pay_rate: shift.pay_rate,
      notes: shift.notes
    }
  end
end
