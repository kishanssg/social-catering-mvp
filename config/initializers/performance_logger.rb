# frozen_string_literal: true

# Configure performance logging middleware
# Only enable in development and production (not test)
unless Rails.env.test?
  require Rails.root.join('app', 'middleware', 'performance_logger')
  Rails.application.config.middleware.insert_before Rack::Runtime, PerformanceLogger
end

