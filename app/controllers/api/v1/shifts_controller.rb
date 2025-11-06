module Api
  module V1
    class ShiftsController < BaseController
      before_action :set_shift, only: [:show, :update, :destroy]

      # GET /api/v1/shifts
      def index
        shifts = Shift.includes(:event, :assignments, :workers, :skill_requirement)
                      .order(start_time_utc: :desc)

        # Filter by event if provided
        shifts = shifts.where(event_id: params[:event_id]) if params[:event_id].present?

        # Filter by status (computed/status scopes)
        case params[:status]
        when 'needs_workers'
          shifts = shifts.needing_workers
        when 'fully_staffed'
          shifts = shifts.fully_staffed
        when 'in_progress'
          shifts = shifts.in_progress
        when 'completed'
          shifts = shifts.completed
        when 'upcoming'
          shifts = shifts.upcoming
        when 'active'
          shifts = shifts.active
        end

        # Filter by date range
        if params[:start_date].present? && params[:end_date].present?
          start_date = Date.parse(params[:start_date]).beginning_of_day
          end_date = Date.parse(params[:end_date]).end_of_day
          shifts = shifts.where(start_time_utc: start_date..end_date)
        end

        # Group by event if requested
        if params[:group_by] == 'event'
          grouped_data = shifts.group_by(&:event_id).map do |event_id, event_shifts|
            event = event_id ? Event.find_by(id: event_id) : nil
            {
              event: event ? serialize_event_minimal(event) : nil,
              shifts: event_shifts.map { |shift| serialize_shift(shift) }
            }
          end

          render json: { status: 'success', data: grouped_data }
        else
          render json: { status: 'success', data: shifts.map { |shift| serialize_shift(shift) } }
        end
      end

      # GET /api/v1/shifts/:id
      def show
        render json: { status: 'success', data: serialize_shift_detailed(@shift) }
      end

      # POST /api/v1/shifts (standalone shifts only)
      def create
        @shift = Shift.new(shift_params)
        @shift.created_by = current_user

        if @shift.save
          render json: { status: 'success', data: serialize_shift(@shift) }, status: :created
        else
          render json: { status: 'error', errors: @shift.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/shifts/:id
      def update
        if @shift.update(shift_params)
          render json: { status: 'success', data: serialize_shift(@shift) }
        else
          render json: { status: 'error', errors: @shift.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/shifts/:id
      def destroy
        if @shift.event_id.present?
          return render json: { status: 'error', message: 'Cannot delete shifts that belong to an event. Delete the event instead.' }, status: :forbidden
        end
        @shift.destroy
        head :no_content
      end

      private

      def set_shift
        @shift = Shift.includes(:event, :assignments, :workers, :skill_requirement, event: :venue).find(params[:id])
      end

      def shift_params
        permitted = params.require(:shift).permit(
          :client_name, :role_needed, :capacity, :location_id, :pay_rate, :notes
        )
        
        # For event-owned shifts, do NOT allow time updates
        # (times must be updated via event schedule to maintain Single Source of Truth)
        if @shift.event_id.present?
          # Block time updates for event shifts
          permitted
        else
          # Standalone shifts can update times
          permitted.merge(
            params.require(:shift).permit(:start_time_utc, :end_time_utc)
          )
        end
      end

      def serialize_shift(shift)
        {
          id: shift.id,
          event_id: shift.event_id,
          event_title: shift.event&.title,
          client_name: shift.client_name,
          role_needed: shift.role_needed,
          start_time_utc: shift.start_time_utc,
          end_time_utc: shift.end_time_utc,
          location: shift.location,
          capacity: shift.capacity,
          pay_rate: shift.pay_rate,
          notes: shift.notes,
          status: shift.current_status,
          staffing_progress: shift.staffing_progress,
          staffing_summary: shift.staffing_summary,
          assigned_count: shift.assigned_count,
          assignments_count: shift.assignments.count,
          available_slots: shift.available_slots,
          created_at: shift.created_at
        }
      end

      def serialize_shift_detailed(shift)
        serialize_shift(shift).merge(
          skill_requirement: shift.skill_requirement ? {
            skill_name: shift.skill_requirement.skill_name,
            uniform_name: shift.skill_requirement.uniform_name,
            certification_name: shift.skill_requirement.certification_name
          } : nil,
          event: shift.event ? {
            id: shift.event.id,
            title: shift.event.title,
            venue: shift.event.venue ? {
              id: shift.event.venue.id,
              name: shift.event.venue.name,
              formatted_address: shift.event.venue.formatted_address
            } : nil
          } : nil,
          assignments: shift.assignments.includes(:worker).map { |a| serialize_assignment(a) }
        )
      end

      def serialize_assignment(assignment)
        {
          id: assignment.id,
          worker: {
            id: assignment.worker.id,
            first_name: assignment.worker.first_name,
            last_name: assignment.worker.last_name,
            email: assignment.worker.email,
            phone: assignment.worker.phone
          },
          hours_worked: assignment.hours_worked,
          created_at: assignment.created_at
        }
      end

      def serialize_event_minimal(event)
        { id: event.id, title: event.title, status: event.status, staffing_summary: event.staffing_summary }
      end
    end
  end
end
