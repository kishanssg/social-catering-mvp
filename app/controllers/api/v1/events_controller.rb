class Api::V1::EventsController < Api::V1::BaseController
  before_action :authenticate_user!
  before_action :set_event, only: [:show, :update, :destroy, :publish, :complete]

  # GET /api/v1/events
  # Supports: ?tab=draft|active|past
  def index
    # For staging compatibility - map shifts to events
    begin
      events = Event.includes(:venue, :event_skill_requirements, :event_schedule, 
                              shifts: { assignments: :worker })
    rescue ActiveRecord::StatementInvalid => e
      if e.message.include?('relation "events" does not exist')
        # Staging environment - use shifts as events
        shifts = Shift.includes(:location, assignments: :worker)
        return render json: {
          status: 'success',
          data: shifts.map { |shift| serialize_shift_as_event(shift) }
        }
      else
        raise e
      end
    end
    
    # Filter by tab (support 'completed' alias for 'past')
    tab_param = params[:tab] == 'completed' ? 'past' : params[:tab]
    
    # Special handling: if we have a date filter AND we're on active tab, show both active and past events for that date
    show_all_for_date = params[:date].present? && (tab_param == 'active' || params[:tab] == 'completed')
    
    case tab_param
    when 'draft'
      events = events.draft
    when 'active'
      if show_all_for_date
        # For calendar navigation with date filter, show all published events (both active and past)
        events = events.published
                     .joins(:event_schedule)
                     .order('event_schedules.start_time_utc ASC')
      else
        # Normal active events (upcoming only)
        events = events.published
                     .joins(:event_schedule)
                     .where('event_schedules.end_time_utc > ?', Time.current)
                     .order('event_schedules.start_time_utc ASC')
      end
    when 'past'
      events = events.published
                   .joins(:event_schedule)
                   .where('event_schedules.end_time_utc <= ?', Time.current)
                   .order('event_schedules.end_time_utc DESC')
    else
      events = events.where(status: ['draft', 'published'])
    end
    
    # Date filter (for calendar navigation) - apply after tab filtering
    if params[:date].present?
      begin
        target_date = Date.parse(params[:date])
        # Use date range instead of DATE() function for better performance and timezone handling
        # Only apply date filter if we haven't already joined event_schedule
        # For 'active' and 'past' tabs, event_schedule is already joined
        if tab_param == 'active' || tab_param == 'past'
          events = events.where('event_schedules.start_time_utc >= ? AND event_schedules.start_time_utc < ?', 
                                target_date.beginning_of_day, target_date.end_of_day)
        else
          # For 'draft' or other tabs, need to join event_schedule
          events = events.joins(:event_schedule)
                       .where('event_schedules.start_time_utc >= ? AND event_schedules.start_time_utc < ?', 
                              target_date.beginning_of_day, target_date.end_of_day)
        end
      rescue ArgumentError
        # Invalid date format, ignore the filter
      end
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
    # Allow editing published and draft events
    unless %w[draft published].include?(@event.status)
      return render json: {
        status: 'error',
        message: 'Only draft and published events can be edited',
        current_status: @event.status
      }, status: :unprocessable_entity
    end
    
    # Check if event has started (only for published events)
    if @event.status == 'published' && @event.event_schedule && @event.event_schedule.start_time_utc < Time.current
      return render json: {
        status: 'error',
        message: "Cannot edit event that has already started at #{@event.event_schedule.start_time_utc.strftime('%I:%M %p')}"
      }, status: :unprocessable_entity
    end
    
    # If schedule change on a published event could create overlaps for existing assignees,
    # fail fast with a clear 422 listing the conflicts (unless force=true)
    if @event.status == 'published' && params.dig(:event, :schedule).present?
      proposed_start = Time.iso8601(params[:event][:schedule][:start_time_utc]) rescue nil
      proposed_end   = Time.iso8601(params[:event][:schedule][:end_time_utc]) rescue nil
      if proposed_start && proposed_end && proposed_end <= proposed_start
        return render json: { status: 'validation_error', errors: ['End time must be after start time'] }, status: :unprocessable_entity
      end

      if proposed_start && proposed_end && params[:force] != 'true'
        conflicts = find_assignment_conflicts_for_schedule(@event, proposed_start, proposed_end)
        if conflicts.any?
          return render json: {
            status: 'validation_error',
            message: "Can't save changes: #{conflicts.size} #{'worker'.pluralize(conflicts.size)} would be double-booked",
            data: { conflicts: conflicts }
          }, status: :unprocessable_entity
        end
      end
    end

    # Use ApplyRoleDiff service for role changes
    if params[:event][:roles].present?
      result = Events::ApplyRoleDiff.new(
        event: @event,
        roles: params[:event][:roles],
        force: params[:force] == 'true',
        reason: params[:reason],
        apply_time_to_all_shifts: params[:apply_time_to_all_shifts] == 'true'
      ).call
      
      unless result[:success]
        return render json: {
          status: 'error',
          errors: result[:errors]
        }, status: :unprocessable_entity
      end
      
      render json: {
        status: 'success',
        message: "Updated #{result[:summary][:added]} roles added, #{result[:summary][:removed]} removed",
        data: serialize_event(@event.reload),
        summary: result[:summary]
      }
      return
    end
    
    # Fallback to standard update for non-role changes
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
  rescue ActiveRecord::StaleObjectError => e
    render json: {
      status: 'error',
      message: 'This event was modified by another user. Please refresh and try again.',
      code: 'STALE_OBJECT'
    }, status: :conflict
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      status: 'validation_error',
      errors: e.record.errors.full_messages
    }, status: :unprocessable_entity
  end

  # DELETE /api/v1/events/:id
  def destroy
    # Instead of destroying, move to deleted status for potential undo
    begin
      ActiveRecord::Base.transaction do
        # Mark all assignments as cancelled to free up workers
        @event.assignments.update_all(status: 'cancelled')
        
        # Set event to deleted status
        @event.update!(status: 'deleted')
      end
      
      render json: { 
        status: 'success',
        message: 'Event moved to trash and all assignments cancelled',
        event_id: @event.id,
        event_title: @event.title
      }
    rescue => e
      Rails.logger.error "Failed to delete event #{params[:id]}: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      render json: { 
        status: 'error',
        message: "Failed to delete event: #{e.message}"
      }, status: :internal_server_error
    end
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
        status: 'success',
        message: "Event status updated to #{new_status}",
        data: serialize_event(@event.reload)
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
    begin
      @event = Event.includes(:venue, :event_skill_requirements, :event_schedule, 
                             shifts: { assignments: :worker })
                    .find(params[:id])
    rescue ActiveRecord::StatementInvalid => e
      if e.message.include?('relation "events" does not exist')
        # Staging environment - use shifts as events
        @event = Shift.includes(:location, assignments: :worker).find(params[:id])
      else
        raise e
      end
    end
  end

  # Build a user-friendly list of assignment conflicts if the event schedule
  # is changed to [proposed_start, proposed_end). Each item includes
  # worker_name, worker_id, conflicting_event_title and time window.
  def find_assignment_conflicts_for_schedule(event, proposed_start, proposed_end)
    conflicts = []
    event.shifts.includes(assignments: :worker).each do |shift|
      shift.assignments.where(status: ['assigned','confirmed']).each do |assignment|
        worker = assignment.worker
        # Look for other assignments for this worker that would now overlap
        other_assignments = Assignment.joins(:shift)
                                      .where(worker_id: worker.id)
                                      .where.not(shifts: { event_id: event.id })
                                      .where.not(status: ['cancelled','no_show'])
                                      .where("shifts.start_time_utc < ? AND shifts.end_time_utc > ?", proposed_end, proposed_start)
        next if other_assignments.empty?
        other = other_assignments.first
        conflicts << {
          worker_name: "#{worker.first_name} #{worker.last_name}",
          worker_id: worker.id,
          conflicting_event_title: other.shift.event&.title || other.shift.client_name,
          conflicting_shift_start_time_utc: other.shift.start_time_utc,
          conflicting_shift_end_time_utc: other.shift.end_time_utc,
          reason: 'overlaps existing assignment'
        }
      end
    end
    conflicts
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
    # Get event from first shift to access event_skill_requirements
    event = shifts.first&.event
    return [] unless event
    
    # Get needed workers per role from event_skill_requirements
    requirements = event.event_skill_requirements.index_by(&:skill_name)
    
    Rails.logger.info "=== GROUP_SHIFTS_BY_ROLE DEBUG ==="
    Rails.logger.info "Shifts count: #{shifts.count}"
    shifts.each_with_index do |shift, index|
      Rails.logger.info "Shift #{index + 1}: ID=#{shift.id}, role_needed=#{shift.role_needed.inspect}, capacity=#{shift.capacity.inspect}"
    end
    
    # ORDER shifts by ID ASC to ensure consistent ordering - first created = first displayed
    sorted_shifts = shifts.order(:id)
    
    grouped = {}
    
    # Track how many shifts we've processed per role
    role_counters = Hash.new(0)
    
    sorted_shifts.each do |shift|
      role = shift.role_needed
      needed = requirements[role]&.needed_workers || 0
      
      # Skip shifts beyond the needed amount
      next if needed > 0 && role_counters[role] >= needed
      
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
      
      role_counters[role] += 1
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
      created_at: shift.created_at,
      role_needed: shift.role_needed,
      pay_rate: shift.pay_rate,
      notes: shift.notes
    }
  end
end
