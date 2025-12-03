FactoryBot.define do
  factory :worker_certification do
    association :worker
    association :certification
    expires_at_utc { 1.year.from_now }
  end
end
