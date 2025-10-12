class Shift < ApplicationRecord
  include Auditable

  belongs_to :created_by, class_name: "User"
  belongs_to :required_cert, class_name: "Certification", optional: true
  has_many :assignments, dependent: :destroy
  has_many :workers, through: :assignments

  validates :client_name, :role_needed, :start_time_utc, :end_time_utc, :capacity, presence: true
  validates :capacity, numericality: { greater_than: 0 }
  validate :end_time_after_start_time

  scope :upcoming, -> { where("start_time_utc > ?", Time.current).order(:start_time_utc) }
  scope :past, -> { where("end_time_utc < ?", Time.current).order(start_time_utc: :desc) }
  scope :today, -> { where("DATE(start_time_utc) = ?", Time.current.to_date) }

  def assigned_count
    assignments.where(status: "assigned").count
  end

  def available_slots
    capacity - assigned_count
  end

  private

  def end_time_after_start_time
    if end_time_utc && start_time_utc && end_time_utc <= start_time_utc
      errors.add(:end_time_utc, "must be after start time")
    end
  end
end
