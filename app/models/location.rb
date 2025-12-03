class Location < ApplicationRecord
  include Auditable

  has_many :shifts, dependent: :nullify

  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :city, presence: true
  validates :state, presence: true

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:display_order, :name) }

  def full_address
    [ address, city, state ].compact.join(", ")
  end

  def display_name
    "#{name} - #{city}, #{state}"
  end

  def self.for_dropdown
    active.ordered.map { |l| [ l.display_name, l.id ] }
  end
end
