class Skill < ApplicationRecord
  include Auditable
  
  validates :name, presence: true, uniqueness: { case_sensitive: false }
  
  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:display_order, :name) }
  
  def to_s
    name
  end
  
  def self.for_dropdown
    active.ordered.pluck(:name, :id)
  end
end
