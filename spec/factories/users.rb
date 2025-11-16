# spec/factories/users.rb

FactoryBot.define do
  factory :user do
    email { "user.#{SecureRandom.hex(4)}@example.com" }
    password { 'password123' }
    password_confirmation { 'password123' }
    role { 'admin' }
  end
end
