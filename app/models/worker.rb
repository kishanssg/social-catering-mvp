class Worker < ApplicationRecord
  include Auditable
  
  has_many :worker_certifications, dependent: :destroy
  has_many :certifications, through: :worker_certifications
  has_many :assignments, dependent: :restrict_with_error
  has_many :shifts, through: :assignments
  
  validates :first_name, :last_name, presence: true
  validates :email, uniqueness: true, allow_nil: true
  
  scope :active, -> { where(active: true) }
  
  before_save :sync_skills_tsvector
  
  private
  
  def sync_skills_tsvector
    skills_array = case skills_json
                   when String then JSON.parse(skills_json) rescue []
                   when Array then skills_json
                   else []
                   end
    
    self.skills_text = skills_array.compact.map(&:to_s).map(&:strip)
                                   .reject(&:blank?).uniq.join(" ")
    
    # Update tsvector for full-text search
    if skills_text.present?
      result = ActiveRecord::Base.connection.execute(
        "SELECT to_tsvector('simple', #{ActiveRecord::Base.connection.quote(skills_text)}) as tsvector_result"
      )
      self.skills_tsvector = result.first['tsvector_result']
    else
      self.skills_tsvector = nil
    end
  end
end
