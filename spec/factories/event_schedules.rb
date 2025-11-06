# spec/factories/event_schedules.rb

FactoryBot.define do
  factory :event_schedule do
    start_time_utc { Time.current + 1.day }
    end_time_utc { Time.current + 1.day + 4.hours }
    break_minutes { 30 }
    
    association :event
  end
end

