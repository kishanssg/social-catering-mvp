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

    ActivityLog.create!(
      actor_user_id: current_user_id,
      entity_type: self.class.name,
      entity_id: id,
      action: "updated",
      before_json: saved_changes.transform_values(&:first),
      after_json: saved_changes.transform_values(&:last),
      created_at_utc: Time.current
    )
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
