# spec/factories/venues.rb

FactoryBot.define do
  factory :venue do
    name { 'Test Venue' }
    formatted_address { '123 Test St, Test City, FL 32301' }
    place_id { "test_place_#{SecureRandom.hex(8)}" }
    latitude { 30.4518 }
    longitude { -84.2807 }
  end
end
