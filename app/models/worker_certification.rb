class WorkerCertification < ApplicationRecord
  belongs_to :worker
  belongs_to :certification

  validates :expires_at_utc, presence: true
  validates :certification_id,
            uniqueness: { scope: :worker_id, message: "is already assigned to this worker" }

  scope :expired, -> { where("expires_at_utc < ?", Time.current) }
  scope :active, -> { where("expires_at_utc >= ?", Time.current) }
  scope :valid_on, ->(timestamp) {
    cutoff = timestamp || Time.current
    where("worker_certifications.expires_at_utc IS NULL OR worker_certifications.expires_at_utc >= ?", cutoff)
  }
end
