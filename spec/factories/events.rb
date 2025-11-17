# spec/factories/events.rb

FactoryBot.define do
  factory :event do
    title { "Test Event #{SecureRandom.hex(4)}" }
    status { 'published' }
    check_in_instructions { 'Please arrive 15 minutes early' }
    supervisor_name { 'John Supervisor' }
    supervisor_phone { '555-123-4567' }
    
    association :venue
    
    after(:build) do |event|
      start_time = 1.day.from_now.change(hour: 9, min: 0, sec: 0)
      end_time = start_time + 6.hours
      
      event.event_schedule ||= event.build_event_schedule(
        start_time_utc: start_time.utc,
        end_time_utc: end_time.utc,
        break_minutes: 15
      )
    end
    
    trait :draft do
      status { 'draft' }
    end
    
    trait :completed do
      status { 'completed' }
      after(:build) do |event|
        event.completed_at_utc ||= event.event_schedule&.end_time_utc || Time.current
      end
    end
  end
end
