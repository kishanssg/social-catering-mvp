# ActivityLogPresenter
# Generates human-friendly summaries and curated details for Activity Log entries
class ActivityLogPresenter
  attr_reader :log

  def initialize(log)
    @log = log
  end

  def summary
    case [log.entity_type, log.action]
    when ["Assignment", "assigned_worker"], ["Assignment", "created"]
      worker_name, shift_name, role = fetch_assignment_details
      build_assignment_summary("assigned", worker_name, shift_name, role)
    when ["Assignment", "unassigned_worker"], ["Assignment", "deleted"]
      worker_name, shift_name, role = fetch_assignment_details_unassign
      build_assignment_summary("removed", worker_name, shift_name, role)
    when ["Assignment", "marked_no_show"]
      worker_name, event_name, role = fetch_assignment_details
      build_no_show_summary(worker_name, event_name, role)
    when ["Assignment", "removed_from_job"]
      worker_name, event_name, role = fetch_assignment_details
      build_removed_summary(worker_name, event_name, role)
    when ["Event", "created"]
      "#{actor_name} created event \"#{entity_name}\""
    when ["Event", "updated"]
      # For updates, we need to fetch the actual event to get its title
      event_title = fetch_event_title || entity_name
      
      # Check if this was a deletion operation
      if was_deletion_operation?
        return "#{actor_name} deleted #{event_title}"
      end
      
      changes_summary = get_changes_summary
      "#{actor_name} updated #{event_title}#{changes_summary}"
    when ["Event", "deleted"]
      "#{actor_name} removed #{entity_name}"
    when ["Worker", "created"]
      "#{actor_name} added #{entity_name}"
    when ["Worker", "updated"]
      changes_summary = get_changes_summary
      if changes_summary.present?
        "#{actor_name} updated #{entity_name}#{changes_summary}"
      else
        "#{actor_name} updated #{entity_name}"
      end
    when ["Worker", "deleted"]
      "#{actor_name} removed #{entity_name}"
    when ["Shift", "created"]
      "#{actor_name} added shift for #{entity_name}"
    when ["Shift", "updated"]
      changes_summary = get_changes_summary
      if changes_summary.present?
        "#{actor_name} updated shift for #{entity_name}#{changes_summary}"
      else
        "#{actor_name} updated shift for #{entity_name}"
      end
    when ["Shift", "deleted"]
      "#{actor_name} removed shift #{entity_name}"
    when ["Event", "totals_recalculated"]
      event_title = fetch_event_title || entity_name
      after = log.after_json || {}
      hours = after['total_hours_worked'] || after[:total_hours_worked]
      pay = after['total_pay_amount'] || after[:total_pay_amount]
      
      details = []
      details << "#{hours.round(2)}h" if hours
      details << "$#{pay.round(2)}" if pay
      
      if details.any?
        "#{actor_name} recalculated totals for \"#{event_title}\" (#{details.join(', ')})"
      else
        "#{actor_name} recalculated totals for \"#{event_title}\""
      end
    else
      "#{actor_name} #{log.action.humanize.downcase} #{entity_name}"
    end
  end

  def curated_details
    case [log.entity_type, log.action]
    when ["Assignment", "assigned_worker"], ["Assignment", "created"]
      worker_name, shift_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: shift_name,
        role: role,
        pay_rate: dj(:hourly_rate) ? "$#{dj(:hourly_rate)}/hr" : nil
      }.compact
    when ["Assignment", "unassigned_worker"], ["Assignment", "deleted"]
      worker_name, shift_name, role = fetch_assignment_details_unassign
      {
        worker_name: worker_name,
        event_name: shift_name,
        role: role
      }.compact
    when ["Assignment", "marked_no_show"]
      worker_name, event_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role,
        notes: dj(:notes)
      }.compact
    when ["Assignment", "removed_from_job"]
      worker_name, event_name, role = fetch_assignment_details
      {
        worker_name: worker_name,
        event_name: event_name,
        role: role,
        notes: dj(:notes)
      }.compact
    when ["Worker", "created"]
      {
        name: dj(:first_name) && dj(:last_name) ? "#{dj(:first_name)} #{dj(:last_name)}" : nil,
        email: dj(:email),
        phone: dj(:phone),
        skills: parse_skills(dj(:skills_json))
      }.compact
    when ["Worker", "updated"]
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
    when ["Event", "created"]
      {
        title: dj(:title),
        venue: dj(:venue_name),
        date: format_date(dj(:start_time_utc))
      }.compact
    when ["Event", "updated"]
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
    when ["Shift", "created"], ["Shift", "deleted"]
      {
        client_name: dj(:client_name),
        event_name: dj(:event_name),
        role: dj(:role_needed),
        time: format_time_range(dj(:start_time_utc), dj(:end_time_utc))
      }.compact
    when ["Shift", "updated"]
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

  def actor_name
    return "Admin" unless log.actor_user
    
    self.class.format_actor_name(log.actor_user)
  end
  
  def self.format_actor_name(user)
    return 'System' unless user
    
    email = user.email
    name = email.split('@').first
    
    # Remove underscores and capitalize: test_admin → Test Admin
    name.split(/[._-]/).map(&:capitalize).join(' ')
  end
  
  def self.format_person_name_short(first, last)
    return 'Unknown' unless first && last
    
    # Return: "Riley A." (first name + last initial)
    "#{first.strip.capitalize} #{last.strip[0].upcase}."
  end

  def entity_name
    dj(:entity_name) || format_entity_type
  end

  def dj(key)
    key = key.to_s
    data = log.after_json || log.before_json || {}
    data[key]
  end
  
  def fetch_event_title
    return nil unless log.entity_type == 'Event' && log.entity_id
    
    begin
      event = Event.find_by(id: log.entity_id)
      event&.title
    rescue
      nil
    end
  end

  def build_assignment_summary(verb, worker, event, role)
    # Try to format worker name nicely (first + last initial)
    if worker && worker.include?(' ')
      parts = worker.split(' ')
      worker_display = self.class.format_person_name_short(parts[0], parts[1])
    else
      worker_display = worker || 'a worker'
    end
    
    event_display = event || 'an event'
    role_display = role ? " as #{role}" : ''
    
    "#{actor_name} #{verb} #{worker_display} to #{event_display}#{role_display}"
  end

  def build_no_show_summary(worker, event, role)
    # Use full worker name for no-show
    worker_display = worker || 'a worker'
    event_display = event || 'an event'
    notes = dj(:notes)
    
    summary = "#{actor_name} marked #{worker_display} as no show for #{event_display}"
    summary += " (#{notes})" if notes.present?
    summary
  end

  def build_removed_summary(worker, event, role)
    # Use full worker name for removed
    worker_display = worker || 'a worker'
    event_display = event || 'an event'
    notes = dj(:notes)
    
    summary = "#{actor_name} removed #{worker_display} from #{event_display}"
    summary += " (#{notes})" if notes.present?
    summary
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

  def detect_changes
    return {} unless log.before_json && log.after_json
    
    changes = {}
    (log.before_json.keys & log.after_json.keys).each do |key|
      next if %w[updated_at_utc lock_version].include?(key)
      
      before_val = log.before_json[key]
      after_val = log.after_json[key]
      
      if before_val != after_val
        changes[key] = { from: before_val, to: after_val }
      end
    end
    
    changes
  end
  
  def format_changes_nicely
    return nil unless log.before_json && log.after_json
    
    changes = []
    (log.before_json.keys & log.after_json.keys).each do |key|
      next if %w[updated_at lock_version updated_at_utc created_at created_at_utc].include?(key)
      
      before_val = log.before_json[key]
      after_val = log.after_json[key]
      
      if before_val != after_val
        field_display = key.humanize.downcase
        changes << "#{field_display}: #{before_val} → #{after_val}"
      end
    end
    
    changes.join(", ")
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
    role = dj(:role)
    
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
    
    [worker_name, event_name, role]
  end
  
  def fetch_assignment_details_unassign
    # For unassign, try before_json first
    worker_name = dj(:worker_name)
    shift_name = dj(:shift_name) || dj(:event_name)
    role = dj(:role)
    
    # If not available, fetch from database
    if !worker_name || !shift_name
      begin
        assignment = Assignment.with_deleted.find_by(id: log.entity_id) rescue Assignment.find_by(id: log.entity_id)
        if assignment
          worker_name ||= "#{assignment.worker.first_name} #{assignment.worker.last_name}" if assignment.worker
          shift_name ||= assignment.shift.client_name if assignment.shift
          role ||= assignment.shift.role_needed if assignment.shift
        end
      rescue
      end
    end
    
    [worker_name, shift_name, role]
  end
  
  def was_deletion_operation?
    return false unless log.before_json && log.after_json
    
    before = log.before_json
    after = log.after_json
    
    # Check if status changed to "deleted"
    before_status = before['status'] || before[:status]
    after_status = after['status'] || after[:status]
    
    after_status == 'deleted' && before_status != 'deleted'
  end
  
  def get_changes_summary
    return '' unless log.before_json && log.after_json
    
    before = log.before_json
    after = log.after_json
    
    # Filter out tracking fields
    tracking_fields = ['updated_at_utc', 'lock_version', 'updated_at', 'created_at', 'created_at_utc']
    before = before.reject { |k, _| tracking_fields.include?(k.to_s) }
    after = after.reject { |k, _| tracking_fields.include?(k.to_s) }
    
    # Find changed fields with humanized "from → to" format
    changed_fields = []
    before.each do |key, old_value|
      new_value = after[key.to_sym] || after[key.to_s]
      if new_value && old_value != new_value
        field_name = format_field_name(key.to_s)
        old_display = format_field_value(key.to_s, old_value)
        new_display = format_field_value(key.to_s, new_value)
        changed_fields << "#{field_name} from #{old_display} to #{new_display}"
      end
    end
    
    return '' if changed_fields.empty?
    
    ' (' + changed_fields.join(', ') + ')'
  end
  
  def format_field_name(key)
    # Humanize field names
    case key
    when 'status' then 'status'
    when 'active' then 'active status'
    when 'first_name' then 'first name'
    when 'last_name' then 'last name'
    when 'email' then 'email'
    when 'phone' then 'phone'
    when 'title' then 'title'
    when 'venue_name' then 'venue'
    when 'start_time_utc' then 'start time'
    when 'end_time_utc' then 'end time'
    when 'pay_rate' then 'pay rate'
    when 'hours_worked' then 'hours worked'
    when 'total_pay' then 'total pay'
    when 'capacity' then 'capacity'
    when 'role_needed' then 'role'
    when 'skills_json' then 'skills'
    else key.humanize.downcase
    end
  end
  
  def format_field_value(key, value)
    return 'empty' if value.nil? || value == ''
    
    case key
    when 'active'
      value == true || value == 'true' || value == 1 ? 'active' : 'inactive'
    when 'status'
      value.to_s.humanize
    when 'pay_rate', 'total_pay', 'hourly_rate'
      "$#{value.to_f.round(2)}"
    when 'hours_worked'
      "#{value.to_f.round(2)}h"
    when 'start_time_utc', 'end_time_utc'
      begin
        Time.parse(value.to_s).strftime("%b %d, %Y at %I:%M %p")
      rescue
        value.to_s
      end
    when 'skills_json'
      if value.is_a?(Array)
        value.join(', ')
      elsif value.is_a?(String)
        begin
          JSON.parse(value).join(', ')
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

