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
        staffing = Assignment.includes(worker: [], shift: [:event, :event_schedule])
                           .for_date_range(start_date, end_date)
                           .where(status: ['completed', 'approved'])
                           .where('shifts.end_time_utc <= ?', Time.current)  # Only past shifts
        
        # Filter by event if provided
        staffing = staffing.for_event(params[:event_id]) if params[:event_id].present?
        
        # Filter by worker if provided
        staffing = staffing.for_worker(params[:worker_id]) if params[:worker_id].present?
        
        csv_data = generate_timesheet_csv(staffing)
        
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
        
        # Only export completed/approved assignments from past shifts
        staffing = Assignment.includes(worker: [], shift: [:event, :event_schedule])
                           .for_date_range(start_date, end_date)
                           .where(status: ['completed', 'approved'])
                           .where('shifts.end_time_utc <= ?', Time.current)  # Only past shifts
        
        csv_data = generate_payroll_csv(staffing)
        
        send_data csv_data,
                  filename: "payroll_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv",
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
            # Default to 30 minutes (0.5 hours) if not set
            break_minutes = event&.event_schedule&.break_minutes || 30
            break_hours = (break_minutes / 60.0).round(1)
            
            # ✅ FIX 3: Calculate total hours properly
            total_hours = if staffing.hours_worked.present?
              # Use recorded hours if available (already NET of breaks)
              staffing.hours_worked
            else
              # Calculate from shift times minus event-wide break
              shift_duration = calculate_duration(shift.start_time_utc, shift.end_time_utc)
              [shift_duration - break_hours, 0].max # Ensure non-negative
            end
            
            csv << [
              event&.id || shift.id,                    # JOB_ID
              shift.role_needed,                        # SKILL_NAME
              worker.first_name,                        # WORKER_FIRSTNAME
              worker.last_name,                         # WORKER_LASTNAME
              shift.start_time_utc.strftime('%m/%d/%Y'), # SHIFT_DATE (MM/DD/YYYY)
              shift.start_time_utc.strftime('%I:%M %p'), # SHIFT_START_TIME (12-hour format)
              shift.end_time_utc.strftime('%I:%M %p'),   # SHIFT_END_TIME (12-hour format)
              break_hours,                              # UNPAID_BREAK (1 decimal)
              total_hours.round(2),                     # TOTAL_HOURS (2 decimals)
              event&.supervisor_name || '',             # SHIFT_SUPERVISOR
              staffing.notes || ''                      # REMARKS
            ]
          end
        end
      end
      
      def generate_payroll_csv(staffing_records)
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
          
          # Data rows
          staffing_records.each do |staffing|
            shift = staffing.shift
            event = shift.event
            worker = staffing.worker
            
            # Use event-wide break policy (same as timesheet)
            break_minutes = event&.event_schedule&.break_minutes || 30
            break_hours = (break_minutes / 60.0).round(1)
            
            # Calculate total hours with proper break deduction
            total_hours = if staffing.hours_worked.present?
              staffing.hours_worked  # Already NET of breaks
            else
              shift_duration = calculate_duration(shift.start_time_utc, shift.end_time_utc)
              [shift_duration - break_hours, 0].max
            end
            
            # Determine effective rate (priority: assignment rate > shift rate > default)
            effective_rate = staffing.hourly_rate || 
                           shift.pay_rate || 
                           worker.default_hourly_rate || 
                           0
            
            # Calculate total pay
            total_pay = total_hours * effective_rate
            
            csv << [
              shift.start_time_utc.strftime('%Y-%m-%d'),
              event&.title || shift.client_name || 'Unknown Event',
              shift.location || event&.venue&.name || 'Unknown Location',
              shift.role_needed,
              "#{worker.first_name} #{worker.last_name}",
              total_hours.round(2),
              effective_rate.round(2),
              total_pay.round(2)
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
            'Staffing Percentage',
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
              event.total_assignments_count,
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
