# spec/factories/events.rb

FactoryBot.define do
  factory :event do
    title { 'Test Event' }
    status { 'published' }
    check_in_instructions { 'Please arrive 15 minutes early' }
    supervisor_name { 'John Supervisor' }
    supervisor_phone { '555-123-4567' }
    
    association :venue
  end
end
