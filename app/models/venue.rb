class Venue < ApplicationRecord
  # Associations
  has_many :events, dependent: :restrict_with_error

  # Set timestamps manually for *_utc columns
  before_create :set_created_at_utc
  before_save :set_updated_at_utc
  
  # Validations
  validates :place_id, presence: true, uniqueness: true
  validates :name, presence: true
  validates :formatted_address, presence: true
  
  # Scopes
  scope :recently_used, -> { order(updated_at_utc: :desc).limit(10) }
  scope :stale, -> { where('last_synced_at_utc < ?', 30.days.ago) }
  scope :active, -> { where(active: true) }
  
  # Check if venue data is stale and needs refresh from Google
  def stale?
    last_synced_at_utc.nil? || last_synced_at_utc < 30.days.ago
  end
  
  # Mark venue as synced with Google
  def mark_synced!
    update(last_synced_at_utc: Time.current)
  end
  
  # Display name with address for UI
  def display_name
    "#{name}\n#{formatted_address}"
  end

  # Display name with city and state (for compatibility)
  def display_name_with_location
    city_state = [city, state].compact.join(', ')
    city_state.present? ? "#{name} - #{city_state}" : name
  end
  
  # Check if venue has custom instructions
  def has_custom_instructions?
    arrival_instructions.present? || parking_info.present?
  end
  
  private
  
  def set_created_at_utc
    self.created_at_utc ||= Time.current
  end
  
  def set_updated_at_utc
    self.updated_at_utc = Time.current
  end
end
