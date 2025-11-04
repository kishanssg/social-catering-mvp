# spec/factories/users.rb

FactoryBot.define do
  factory :user do
    email { "user.#{SecureRandom.hex(4)}@example.com" }
    password { 'password123' }
    password_confirmation { 'password123' }
    first_name { 'Admin' }
    last_name { 'User' }
    role { 'admin' }
  end
end
