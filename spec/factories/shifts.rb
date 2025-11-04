# spec/factories/shifts.rb

FactoryBot.define do
  factory :shift do
    role_needed { 'Server' }
    start_time_utc { Time.current + 1.day }
    end_time_utc { Time.current + 1.day + 4.hours }
    capacity { 1 }
    status { 'published' }
    client_name { 'Test Event' }
    
    association :event
    association :event_skill_requirement
    association :created_by, factory: :user
  end
end
