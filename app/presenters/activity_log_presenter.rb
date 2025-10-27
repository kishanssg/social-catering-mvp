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
    when ["Event", "created"]
      "#{actor_name} created event \"#{entity_name}\""
    when ["Event", "updated"]
      # For updates, we need to fetch the actual event to get its title
      event_title = fetch_event_title || entity_name
      changes_summary = get_changes_summary
      "#{actor_name} updated #{event_title}#{changes_summary}"
    when ["Event", "deleted"]
      "#{actor_name} removed #{entity_name}"
    when ["Worker", "created"]
      "#{actor_name} added #{entity_name}"
    when ["Worker", "updated"]
      "#{actor_name} updated #{entity_name}"
    when ["Worker", "deleted"]
      "#{actor_name} removed #{entity_name}"
    when ["Shift", "created"]
      "#{actor_name} added shift for #{entity_name}"
    when ["Shift", "updated"]
      "#{actor_name} updated shift for #{entity_name}"
    when ["Shift", "deleted"]
      "#{actor_name} removed shift #{entity_name}"
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
      
      # Show friendly changes instead of raw JSON
      changes = format_changes_nicely
      details[:changes_summary] = changes if changes.present?
      
      details
    when ["Event", "created"], ["Event", "updated"]
      {
        title: dj(:title),
        venue: dj(:venue_name),
        date: format_date(dj(:start_time_utc))
      }.compact
    when ["Shift", "created"], ["Shift", "updated"], ["Shift", "deleted"]
      {
        client_name: dj(:client_name),
        event_name: dj(:event_name),
        role: dj(:role_needed),
        time: format_time_range(dj(:start_time_utc), dj(:end_time_utc))
      }.compact
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
    shift_name = dj(:shift_name) || dj(:event_name)
    role = dj(:role)
    
    # If not available, fetch from database
    if !worker_name || !shift_name
      begin
        assignment = Assignment.find_by(id: log.entity_id)
        if assignment
          worker_name ||= "#{assignment.worker.first_name} #{assignment.worker.last_name}" if assignment.worker
          shift_name ||= assignment.shift.client_name if assignment.shift
          role ||= assignment.shift.role_needed if assignment.shift
        end
      rescue
        # If assignment was deleted, try to get info from the log's entity
      end
    end
    
    [worker_name, shift_name, role]
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
  
  def get_changes_summary
    return '' unless log.before_json && log.after_json
    
    before = log.before_json
    after = log.after_json
    
    # Filter out tracking fields
    tracking_fields = ['updated_at_utc', 'lock_version', 'updated_at']
    before = before.reject { |k, _| tracking_fields.include?(k.to_s) }
    after = after.reject { |k, _| tracking_fields.include?(k.to_s) }
    
    # Find changed fields
    changed_fields = []
    before.each do |key, old_value|
      new_value = after[key.to_sym] || after[key.to_s]
      if new_value && old_value != new_value
        # Format the change nicely
        field_name = key.to_s.humanize.downcase
        if key.to_s == 'status'
          changed_fields << "#{field_name}: #{old_value} → #{new_value}"
        else
          changed_fields << "#{field_name}"
        end
      end
    end
    
    return '' if changed_fields.empty?
    
    ' (changed: ' + changed_fields.join(', ') + ')'
  end
end

