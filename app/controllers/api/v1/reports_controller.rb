module Api
  module V1
    class ReportsController < BaseController
      before_action :authenticate_user!
      
      # GET /api/v1/reports/timesheet/preview
      # Returns summary of approved/pending hours for preview
      def timesheet_preview
        p = report_params
        start_date = p[:start_date] ? Date.parse(p[:start_date]) : 1.week.ago
        end_date = p[:end_date] ? Date.parse(p[:end_date]) : Date.today
        
        assignments = Assignment.valid
          .includes(:worker, shift: [event: :event_schedule])
          .for_date_range(start_date, end_date)
          .where(status: ['assigned', 'confirmed', 'completed', 'no_show'])
          .joins(:worker).where(workers: { active: true })
        
        # Filter by event if provided
        assignments = assignments.for_event(p[:event_id]) if p[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(p[:worker_id]) if p[:worker_id].present?
        
        # Filter by skill if provided
        if p[:skill_name].present?
          skill = CGI.unescape(p[:skill_name].to_s)
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', skill)
        end
        
        # Use database query for approved instead of Ruby select (more efficient)
        approved_scope = assignments.where(approved: true)
        pending_scope = assignments.where(approved: false).where.not(status: 'no_show')
        no_shows_scope = assignments.where(status: 'no_show')
        
        approved_hours = approved_scope.sum(&:effective_hours).round(2)
        approved_pay = approved_scope.sum(&:effective_pay).round(2)
        pending_hours = pending_scope.sum(&:effective_hours).round(2)
        pending_pay = pending_scope.sum(&:effective_pay).round(2)
        no_shows_count = no_shows_scope.count
        
        # Debug logging
        Rails.logger.info("Timesheet preview: start_date=#{start_date}, end_date=#{end_date}")
        Rails.logger.info("Timesheet preview: total assignments=#{assignments.count}, approved=#{approved_scope.count}, pending=#{pending_scope.count}, no_shows=#{no_shows_count}")
        
        render json: {
          approved_hours: approved_hours,
          approved_pay: approved_pay,
          pending_hours: pending_hours,
          pending_pay: pending_pay,
          no_shows: no_shows_count
        }
      rescue => e
        Rails.logger.error("Timesheet preview failed: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}")
        render json: { status: 'error', message: 'Failed to generate preview' }, status: 500
      end
      
      # GET /api/v1/reports/timesheet
      # Query params: start_date, end_date, event_id, worker_id
      def timesheet
        p = report_params
        start_date = p[:start_date] ? Date.parse(p[:start_date]) : 1.week.ago
        end_date = p[:end_date] ? Date.parse(p[:end_date]) : Date.today
        
        # Export all active assignments (assigned, confirmed, completed) including future scheduled shifts
        assignments = Assignment.valid  # Filter orphaned assignments
                           .includes(:worker, :approved_by, shift: [event: :event_schedule])  # Include approval data
                           .for_date_range(start_date, end_date)
                           .where(status: ['assigned', 'confirmed', 'completed', 'no_show'])  # Include no-shows for transparency
                           .joins(:worker).where(workers: { active: true })  # Filter inactive workers
                           # Removed past-only filter to include future scheduled shifts
        
        # Filter by event if provided
        assignments = assignments.for_event(p[:event_id]) if p[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(p[:worker_id]) if p[:worker_id].present?
        
        # Filter by skill if provided
        if p[:skill_name].present?
          skill = CGI.unescape(p[:skill_name].to_s)
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', skill)
        end
        
        csv_data = generate_timesheet_csv(assignments)
        
        send_data csv_data,
                  filename: "dailytimesheet_#{start_date.strftime('%Y-%m-%d')}_to_#{end_date.strftime('%Y-%m-%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      rescue => e
        Rails.logger.error("Timesheet export failed: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}")
        render json: { status: 'error', message: 'Failed to generate timesheet CSV' }, status: 500
      end
      
      # GET /api/v1/reports/payroll
      # Weekly payroll report
      def payroll
        p = report_params
        start_date = p[:start_date] ? Date.parse(p[:start_date]) : 1.week.ago
        end_date = p[:end_date] ? Date.parse(p[:end_date]) : Date.today
        
        # Export all active assignments (assigned, confirmed, completed) for payroll
        assignments = Assignment.valid  # Filter orphaned assignments
                           .includes(:worker, :approved_by, shift: [:event])  # Include approval data
                           .for_date_range(start_date, end_date)
                           .where(status: ['assigned', 'confirmed', 'completed'])
                           .joins(:worker).where(workers: { active: true })  # Filter inactive workers
        
        # Filter by event if provided
        assignments = assignments.for_event(p[:event_id]) if p[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(p[:worker_id]) if p[:worker_id].present?
        
        # Filter by skill if provided
        if p[:skill_name].present?
          skill = CGI.unescape(p[:skill_name].to_s)
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
        p = report_params
        start_date = p[:start_date] ? Date.parse(p[:start_date]) : 1.week.ago
        end_date = p[:end_date] ? Date.parse(p[:end_date]) : Date.today
        
        # Export all active assignments (assigned, confirmed, completed) including future scheduled shifts
        assignments = Assignment.valid  # Filter orphaned assignments
                           .includes(:worker, :approved_by, shift: [:event])  # Include approval data
                           .for_date_range(start_date, end_date)
                           .where(status: ['assigned', 'confirmed', 'completed', 'no_show'])  # Include no-shows for transparency
                           .joins(:worker).where(workers: { active: true })  # Filter inactive workers
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
        p = report_params
        start_date = p[:start_date] ? Date.parse(p[:start_date]) : 1.month.ago
        end_date = p[:end_date] ? Date.parse(p[:end_date]) : Date.today
        
        events = Event.includes(:venue, :event_schedule, shifts: :assignments)
                      .joins(:event_schedule)
                      .where('event_schedules.start_time_utc >= ? AND event_schedules.start_time_utc <= ?', start_date, end_date)
                      .where.not(status: 'deleted')  # Filter deleted events
                      .order('event_schedules.start_time_utc DESC')
        
        csv_data = generate_event_summary_csv(events)
        
        send_data csv_data,
                  filename: "eventsummary_#{start_date.strftime('%Y-%m-%d')}_to_#{end_date.strftime('%Y-%m-%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      end
      
      private

      def report_params
        params.permit(:start_date, :end_date, :event_id, :worker_id, :skill_name, :format)
      end
      
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
            'STATUS',          # NEW: Approval status
            'APPROVED_BY',     # NEW: Who approved
            'APPROVED_DATE',   # NEW: When approved
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
            
            # Use helper methods from Assignment model
            status = staffing.status_display
            approved_by_name = staffing.approved_by_name
            
            # Format approved date
            approved_date = staffing.approved_at_utc&.strftime('%m/%d/%Y %I:%M %p') || ''
            
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
              status,                                   # STATUS (NEW)
              approved_by_name,                         # APPROVED_BY (NEW)
              approved_date,                            # APPROVED_DATE (NEW)
              staffing.notes || ''                      # REMARKS
            ]
          end
          
          # Add summary section at bottom
          approved_assignments = staffing_records.select(&:approved?)
          pending_assignments = staffing_records.reject { |a| a.approved? || a.status == 'no_show' }
          no_show_assignments = staffing_records.select { |a| a.status == 'no_show' }
          
          approved_hours = approved_assignments.sum(&:effective_hours)
          approved_pay = approved_assignments.sum(&:effective_pay)
          pending_hours = pending_assignments.sum(&:effective_hours)
          pending_pay = pending_assignments.sum(&:effective_pay)
          
          # Add summary rows
          csv << []  # Blank row
          csv << ['SUMMARY', '', '', '', '', '', '', '', '', '', '', '', '', '']
          csv << ['Approved Hours', '', '', '', '', '', '', '', approved_hours.round(2), '', '', '', '']
          csv << ['Approved Pay', '', '', '', '', '', '', '', "$#{approved_pay.round(2)}", '', '', '', '']
          csv << ['Pending Hours', '', '', '', '', '', '', '', pending_hours.round(2), '', '', '', '']
          csv << ['Pending Pay', '', '', '', '', '', '', '', "$#{pending_pay.round(2)}", '', '', '', '']
          csv << ['No-Shows', '', '', '', '', '', '', '', no_show_assignments.count, '', '', '', '']
          csv << ['Total Potential', '', '', '', '', '', '', '', (approved_hours + pending_hours).round(2), '', '', '', '']
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
            'Events Worked',
            'Status'  # NEW: Approval status
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
            
            # Determine worker approval status
            worker_status = if worker_assignments.all?(&:approved?)
              'Approved'
            elsif worker_assignments.any?(&:approved?)
              'Partial'
            else
              'Pending'
            end
            
            grand_total_hours += total_hours
            grand_total_pay += total_pay
            total_shifts += worker_assignments.size
            
            csv << [
              "#{worker.last_name}, #{worker.first_name}",
              total_hours.round(2),
              "$#{avg_rate}",
              "$#{total_pay.round(2)}",
              worker_assignments.size,
              events.join('; '),
              worker_status  # NEW
            ]
          end
          
          # Add blank row before totals
          csv << []
          
          # Add grand totals row
          csv << ['GRAND TOTAL', grand_total_hours.round(2), '', "$#{grand_total_pay.round(2)}", total_shifts, '', '']
        end
      end
      
      def generate_worker_hours_csv(assignments)
        require 'csv'
        
        CSV.generate(headers: true) do |csv|
          csv << ['Worker Name', 'Event Name', 'Date', 'Role', 'Hours', 'Pay Rate', 'Payout', 'Status', 'Approved By', 'Approved Date']
          
          # Note: Assignment.valid scope already applied in worker_hours method above
          # This filter is redundant but kept for explicit clarity
          assignments.includes(shift: [:event]).where.not(status: ['cancelled']).find_each do |assignment|
            shift = assignment.shift
            event = shift.event

            # ✅ SSOT: Use methods from Assignment model (Single Source of Truth)
            hours = assignment.effective_hours
            rate  = assignment.effective_hourly_rate
            payout = assignment.effective_pay
            
            # Use helper methods from Assignment model
            status = assignment.status_display
            approved_by_name = assignment.approved_by_name
            
            # Format approved date
            approved_date = assignment.approved_at_utc&.strftime('%m/%d/%Y %I:%M %p') || ''

            csv << [
              assignment.worker.full_name,
              event&.title || shift.client_name,
              shift.start_time_utc.strftime('%m/%d/%Y'),
              shift.role_needed,
              hours.round(2),
              rate.round(2),
              payout,
              status,          # NEW
              approved_by_name, # NEW
              approved_date     # NEW
            ]
          end
          
          # Add summary row - use SSOT methods
          total_hours = assignments.includes(:shift).sum(&:effective_hours)
          total_pay = assignments.includes(:shift).sum(&:effective_pay)
          csv << []
          csv << ['TOTAL', '', '', '', total_hours.round(2), '', total_pay.round(2), '', '', '']
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
          # ✅ Use aggregate fields from Event model (denormalized columns) for performance and consistency
          events.find_each do |event|
            csv << [
              event.id,
              event.title,
              event.event_schedule&.start_time_utc&.strftime('%m/%d/%Y') || '',
              event.venue&.name || '',
              event.status,
              event.total_workers_needed || 0,  # Use aggregate field (sum from event_skill_requirements)
              event.assigned_workers_count || 0,  # Use method (counts unique workers per role)
              "#{event.staffing_percentage || 0}%",  # Use aggregate method
              event.shifts.count,  # Simple count
              event.total_pay_amount || 0.0,  # Use denormalized column (APPROVED hours only)
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
