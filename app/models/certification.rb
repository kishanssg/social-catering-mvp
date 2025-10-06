class Certification < ApplicationRecord
  has_many :worker_certifications, dependent: :restrict_with_error
  has_many :workers, through: :worker_certifications
  
  validates :name, presence: true, uniqueness: true
end
