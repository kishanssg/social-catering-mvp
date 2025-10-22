module Api
  module V1
    class ReportsController < BaseController
      before_action :authenticate_user!
      
      # GET /api/v1/reports/timesheet
      # Query params: start_date, end_date, event_id, worker_id
      def timesheet
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Only export completed/approved assignments from past shifts
        assignments = Assignment.includes(worker: [], shift: [event: :event_schedule])
                           .for_date_range(start_date, end_date)
                           .where(status: ['completed', 'approved'])
                           .where('shifts.end_time_utc <= ?', Time.current)  # Only past shifts
        
        # Filter by event if provided
        assignments = assignments.for_event(params[:event_id]) if params[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        # Filter by skill if provided
        if params[:skill_name].present?
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', params[:skill_name])
        end
        
        csv_data = generate_timesheet_csv(assignments)
        
        send_data csv_data,
                  filename: "timesheet_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      end
      
      # GET /api/v1/reports/payroll
      # Weekly payroll report
      def payroll
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Only export completed/approved assignments (regardless of shift timing)
        assignments = Assignment.for_date_range(start_date, end_date)
                           .where(status: ['completed', 'approved'])
        
        # Filter by event if provided
        assignments = assignments.for_event(params[:event_id]) if params[:event_id].present?
        
        # Filter by worker if provided
        assignments = assignments.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        # Filter by skill if provided
        if params[:skill_name].present?
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', params[:skill_name])
        end
        
        csv_data = generate_payroll_csv(assignments)
        
        send_data csv_data,
                  filename: "payroll_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      end
      
      # GET /api/v1/reports/worker_hours
      # Aggregate hours worked per worker for the selected period
      def worker_hours
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Only export completed/approved assignments from past shifts
        assignments = Assignment.includes(:worker, shift: [:event])
                           .for_date_range(start_date, end_date)
                           .where(status: ['completed', 'approved'])
                           .where('shifts.end_time_utc <= ?', Time.current)  # Only past shifts
        
        # Filter by worker if provided
        assignments = assignments.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        # Filter by skill if provided
        if params[:skill_name].present?
          assignments = assignments.joins(:shift).where('shifts.role_needed = ?', params[:skill_name])
        end
        
        csv_data = generate_worker_hours_csv(assignments)
        
        send_data csv_data,
                  filename: "worker_hours_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv",
                  type: 'text/csv',
                  disposition: 'attachment'
      end
      
      # GET /api/v1/reports/event_summary
      # Event staffing summary report
      def event_summary
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.month.ago
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        events = Event.includes(:venue, :event_schedule, shifts: :assignments)
                      .joins(:event_schedule)
                      .where('event_schedules.start_time_utc >= ? AND event_schedules.start_time_utc <= ?', start_date, end_date)
        
        csv_data = generate_event_summary_csv(events)
        
        send_data csv_data,
                  filename: "event_summary_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv",
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
            
            # ✅ FIX 3: Calculate total hours properly
            total_hours = if staffing.hours_worked.present?
              # Use recorded hours if available (already NET of breaks)
              staffing.hours_worked
            else
              # Calculate from shift times minus event-wide break
              shift_duration = calculate_duration(shift.start_time_utc, shift.end_time_utc)
              [shift_duration - break_hours_numeric, 0].max # Ensure non-negative
            end
            
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
        
        CSV.generate(headers: true) do |csv|
          # Headers for payroll report
          csv << [
            'Date',
            'Event/Client',
            'Location',
            'Role',
            'Worker',
            'Hours',
            'Rate',
            'Total Pay'
          ]
          
          # Data rows - use simple approach to avoid association loading issues
          assignments.each do |assignment|
            # Get basic data directly from assignment
            total_hours = assignment.hours_worked || 0.0
            effective_rate = assignment.hourly_rate || 15.0  # Default rate
            total_pay = total_hours * effective_rate
            
            # Get shift data with simple queries
            shift = Shift.find(assignment.shift_id)
            worker = Worker.find(assignment.worker_id)
            
            # Get event data if available
            event_title = 'Unknown Event'
            location = 'Unknown Location'
            if shift.event_id
              event = Event.find(shift.event_id)
              event_title = event.title
              location = event.venue&.name || 'Unknown Location'
            end
            
            csv << [
              shift.start_time_utc.strftime('%Y-%m-%d'),
              event_title,
              location,
              shift.role_needed,
              "#{worker.first_name} #{worker.last_name}",
              total_hours.round(2),
              effective_rate.round(2),
              total_pay.round(2)
            ]
          end
        end
      end
      
      def generate_worker_hours_csv(assignments)
        require 'csv'
        
        # Group assignments by worker and aggregate hours
        worker_hours = assignments.group_by(&:worker_id).map do |worker_id, worker_assignments|
          worker = worker_assignments.first.worker
          total_hours = worker_assignments.sum(&:hours_worked)
          total_pay = worker_assignments.sum { |a| (a.hours_worked || 0) * (a.hourly_rate || 15.0) }
          assignment_count = worker_assignments.count
          
          [worker, total_hours, total_pay, assignment_count]
        end.sort_by { |worker, hours, pay, count| -hours } # Sort by hours descending
        
        CSV.generate(headers: true) do |csv|
          # Headers for worker hours report
          csv << [
            'Worker Name',
            'Total Hours',
            'Total Assignments',
            'Average Hours per Assignment',
            'Total Pay',
            'Average Rate',
            'Skills'
          ]
          
          # Data rows
          worker_hours.each do |worker, total_hours, total_pay, assignment_count|
            avg_hours = assignment_count > 0 ? (total_hours / assignment_count).round(2) : 0
            avg_rate = total_hours > 0 ? (total_pay / total_hours).round(2) : 0
            
            csv << [
              "#{worker.first_name} #{worker.last_name}",
              total_hours.round(2),
              assignment_count,
              avg_hours,
              total_pay.round(2),
              avg_rate,
              worker.skills_json&.join(', ') || ''
            ]
          end
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
            'Supervisor'
          ]
          
          # Data rows
          events.each do |event|
            csv << [
              event.id,
              event.title,
              event.event_schedule&.start_time_utc&.strftime('%Y-%m-%d') || '',
              event.venue&.name || '',
              event.status,
              event.total_workers_needed,
              event.assigned_workers_count,
              "#{event.staffing_percentage}%",
              event.shifts.count,
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
