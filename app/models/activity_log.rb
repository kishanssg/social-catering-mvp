class ActivityLog < ApplicationRecord
  belongs_to :actor_user, class_name: "User", optional: true

  validates :entity_type, :entity_id, :action, :created_at_utc, presence: true
end
