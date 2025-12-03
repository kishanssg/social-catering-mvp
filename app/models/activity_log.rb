class ActivityLog < ApplicationRecord
  belongs_to :actor_user, class_name: "User", foreign_key: "actor_user_id", optional: true

  # Validations
  validates :entity_type, presence: true
  validates :entity_id, presence: true
  validates :action, presence: true

  # Callbacks
  after_create :compute_summary_and_details

  # Scopes for easy querying
  scope :recent, -> { order(created_at_utc: :desc) }
  scope :by_entity, ->(type, id) { where(entity_type: type, entity_id: id) }
  scope :by_action, ->(action) { where(action: action) }
  scope :by_actor, ->(user_id) { where(actor_user_id: user_id) }

  private

  def compute_summary_and_details
    presenter = ActivityLogPresenter.new(self)
    summary_text = presenter.summary
    curated = presenter.curated_details

    update_columns(
      summary: summary_text,
      details_json: curated
    )
  rescue => e
    Rails.logger.error "Failed to compute summary: #{e.message}"
  end

  # Human-readable action names
  def action_description
    case action
    when "created" then "Created #{entity_type}"
    when "updated" then "Updated #{entity_type}"
    when "deleted" then "Deleted #{entity_type}"
    when "assigned_worker" then "Assigned worker to shift"
    when "unassigned_worker" then "Unassigned worker from shift"
    else action.titleize
    end
  end
end
