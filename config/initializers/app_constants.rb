# config/initializers/app_constants.rb

# Only define if not already defined (prevents warning on reload)
unless defined?(AppConstants)
  module AppConstants
    # Pay rate defaults
    DEFAULT_PAY_RATE = 12.0 # Minimum wage fallback
    
    # Assignment statuses that exclude from calculations
    EXCLUDED_ASSIGNMENT_STATUSES = ['cancelled', 'no_show'].freeze
    
    # Valid assignment statuses
    VALID_ASSIGNMENT_STATUSES = ['assigned', 'confirmed', 'completed'].freeze
    
    # Event statuses
    EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'].freeze
    
    # Add other constants as needed
  end

  # Make constants globally available
  Object.const_set(:AppConstants, AppConstants)
end

