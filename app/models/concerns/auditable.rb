module Auditable
  extend ActiveSupport::Concern

  included do
    after_create :log_create
    after_update :log_update
    after_destroy :log_destroy
  end

  private

  def log_create
    return unless should_log?

    ActivityLog.create!(
      actor_user_id: current_user_id,
      entity_type: self.class.name,
      entity_id: id,
      action: "created",
      after_json: attributes,
      created_at_utc: Time.current
    )
  end

  def log_update
    return unless should_log?
    return unless saved_changes.any?

    # Include entity name for better context
    entity_name = get_entity_name
    before_data = saved_changes.transform_values(&:first)
    after_data = saved_changes.transform_values(&:last)
    
    # Add entity name to both before and after JSON
    before_data['entity_name'] = entity_name if entity_name.present?
    after_data['entity_name'] = entity_name if entity_name.present?

    ActivityLog.create!(
      actor_user_id: current_user_id,
      entity_type: self.class.name,
      entity_id: id,
      action: "updated",
      before_json: before_data,
      after_json: after_data,
      created_at_utc: Time.current
    )
  end
  
  def get_entity_name
    # Try to get a human-readable name for the entity
    return title if respond_to?(:title) && title.present?
    return name if respond_to?(:name) && name.present?
    return client_name if respond_to?(:client_name) && client_name.present?
    
    # For workers
    if respond_to?(:first_name) && respond_to?(:last_name)
      return "#{first_name} #{last_name}".strip if first_name.present? || last_name.present?
    end
    
    nil
  end

  def should_log?
    # Only log if we have a current user context
    current_user_id.present?
  end

  def log_destroy
    return unless should_log?

    ActivityLog.create!(
      actor_user_id: current_user_id,
      entity_type: self.class.name,
      entity_id: id,
      action: "deleted",
      before_json: attributes,
      created_at_utc: Time.current
    )
  end

  def current_user_id
    # Try to get from Current, thread-local storage
    Current.user&.id
  end
end
