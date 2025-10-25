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
  
  # Cache the last used pay rate for this skill
  def cache_pay_rate!(rate)
    update(last_used_pay_rate: rate) if rate.present?
  end
  
  # Get the pay rate to pre-fill (last used, or default, or nil)
  def suggested_pay_rate
    last_used_pay_rate || default_pay_rate
  end
end
