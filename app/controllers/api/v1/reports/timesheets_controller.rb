require "csv"

class Api::V1::Reports::TimesheetsController < ApplicationController
  before_action :set_date_range
  before_action :set_filters

  def preview
    assignments = fetch_assignments

    summary = {
      total_hours: assignments.sum(&:hours_worked),
      total_pay: assignments.sum(&:total_pay),
      worker_count: assignments.select(:worker_id).distinct.count,
      shift_count: assignments.select(:shift_id).distinct.count,
      date_range: {
        start: @start_date.to_s,
        end: @end_date.to_s
      }
    }

    render json: {
      status: "success",
      data: {
        assignments: serialize_assignments(assignments.limit(100)),
        summary: summary,
        total_records: assignments.count
      }
    }
  end

  def export
    assignments = fetch_assignments
    csv_data = generate_csv(assignments)

    filename = "timesheet_#{@start_date.strftime('%Y%m%d')}_to_#{@end_date.strftime('%Y%m%d')}.csv"

    send_data csv_data,
              filename: filename,
              type: "text/csv",
              disposition: "attachment"
  end

  private

  def set_date_range
    @start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago.to_date
    @end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.current
  rescue ArgumentError
    render json: {
      status: "error",
      error: "Invalid date format. Use YYYY-MM-DD"
    }, status: :bad_request
  end

  def set_filters
    @worker_id = params[:worker_id]
    @location_id = params[:location_id]
    @status = params[:status] || "completed"
  end

  def fetch_assignments
    assignments = Assignment.valid  # Filter orphaned assignments
      .joins(:shift, :worker)
      .includes(
        shift: :location,
        worker: :certifications
      )
      .for_date_range(@start_date.beginning_of_day, @end_date.end_of_day)
      .with_hours
      .where(workers: { active: true })  # Filter inactive workers

    assignments = assignments.where(worker_id: @worker_id) if @worker_id.present?
    assignments = assignments.where(shifts: { location_id: @location_id }) if @location_id.present?
    assignments = assignments.where(status: @status) if @status.present?

    assignments.order("shifts.start_time_utc ASC, workers.last_name ASC")
  end

  def generate_csv(assignments)
    CSV.generate(headers: true, encoding: "UTF-8") do |csv|
      # Headers matching your sample exactly
      csv << [
        "JOB_ID",
        "SKILL_NAME",
        "WORKER_FIRSTNAME",
        "WORKER_LASTNAME",
        "SHIFT_DATE",
        "SHIFT_START_TIME",
        "SHIFT_END_TIME",
        "UNPAID_BREAK",
        "TOTAL_HOURS",
        "SHIFT_SUPERVISOR",
        "REMARKS"
      ]

      # Data rows
      assignments.each do |assignment|
        shift = assignment.shift
        worker = assignment.worker
        event = shift.event

        # Calculate break duration in hours (convert from minutes)
        break_hours = (assignment.break_duration_minutes || 0) / 60.0

        # Calculate total hours: (end_time - start_time) - break_hours
        total_hours = if assignment.hours_worked
          # Use recorded hours if available
          assignment.hours_worked
        else
          # Calculate from shift times minus breaks
          shift_duration = ((shift.end_time_utc - shift.start_time_utc) / 1.hour).round(2)
          [ shift_duration - break_hours, 0 ].max # Ensure non-negative
        end

        # SSOT: Use actual times if available, otherwise scheduled times
        start_time = assignment.actual_start_time_utc || shift.start_time_utc
        end_time = assignment.actual_end_time_utc || shift.end_time_utc

        csv << [
          event&.id || shift.id,
          shift.role_needed,
          worker.first_name,
          worker.last_name,
          start_time.strftime("%m/%d/%Y"),
          start_time.strftime("%I:%M %p"),
          end_time.strftime("%I:%M %p"),
          sprintf("%.2f", break_hours.round(2)), # Show break in hours with 2 decimals
          sprintf("%.2f", total_hours.round(2)), # Show total hours with 2 decimals
          event&.supervisor_name || "",
          assignment.notes || ""
        ]
      end
    end
  end

  def serialize_assignments(assignments)
    assignments.map do |assignment|
      {
        id: assignment.id,
        date: assignment.shift.start_time_utc.strftime("%Y-%m-%d"),
        worker: {
          id: assignment.worker.id,
          name: "#{assignment.worker.first_name} #{assignment.worker.last_name}",
          email: assignment.worker.email
        },
        shift: {
          id: assignment.shift.id,
          client_name: assignment.shift.client_name,
          role_needed: assignment.shift.role_needed,
          location: assignment.shift.location&.display_name || assignment.shift.location_text
        },
        hours_worked: assignment.hours_worked,
        hourly_rate: assignment.effective_hourly_rate,
        total_pay: assignment.total_pay,
        status: assignment.status
      }
    end
  end
end
