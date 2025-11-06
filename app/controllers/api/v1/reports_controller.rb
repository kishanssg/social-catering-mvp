module Api
  module V1
    class ReportsController < BaseController
      before_action :authenticate_user!
      
      # GET /api/v1/reports/timesheet
      # Query params: start_date, end_date, event_id, worker_id
      def timesheet
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Export all active assignments (assigned, confirmed, completed) including future scheduled shifts
        assignments = Assignment.includes(worker: [], shift: [event: :event_schedule])
                           .for_date_range(start_date, end_date)
                           .where(status: ['assigned', 'confirmed', 'completed'])
                           # Removed past-only filter to include future scheduled shifts
        
        # Filter by event if provided
        assignments = assignments.for_event(params[:event_id]) if params[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        # Filter by skill if provided
        if params[:skill_name].present?
          skill = CGI.unescape(params[:skill_name].to_s)
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', skill)
        end
        
        csv_data = generate_timesheet_csv(assignments)
        
        send_data csv_data,
                  filename: "weeklytimesheet_#{start_date.strftime('%Y-%m-%d')}_to_#{end_date.strftime('%Y-%m-%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      rescue => e
        Rails.logger.error("Timesheet export failed: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}")
        render json: { status: 'error', message: 'Failed to generate timesheet CSV' }, status: 500
      end
      
      # GET /api/v1/reports/payroll
      # Weekly payroll report
      def payroll
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Export all active assignments (assigned, confirmed, completed) for payroll
        assignments = Assignment.for_date_range(start_date, end_date)
                           .where(status: ['assigned', 'confirmed', 'completed'])
        
        # Filter by event if provided
        assignments = assignments.for_event(params[:event_id]) if params[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        # Filter by skill if provided
        if params[:skill_name].present?
          skill = CGI.unescape(params[:skill_name].to_s)
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', skill)
        end
        
        csv_data = generate_payroll_csv(assignments)
        
        send_data csv_data,
                  filename: "payrollsummary_#{start_date.strftime('%Y-%m-%d')}_to_#{end_date.strftime('%Y-%m-%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      rescue => e
        Rails.logger.error("Payroll export failed: #{e.message}")
        render json: { status: 'error', message: 'Failed to generate payroll CSV' }, status: 500
      end
      
      # GET /api/v1/reports/worker_hours
      # Aggregate hours worked per worker for the selected period
      def worker_hours
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Export all active assignments (assigned, confirmed, completed) including future scheduled shifts
        assignments = Assignment.includes(:worker, shift: [:event])
                           .for_date_range(start_date, end_date)
                           .where(status: ['assigned', 'confirmed', 'completed'])
                           # Removed past-only filter to track scheduled hours for capacity planning
        
        # Filter by worker if provided
        assignments = assignments.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        # Filter by skill if provided
        if params[:skill_name].present?
          skill = CGI.unescape(params[:skill_name].to_s)
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', skill)
        end
        
        csv_data = generate_worker_hours_csv(assignments)
        
        send_data csv_data,
                  filename: "workerhoursreport_#{start_date.strftime('%Y-%m-%d')}_to_#{end_date.strftime('%Y-%m-%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      rescue => e
        Rails.logger.error("Worker hours export failed: #{e.message}")
        render json: { status: 'error', message: 'Failed to generate worker hours CSV' }, status: 500
      end
      
      # GET /api/v1/reports/event_summary
      # Event staffing summary report
      def event_summary
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.month.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        events = Event.includes(:venue, :event_schedule, shifts: :assignments)
                      .joins(:event_schedule)
                      .where('event_schedules.start_time_utc >= ? AND event_schedules.start_time_utc <= ?', start_date, end_date)
                      .order('event_schedules.start_time_utc DESC')
        
        csv_data = generate_event_summary_csv(events)
        
        send_data csv_data,
                  filename: "eventsummary_#{start_date.strftime('%Y-%m-%d')}_to_#{end_date.strftime('%Y-%m-%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      end
      
      private
      
      def generate_timesheet_csv(staffing_records)
        require 'csv'
        
        CSV.generate(headers: true) do |csv|
          # Headers matching your sample exactly
          csv << [
            'JOB_ID',
            'SKILL_NAME',
            'WORKER_FIRSTNAME',
            'WORKER_LASTNAME',
            'SHIFT_DATE',
            'SHIFT_START_TIME',
            'SHIFT_END_TIME',
            'UNPAID_BREAK',
            'TOTAL_HOURS',
            'SHIFT_SUPERVISOR',
            'REMARKS'
          ]
          
          # Data rows
          staffing_records.each do |staffing|
            shift = staffing.shift
            event = shift.event
            worker = staffing.worker
            
            # ✅ FIX 2: Get break from event schedule (event-wide policy)
            # Default to 0 minutes if not set
            break_minutes = event&.event_schedule&.break_minutes || 0
            break_hours_numeric = (break_minutes / 60.0).round(2)
            
            # ✅ SSOT: Use effective_hours from Assignment model (Single Source of Truth)
            # Note: Break time handling is done in effective_hours calculation
            total_hours = staffing.effective_hours
            
            # Debug output
            Rails.logger.info "DEBUG: break_hours_numeric=#{break_hours_numeric}, formatted=#{sprintf('%.2f', break_hours_numeric)}"
            Rails.logger.info "DEBUG: total_hours=#{total_hours}, formatted=#{sprintf('%.2f', total_hours.round(2))}"
            
            csv << [
              event&.id || shift.id,                    # JOB_ID
              shift.role_needed,                        # SKILL_NAME
              worker.first_name,                        # WORKER_FIRSTNAME
              worker.last_name,                         # WORKER_LASTNAME
              shift.start_time_utc.strftime('%m/%d/%Y'), # SHIFT_DATE (MM/DD/YYYY)
              shift.start_time_utc.strftime('%I:%M %p'), # SHIFT_START_TIME (12-hour format)
              shift.end_time_utc.strftime('%I:%M %p'),   # SHIFT_END_TIME (12-hour format)
              sprintf('%.2f', break_hours_numeric),    # UNPAID_BREAK (2 decimals)
              sprintf('%.2f', total_hours.round(2)),    # TOTAL_HOURS (2 decimals)
              event&.supervisor_name || '',             # SHIFT_SUPERVISOR
              staffing.notes || ''                      # REMARKS
            ]
          end
        end
      end
      
      def generate_payroll_csv(assignments)
        require 'csv'
        
        # Group by worker
        worker_data = assignments.includes(shift: [:event]).group_by(&:worker)
        
        CSV.generate(headers: true) do |csv|
          # Headers for payroll report
          csv << [
            'Worker Name',
            'Total Hours',
            'Average Hourly Rate',
            'Total Compensation',
            'Number of Shifts',
            'Events Worked'
          ]
          
          grand_total_hours = 0
          grand_total_pay = 0
          total_shifts = 0
          
          # Sort workers by last name, first name
          worker_data.sort_by { |worker, _| "#{worker.last_name} #{worker.first_name}" }.each do |worker, worker_assignments|
            total_hours = 0
            total_pay = 0
            rates = []
            events = []
            
            # Calculate totals for this worker
            worker_assignments.each do |assignment|
              shift = assignment.shift
              
              # ✅ SSOT: Use methods from Assignment model (Single Source of Truth)
              effective_hours = assignment.effective_hours
              rate = assignment.effective_hourly_rate
              effective_pay = assignment.effective_pay

              total_hours += effective_hours
              total_pay   += effective_pay
              rates << rate

              # Get event name
              event_title = shift&.event&.title || shift&.client_name || 'Unknown Event'
              events << event_title unless events.include?(event_title)
            end
            
            avg_rate = rates.empty? ? 0 : (rates.sum / rates.size.to_f).round(2)
            
            grand_total_hours += total_hours
            grand_total_pay += total_pay
            total_shifts += worker_assignments.size
            
            csv << [
              "#{worker.last_name}, #{worker.first_name}",
              total_hours.round(2),
              "$#{avg_rate}",
              "$#{total_pay.round(2)}",
              worker_assignments.size,
              events.join('; ')
            ]
          end
          
          # Add blank row before totals
          csv << []
          
          # Add grand totals row
          csv << ['GRAND TOTAL', grand_total_hours.round(2), '', "$#{grand_total_pay.round(2)}", total_shifts, '']
        end
      end
      
      def generate_worker_hours_csv(assignments)
        require 'csv'
        
        CSV.generate(headers: true) do |csv|
          csv << ['Worker Name', 'Event Name', 'Date', 'Role', 'Hours', 'Pay Rate', 'Payout']
          
          assignments.includes(shift: [:event]).where.not(status: ['cancelled','no_show']).find_each do |assignment|
            shift = assignment.shift
            event = shift.event

            # ✅ SSOT: Use methods from Assignment model (Single Source of Truth)
            hours = assignment.effective_hours
            rate  = assignment.effective_hourly_rate
            payout = assignment.effective_pay

            csv << [
              assignment.worker.full_name,
              event&.title || shift.client_name,
              shift.start_time_utc.strftime('%m/%d/%Y'),
              shift.role_needed,
              hours.round(2),
              rate.round(2),
              payout
            ]
          end
          
          # Add summary row - use SSOT methods
          total_hours = assignments.includes(:shift).sum(&:effective_hours)
          total_pay = assignments.includes(:shift).sum(&:effective_pay)
          csv << []
          csv << ['TOTAL', '', '', '', total_hours.round(2), '', total_pay.round(2)]
        end
      end
      
      def generate_event_summary_csv(events)
        require 'csv'
        
        CSV.generate(headers: true) do |csv|
          # Headers
          csv << [
            'Event ID',
            'Event Title',
            'Date',
            'Venue',
            'Status',
            'Total Workers Needed',
            'Workers Assigned',
            'Assignment Percentage',
            'Shifts Generated',
            'Total Event Cost',
            'Supervisor'
          ]
          
          # Data rows
          events.find_each do |event|
            needed = 0
            assigned = 0
            shifts_generated = 0
            total_cost = 0.0

            event.shifts.each do |s|
              shifts_generated += 1
              needed += (s.capacity || 0)

              # ✅ SSOT: Use methods from Assignment model (Single Source of Truth)
              s.assignments.where(status: ['assigned','confirmed','completed']).each do |a|
                assigned += 1
                total_cost += a.effective_pay
              end
            end

            pct = needed.zero? ? 0 : ((assigned.to_f / needed.to_f) * 100.0).round

            csv << [
              event.id,
              event.title,
              event.event_schedule&.start_time_utc&.strftime('%m/%d/%Y') || '',
              event.venue&.name || '',
              event.status,
              needed,
              assigned,
              "#{pct}%",
              shifts_generated,
              total_cost.round(2),
              event.supervisor_name || ''
            ]
          end
        end
      end
      
      def calculate_duration(start_time, end_time)
        ((end_time - start_time) / 1.hour).round(2)
      end
    end
  end
end
