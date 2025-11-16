# spec/factories/assignments.rb

FactoryBot.define do
  factory :assignment do
    status { 'confirmed' }
    assigned_at_utc { Time.current }
    hours_worked { 4.0 }
    break_duration_minutes { 30 }
    
    association :shift
    association :worker
    association :assigned_by, factory: :user
  end
end
