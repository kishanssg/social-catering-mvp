# spec/factories/workers.rb

FactoryBot.define do
  factory :worker do
    first_name { 'John' }
    last_name { 'Doe' }
    email { "john.doe.#{SecureRandom.hex(4)}@example.com" }
    phone { '555-0123' }
    skills_json { ['Server', 'Bartender'] }
    active { true }
  end
end
