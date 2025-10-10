class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :shifts, foreign_key: 'created_by_id', dependent: :restrict_with_error
  has_many :assignments_created, class_name: 'Assignment', foreign_key: 'assigned_by_id'
  
  validates :email, presence: true, uniqueness: true
  validates :role, presence: true, inclusion: { in: ['admin'] }

  # Returns true if the user has admin role
  def admin?
    role == 'admin'
  end
end
