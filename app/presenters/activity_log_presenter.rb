# ActivityLogPresenter
# Generates human-friendly summaries and curated details for Activity Log entries
class ActivityLogPresenter
  attr_reader :log

  def initialize(log)
    @log = log
    @before = log.before_json || {}
    @after = log.after_json || {}
  end

  def summary
    case log.entity_type
    when "Assignment"
      assignment_summary
    when "Event"
      event_summary
    when "Worker"
      worker_summary
    when "Shift"
      shift_summary
    else
      default_summary
    end
  end

  def curated_details
    case [ log.entity_type, log.action ]
    when [ "Assignment", "assigned_worker" ], [ "Assignment", "created" ]
      worker_name, shift_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: shift_name,
        role: role,
        pay_rate: dj(:hourly_rate) ? "$#{dj(:hourly_rate)}/hr" : nil
      }.compact
    when [ "Assignment", "unassigned_worker" ], [ "Assignment", "deleted" ]
      worker_name, shift_name, role = fetch_assignment_details_unassign
      {
        worker_name: worker_name,
        event_name: shift_name,
        role: role
      }.compact
    when [ "Assignment", "marked_no_show" ]
      worker_name, event_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role,
        notes: dj(:notes)
      }.compact
    when [ "Assignment", "removed_from_job" ]
      worker_name, event_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role,
        notes: dj(:notes)
      }.compact
    when [ "Assignment", "hours_re_edited" ], [ "Assignment", "hours_updated" ]
      worker_name, event_name, role = fetch_assignment_details
      before_hours = @before["effective_hours"] || @before["hours_worked"] || 0
      after_hours = @after["effective_hours"] || @after["hours_worked"] || 0
      before_pay = @before["effective_pay"] || 0
      after_pay = @after["effective_pay"] || 0
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role,
        before_hours: before_hours,
        after_hours: after_hours,
        before_pay: before_pay,
        after_pay: after_pay
      }.compact
    when [ "Assignment", "hours_reopened_for_editing" ]
      worker_name, event_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role
      }.compact
    when [ "Assignment", "restored_from_cancelled" ]
      worker_name, event_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role
      }.compact
    when [ "Worker", "created" ]
      {
        name: dj(:first_name) && dj(:last_name) ? "#{dj(:first_name)} #{dj(:last_name)}" : nil,
        email: dj(:email),
        phone: dj(:phone),
        skills: parse_skills(dj(:skills_json))
      }.compact
    when [ "Worker", "updated" ]
      worker_name = dj(:first_name) && dj(:last_name) ? "#{dj(:first_name)} #{dj(:last_name)}" : nil
      details = { name: worker_name }.compact

      # Show detailed changes with "from X to Y" format
      if log.before_json && log.after_json
        changes = []
        (log.before_json.keys & log.after_json.keys).each do |key|
          next if %w[updated_at lock_version updated_at_utc created_at created_at_utc].include?(key.to_s)

          before_val = log.before_json[key]
          after_val = log.after_json[key.to_sym] || log.after_json[key]

          if before_val != after_val
            field_name = format_field_name(key.to_s)
            old_display = format_field_value(key.to_s, before_val)
            new_display = format_field_value(key.to_s, after_val)
            changes << { field: field_name, from: old_display, to: new_display }
          end
        end
        details[:changes] = changes if changes.any?
      end

      details
    when [ "Event", "created" ]
      {
        title: dj(:title),
        venue: dj(:venue_name),
        date: format_date(dj(:start_time_utc))
      }.compact
    when [ "Event", "updated" ]
      details = {
        title: dj(:title),
        venue: dj(:venue_name),
        date: format_date(dj(:start_time_utc))
      }.compact

      # Show detailed changes with "from X to Y" format
      if log.before_json && log.after_json
        changes = []
        (log.before_json.keys & log.after_json.keys).each do |key|
          next if %w[updated_at lock_version updated_at_utc created_at created_at_utc].include?(key.to_s)

          before_val = log.before_json[key]
          after_val = log.after_json[key.to_sym] || log.after_json[key]

          if before_val != after_val
            field_name = format_field_name(key.to_s)
            old_display = format_field_value(key.to_s, before_val)
            new_display = format_field_value(key.to_s, after_val)
            changes << { field: field_name, from: old_display, to: new_display }
          end
        end
        details[:changes] = changes if changes.any?
      end

      details
    when [ "Event", "totals_recalculated" ]
      {
        event_name: dj(:event_name) || fetch_event_title,
        before_hours: @before["total_hours_worked"] || @before["total_hours"] || 0,
        after_hours: @after["total_hours_worked"] || @after["total_hours"] || 0,
        before_cost: @before["total_pay_amount"] || @before["total_cost"] || 0,
        after_cost: @after["total_pay_amount"] || @after["total_cost"] || 0
      }.compact
    when [ "Event", "event_hours_approved_selected" ], [ "Event", "event_hours_approved" ]
      {
        event_name: dj(:event_name) || fetch_event_title,
        worker_count: dj(:approved_count) || dj(:worker_count) || 0,
        worker_names: dj(:worker_names) || []
      }.compact
    when [ "Shift", "created" ], [ "Shift", "deleted" ]
      {
        client_name: dj(:client_name),
        event_name: dj(:event_name),
        role: dj(:role_needed),
        time: format_time_range(dj(:start_time_utc), dj(:end_time_utc))
      }.compact
    when [ "Shift", "updated" ]
      details = {
        client_name: dj(:client_name),
        event_name: dj(:event_name),
        role: dj(:role_needed),
        time: format_time_range(dj(:start_time_utc), dj(:end_time_utc))
      }.compact

      # Show detailed changes with "from X to Y" format
      if log.before_json && log.after_json
        changes = []
        (log.before_json.keys & log.after_json.keys).each do |key|
          next if %w[updated_at lock_version updated_at_utc created_at created_at_utc].include?(key.to_s)

          before_val = log.before_json[key]
          after_val = log.after_json[key.to_sym] || log.after_json[key]

          if before_val != after_val
            field_name = format_field_name(key.to_s)
            old_display = format_field_value(key.to_s, before_val)
            new_display = format_field_value(key.to_s, after_val)
            changes << { field: field_name, from: old_display, to: new_display }
          end
        end
        details[:changes] = changes if changes.any?
      end

      details
    else
      {}
    end
  end

  private

  def assignment_summary
    case log.action
    when "assigned_worker", "created"
      worker_name, event_name, role = fetch_assignment_details
      rate = dj(:hourly_rate) || dj(:effective_hourly_rate)
      rate_display = rate ? " (#{format_money(rate)}/h)" : ""
      role_display = role ? " as #{role}" : ""
      "#{actor_name} assigned #{worker_name} to #{event_name}#{role_display}#{rate_display}"

    when "unassigned_worker", "deleted"
      worker_name, event_name, role = fetch_assignment_details_unassign
      role_display = role ? " (#{role})" : ""
      "#{actor_name} removed #{worker_name} from #{event_name}#{role_display}"

    when "marked_no_show"
      worker_name, event_name, role = fetch_assignment_details
      before_pay = @before["effective_pay"] || (@before["effective_hours"].to_f * (@before["effective_hourly_rate"] || @before["hourly_rate"] || 0).to_f)
      role_display = role ? " (#{role})" : ""
      "#{actor_name} marked #{worker_name} as no show for #{event_name}#{role_display}, #{format_money(before_pay)} → $0.00"

    when "removed_from_job"
      worker_name, event_name, role = fetch_assignment_details
      role_display = role ? " (#{role})" : ""
      "#{actor_name} removed #{worker_name} from #{event_name}#{role_display}"

    when "hours_re_edited", "hours_updated"
      worker_name, event_name, role = fetch_assignment_details
      before_hours = @before["effective_hours"] || @before["hours_worked"] || 0
      after_hours = @after["effective_hours"] || @after["hours_worked"] || 0
      before_pay = @before["effective_pay"] || 0
      after_pay = @after["effective_pay"] || 0
      "#{actor_name} edited hours for #{worker_name} on #{event_name}: #{format_hours(before_hours)} → #{format_hours(after_hours)} (#{format_money(before_pay)} → #{format_money(after_pay)})"

    when "hours_reopened_for_editing"
      worker_name, event_name, role = fetch_assignment_details
      "#{actor_name} reopened hours for #{worker_name} on #{event_name} for editing"

    when "restored_from_cancelled"
      worker_name, event_name, role = fetch_assignment_details
      "#{actor_name} restored #{worker_name}'s assignment to #{event_name}"

    when "updated"
      worker_name, event_name, role = fetch_assignment_details

      # Detect what changed
      if rate_changed?
        before_rate = @before["effective_hourly_rate"] || @before["hourly_rate"]
        after_rate = @after["effective_hourly_rate"] || @after["hourly_rate"]
        "#{actor_name} changed #{worker_name}'s rate on #{event_name}: #{format_money(before_rate)}/h → #{format_money(after_rate)}/h"
      elsif status_changed?
        before_status = format_status(@before["status"] || "pending")
        after_status = format_status(@after["status"] || "pending")
        "#{actor_name} changed #{worker_name}'s status on #{event_name}: #{before_status} → #{after_status}"
      else
        "#{actor_name} updated #{worker_name}'s assignment on #{event_name}"
      end

    else
      default_summary
    end
  end

  def event_summary
    case log.action
    when "event_hours_approved_selected"
      event_name = dj(:event_name) || fetch_event_title || "event"
      worker_count = dj(:approved_count) || dj(:worker_count) || 0
      worker_names = dj(:worker_names) || []

      # Show worker names in main message (like edits do)
      if worker_names.any?
        if worker_count == 1
          # Single worker: "approved hours for [Worker Name] on [Event]"
          "#{actor_name} approved hours for #{worker_names.first} on #{event_name}"
        else
          # Multiple workers: "approved hours for [Worker1, Worker2, ...] on [Event]"
          workers_list = format_worker_list(worker_names)
          "#{actor_name} approved hours for #{workers_list} on #{event_name}"
        end
      else
        # Fallback if worker names not available
        worker_text = worker_count == 1 ? "worker" : "workers"
        "#{actor_name} approved hours for #{worker_count} #{worker_text} on #{event_name}"
      end

    when "event_hours_approved"
      event_name = dj(:event_name) || fetch_event_title || "event"
      worker_count = dj(:approved_count) || dj(:worker_count) || 0
      worker_names = dj(:worker_names) || []

      # Show worker names in main message (like edits do)
      if worker_names.any?
        if worker_count == 1
          # Single worker: "approved hours for [Worker Name] on [Event]"
          "#{actor_name} approved hours for #{worker_names.first} on #{event_name}"
        else
          # Multiple workers: "approved hours for [Worker1, Worker2, ...] on [Event]"
          workers_list = format_worker_list(worker_names)
          "#{actor_name} approved hours for #{workers_list} on #{event_name}"
        end
      else
        # Fallback if worker names not available
        worker_text = worker_count == 1 ? "worker" : "workers"
        "#{actor_name} approved hours for all #{worker_count} #{worker_text} on #{event_name}"
      end

    when "totals_recalculated"
      event_name = dj(:event_name) || fetch_event_title || "event"
      before_hours = @before["total_hours_worked"] || @before["total_hours"] || 0
      after_hours = @after["total_hours_worked"] || @after["total_hours"] || 0
      before_cost = @before["total_pay_amount"] || @before["total_cost"] || 0
      after_cost = @after["total_pay_amount"] || @after["total_cost"] || 0
      "#{actor_name} recalculated totals for #{event_name}: #{format_hours(before_hours)} → #{format_hours(after_hours)} (#{format_money(before_cost)} → #{format_money(after_cost)})"

    when "created"
      event_name = dj(:title) || entity_name || "Untitled Event"
      "#{actor_name} created event '#{event_name}'"

    when "updated"
      event_name = dj(:title) || fetch_event_title || entity_name || "event"
      changes = detect_event_changes

      if changes.any?
        "#{actor_name} updated #{event_name} (#{changes.join(', ')})"
      else
        "#{actor_name} updated #{event_name}"
      end

    when "deleted"
      event_name = @before["title"] || fetch_event_title || entity_name || "event"
      "#{actor_name} deleted event '#{event_name}'"

    else
      default_summary
    end
  end

  def worker_summary
    case log.action
    when "created"
      worker_name = dj(:first_name) && dj(:last_name) ? "#{dj(:first_name)} #{dj(:last_name)}" : entity_name || "New Worker"
      "#{actor_name} added #{worker_name}"

    when "updated"
      worker_name = dj(:first_name) && dj(:last_name) ? "#{dj(:first_name)} #{dj(:last_name)}" : entity_name || "Worker"
      changes = detect_worker_changes

      if changes.any?
        "#{actor_name} updated #{worker_name} (#{changes.join(', ')})"
      else
        "#{actor_name} updated #{worker_name}"
      end

    when "deleted"
      worker_name = @before["first_name"] && @before["last_name"] ? "#{@before['first_name']} #{@before['last_name']}" : entity_name || "Worker"
      "#{actor_name} removed #{worker_name}"

    else
      default_summary
    end
  end

  def shift_summary
    case log.action
    when "created"
      event_name = dj(:event_name) || fetch_event_name_from_shift || "event"
      role = dj(:role_needed) || "Staff"
      "#{actor_name} created shift for #{event_name} (#{role})"

    when "updated"
      event_name = dj(:event_name) || fetch_event_name_from_shift || "event"
      role = dj(:role_needed) || "Staff"
      "#{actor_name} updated shift for #{event_name} (#{role})"

    when "deleted"
      event_name = @before["event_name"] || fetch_event_name_from_shift || "event"
      role = @before["role_needed"] || "Staff"
      "#{actor_name} deleted shift for #{event_name} (#{role})"

    else
      default_summary
    end
  end

  def default_summary
    entity_name_display = entity_name || log.entity_type
    "#{actor_name} #{log.action.humanize.downcase} #{entity_name_display}"
  end

  # Helper methods
  def actor_name
    return "Admin" unless log.actor_user

    self.class.format_actor_name(log.actor_user)
  end

  def self.format_actor_name(user)
    return "System" unless user

    email = user.email
    name = email.split("@").first

    # Remove underscores and capitalize: test_admin → Test Admin
    name.split(/[._-]/).map(&:capitalize).join(" ")
  end

  def self.format_person_name_short(first, last)
    return "Unknown" unless first && last

    # Return: "Riley A." (first name + last initial)
    "#{first.strip.capitalize} #{last.strip[0].upcase}."
  end

  def entity_name
    dj(:entity_name) || format_entity_type
  end

  def dj(key)
    key = key.to_s
    data = @after || @before || {}
    data[key] || data[key.to_sym]
  end

  def fetch_event_title
    return nil unless log.entity_type == "Event" && log.entity_id

    begin
      event = Event.find_by(id: log.entity_id)
      event&.title
    rescue
      nil
    end
  end

  def fetch_event_name_from_shift
    return nil unless log.entity_type == "Shift" && log.entity_id

    begin
      shift = Shift.find_by(id: log.entity_id)
      shift&.event&.title || shift&.client_name
    rescue
      nil
    end
  end

  def format_entity_type
    case log.entity_type.downcase
    when "assignment" then "an assignment"
    when "event" then "an event"
    when "shift" then "a shift"
    when "worker" then "a worker"
    else log.entity_type
    end
  end

  def parse_skills(skills_json)
    return nil unless skills_json

    case skills_json
    when Array then skills_json.join(", ")
    when String
      begin
        JSON.parse(skills_json)&.join(", ")
      rescue
        skills_json
      end
    else skills_json.to_s
    end
  end

  def format_date(utc_string)
    return nil unless utc_string

    begin
      Date.parse(utc_string.to_s).strftime("%b %d, %Y")
    rescue
      nil
    end
  end

  def format_time_range(start_utc, end_utc)
    return nil unless start_utc && end_utc

    begin
      start = Time.parse(start_utc.to_s)
      end_time = Time.parse(end_utc.to_s)
      "#{start.strftime('%l:%M %p')} - #{end_time.strftime('%l:%M %p')}"
    rescue
      nil
    end
  end

  def fetch_assignment_details
    # Try to get from after_json first
    worker_name = dj(:worker_name)
    event_name = dj(:event_name) || dj(:shift_name)
    role = dj(:role) || dj(:role_needed) || dj(:shift_role)

    # If not available, fetch from database
    if !worker_name || !event_name
      begin
        assignment = Assignment.find_by(id: log.entity_id)
        if assignment
          worker_name ||= "#{assignment.worker.first_name} #{assignment.worker.last_name}" if assignment.worker
          # Try to get event title first, then fall back to shift client_name
          if assignment.shift
            event_name ||= assignment.shift.event&.title if assignment.shift.event
            event_name ||= assignment.shift.client_name
          end
          role ||= assignment.shift.role_needed if assignment.shift
        end
      rescue
        # If assignment was deleted, try to get info from the log's entity
      end
    end

    [ worker_name || "Unknown Worker", event_name || "Unknown Event", role ]
  end

  def fetch_assignment_details_unassign
    # For unassign, try before_json first
    worker_name = @before["worker_name"] || @before[:worker_name]
    event_name = @before["event_name"] || @before["shift_name"] || @before[:event_name] || @before[:shift_name]
    role = @before["role"] || @before["role_needed"] || @before["shift_role"] || @before[:role] || @before[:role_needed] || @before[:shift_role]

    # If not available, fetch from database
    if !worker_name || !event_name
      begin
        assignment = Assignment.with_deleted.find_by(id: log.entity_id) rescue Assignment.find_by(id: log.entity_id)
        if assignment
          worker_name ||= "#{assignment.worker.first_name} #{assignment.worker.last_name}" if assignment.worker
          event_name ||= assignment.shift.event&.title if assignment.shift&.event
          event_name ||= assignment.shift.client_name if assignment.shift
          role ||= assignment.shift.role_needed if assignment.shift
        end
      rescue
      end
    end

    [ worker_name || "Unknown Worker", event_name || "Unknown Event", role ]
  end

  def rate_changed?
    before_rate = @before["effective_hourly_rate"] || @before["hourly_rate"]
    after_rate = @after["effective_hourly_rate"] || @after["hourly_rate"]
    before_rate.present? && after_rate.present? && before_rate != after_rate
  end

  def status_changed?
    @before["status"].present? && @after["status"].present? && @before["status"] != @after["status"]
  end

  def detect_event_changes
    changes = []

    if @before["title"] != @after["title"] && @before["title"].present? && @after["title"].present?
      changes << "title from '#{@before['title']}' to '#{@after['title']}'"
    end

    if @before["start_time_utc"] != @after["start_time_utc"] && @before["start_time_utc"].present? && @after["start_time_utc"].present?
      changes << "start time changed"
    end

    if @before["venue_id"] != @after["venue_id"] && @before["venue_id"].present? && @after["venue_id"].present?
      changes << "venue changed"
    end

    changes
  end

  def detect_worker_changes
    changes = []

    if @before["email"] != @after["email"] && @before["email"].present? && @after["email"].present?
      changes << "email from #{@before['email']} to #{@after['email']}"
    end

    if @before["phone"] != @after["phone"] && @before["phone"].present? && @after["phone"].present?
      changes << "phone from #{@before['phone']} to #{@after['phone']}"
    end

    if @before["base_hourly_rate"] != @after["base_hourly_rate"] && @before["base_hourly_rate"].present? && @after["base_hourly_rate"].present?
      changes << "base rate from #{format_money(@before['base_hourly_rate'])}/h to #{format_money(@after['base_hourly_rate'])}/h"
    end

    changes
  end

  def format_worker_list(names)
    return "" if names.empty?

    # Format names as "First LastInitial." (e.g., "Riley A., Charlie W.")
    formatted_names = names.map do |name|
      if name.is_a?(String)
        # If already formatted as "Riley A.", use as-is
        if name.match?(/^[A-Z][a-z]+ [A-Z]\.$/)
          name
        else
          # Try to parse full name and format it
          parts = name.split(/\s+/)
          if parts.length >= 2
            "#{parts[0].capitalize} #{parts[1][0].upcase}."
          else
            name
          end
        end
      else
        name.to_s
      end
    end

    if formatted_names.length <= 3
      formatted_names.join(", ")
    else
      "#{formatted_names[0..2].join(', ')}, and #{formatted_names.length - 3} more"
    end
  end

  def format_money(amount)
    return "$0.00" if amount.nil? || amount == ""
    "$#{sprintf('%.2f', amount.to_f)}"
  end

  def format_hours(hours)
    return "0h" if hours.nil? || hours == 0
    # Format as "5.5h" (one decimal place, no trailing zero if whole number)
    h = hours.to_f
    if h == h.to_i
      "#{h.to_i}h"
    else
      "#{h.round(1)}h"
    end
  end

  def format_status(status)
    return "pending" if status.nil?
    status.to_s.humanize
  end

  def was_deletion_operation?
    return false unless @before && @after

    # Check if status changed to "deleted"
    before_status = @before["status"] || @before[:status]
    after_status = @after["status"] || @after[:status]

    after_status == "deleted" && before_status != "deleted"
  end

  def get_changes_summary
    return "" unless @before && @after

    # Filter out tracking fields
    tracking_fields = [ "updated_at_utc", "lock_version", "updated_at", "created_at", "created_at_utc" ]
    before_filtered = @before.reject { |k, _| tracking_fields.include?(k.to_s) }
    after_filtered = @after.reject { |k, _| tracking_fields.include?(k.to_s) }

    # Find changed fields with humanized "from → to" format
    changed_fields = []
    before_filtered.each do |key, old_value|
      new_value = after_filtered[key.to_sym] || after_filtered[key.to_s]
      if new_value && old_value != new_value
        field_name = format_field_name(key.to_s)
        old_display = format_field_value(key.to_s, old_value)
        new_display = format_field_value(key.to_s, new_value)
        changed_fields << "#{field_name} from #{old_display} to #{new_display}"
      end
    end

    return "" if changed_fields.empty?

    " (" + changed_fields.join(", ") + ")"
  end

  def format_field_name(key)
    # Humanize field names
    case key
    when "status" then "status"
    when "active" then "active status"
    when "first_name" then "first name"
    when "last_name" then "last name"
    when "email" then "email"
    when "phone" then "phone"
    when "title" then "title"
    when "venue_name" then "venue"
    when "start_time_utc" then "start time"
    when "end_time_utc" then "end time"
    when "pay_rate" then "pay rate"
    when "hours_worked" then "hours worked"
    when "total_pay" then "total pay"
    when "capacity" then "capacity"
    when "role_needed" then "role"
    when "skills_json" then "skills"
    else key.humanize.downcase
    end
  end

  def format_field_value(key, value)
    return "empty" if value.nil? || value == ""

    case key
    when "active"
      value == true || value == "true" || value == 1 ? "active" : "inactive"
    when "status"
      value.to_s.humanize
    when "pay_rate", "total_pay", "hourly_rate", "effective_hourly_rate", "base_hourly_rate"
      format_money(value)
    when "hours_worked", "effective_hours"
      format_hours(value)
    when "start_time_utc", "end_time_utc"
      begin
        Time.parse(value.to_s).strftime("%b %d, %Y at %I:%M %p")
      rescue
        value.to_s
      end
    when "skills_json"
      if value.is_a?(Array)
        value.join(", ")
      elsif value.is_a?(String)
        begin
          JSON.parse(value).join(", ")
        rescue
          value
        end
      else
        value.to_s
      end
    else
      value.to_s
    end
  end
end
