# spec/factories/shifts.rb

FactoryBot.define do
  factory :shift do
    association :event
    capacity { 1 }
    status { 'published' }
    auto_generated { true }
    association :created_by, factory: :user
    
    after(:build) do |shift|
      if shift.event&.event_schedule.present?
        schedule = shift.event.event_schedule
        shift.start_time_utc ||= schedule.start_time_utc
        shift.end_time_utc ||= schedule.end_time_utc
        shift.client_name ||= shift.event.title
        
        if shift.event.event_skill_requirements.blank?
          shift.event.event_skill_requirements.build(
            skill_name: shift.role_needed || 'Server',
            needed_workers: 1,
            uniform_name: 'Black pants, white shirt',
            required_certification_id: nil
          )
        end
        
        requirement = shift.event.event_skill_requirements.first
        if requirement
          shift.role_needed ||= requirement.skill_name
          shift.event_skill_requirement ||= requirement
          shift.required_cert ||= requirement.required_certification
        end
      else
        shift.start_time_utc ||= 1.day.from_now.change(hour: 9, min: 0)
        shift.end_time_utc ||= shift.start_time_utc + 4.hours
        shift.client_name ||= 'Standalone Shift'
      end
    end
    
    trait :standalone do
      event { nil }
      event_skill_requirement { nil }
      role_needed { 'Server' }
      client_name { 'Standalone Shift' }
      start_time_utc { 1.day.from_now.change(hour: 9, min: 0) }
      end_time_utc { start_time_utc + 4.hours }
    end
  end
end
