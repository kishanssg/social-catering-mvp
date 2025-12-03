# spec/factories/event_skill_requirements.rb

FactoryBot.define do
  factory :event_skill_requirement do
    skill_name { 'Server' }
    uniform_name { 'Black pants, white shirt' }
    certification_name { nil }
    needed_workers { 2 }

    association :event
  end
end
