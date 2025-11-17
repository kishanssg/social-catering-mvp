FactoryBot.define do
  factory :certification do
    sequence(:name) { |n| "Certification #{n}" }
  end
end

