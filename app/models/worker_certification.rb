class WorkerCertification < ApplicationRecord
  belongs_to :worker
  belongs_to :certification

  validates :expires_at_utc, presence: true
  validate :expiration_in_future, on: :create

  scope :expired, -> { where("expires_at_utc < ?", Time.current) }
  scope :active, -> { where("expires_at_utc >= ?", Time.current) }

  private

  def expiration_in_future
    if expires_at_utc && expires_at_utc < Time.current
      errors.add(:expires_at_utc, "must be in the future")
    end
  end
end
