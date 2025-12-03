# spec/rails_helper.rb

require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
require 'active_support/testing/assertions'
Dir[Rails.root.join('spec/support/**/*.rb')].sort.each { |f| require f }
abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  # Include FactoryBot methods
  config.include FactoryBot::Syntax::Methods
  config.include ActiveSupport::Testing::Assertions

  # Include Devise test helpers
  config.include Devise::Test::IntegrationHelpers, type: :request
  config.include Devise::Test::ControllerHelpers, type: :controller

  # Database cleaner + seed data
  config.before(:suite) do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.clean_with(:truncation)

    @seed_user = FactoryBot.create(
      :user,
      email: 'system_spec_user@example.com',
      password: 'password123'
    )
    puts "✅ Created seed user: #{@seed_user.email} (ID: #{@seed_user.id})"
  end

  config.before(:each) do |example|
    DatabaseCleaner.strategy = example.metadata[:type] == :system ? :truncation : :transaction
    DatabaseCleaner.start
    Current.user = User.first || FactoryBot.create(:user)
  end

  config.after(:each) do
    DatabaseCleaner.clean
    Current.user = nil
  end
end

# Shoulda matchers configuration
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
