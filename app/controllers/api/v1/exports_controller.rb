require 'csv'

class Api::V1::ExportsController < ApplicationController
  before_action :authenticate_user!

  def timesheet
    # Parse date range
    start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago.to_date
    end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.current
    
    # Get assignments with hours worked
    assignments = Assignment
      .joins(:shift, :worker)
      .includes(shift: :location, worker: {})
      .where(shifts: { start_time_utc: start_date.beginning_of_day..end_date.end_of_day })
      .where.not(hours_worked: nil)
      .where(status: 'completed')
      .order('shifts.start_time_utc ASC')
    
    # Generate CSV
    csv_data = CSV.generate(headers: true) do |csv|
      # Headers
      csv << [
        'Date',
        'Day',
        'Client',
        'Location',
        'Role',
        'Worker Name',
        'Worker Email',
        'Hours Worked',
        'Hourly Rate',
        'Total Pay',
        'Status'
      ]
      
      # Data rows
      assignments.each do |assignment|
        shift = assignment.shift
        worker = assignment.worker
        
        csv << [
          shift.start_time_utc.strftime('%Y-%m-%d'),
          shift.start_time_utc.strftime('%A'),
          shift.client_name,
          shift.location&.display_name || shift.location || 'N/A',
          shift.role_needed,
          "#{worker.first_name} #{worker.last_name}",
          worker.email,
          assignment.hours_worked,
          assignment.hourly_rate || shift.pay_rate,
          assignment.total_pay,
          assignment.status.capitalize
        ]
      end
      
      # Summary row
      total_hours = assignments.sum(:hours_worked)
      total_pay = assignments.sum(&:total_pay)
      
      csv << []
      csv << ['TOTALS', '', '', '', '', '', '', total_hours, '', total_pay, '']
    end
    
    # Send CSV file
    send_data csv_data, 
      filename: "timesheet_#{start_date}_to_#{end_date}.csv",
      type: 'text/csv',
      disposition: 'attachment'
  end

end
