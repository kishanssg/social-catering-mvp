class Assignment < ApplicationRecord
  include Auditable

  belongs_to :shift
  belongs_to :worker
  belongs_to :assigned_by, class_name: "User"

  validates :assigned_at_utc, :status, presence: true
  validates :status, inclusion: { in: [ "assigned", "completed", "no_show", "cancelled" ] }

  scope :active, -> { where(status: "assigned") }
end
