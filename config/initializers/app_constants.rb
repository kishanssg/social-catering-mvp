# config/initializers/app_constants.rb

# Only define if not already defined (prevents warning on reload)
unless defined?(AppConstants)
  # Pay rate defaults
  DEFAULT_PAY_RATE = 12.0 # Minimum wage fallback

  # Assignment statuses that exclude from calculations
  EXCLUDED_ASSIGNMENT_STATUSES = [ "cancelled", "no_show" ].freeze

  # Valid assignment statuses
  VALID_ASSIGNMENT_STATUSES = [ "assigned", "confirmed", "completed" ].freeze

  # Event statuses
  EVENT_STATUSES = [ "draft", "published", "completed", "cancelled" ].freeze

  # Create module and make constants available
  AppConstants = Module.new do
    const_set(:DEFAULT_PAY_RATE, DEFAULT_PAY_RATE)
    const_set(:EXCLUDED_ASSIGNMENT_STATUSES, EXCLUDED_ASSIGNMENT_STATUSES)
    const_set(:VALID_ASSIGNMENT_STATUSES, VALID_ASSIGNMENT_STATUSES)
    const_set(:EVENT_STATUSES, EVENT_STATUSES)
  end
end
