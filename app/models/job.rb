# Alias for backward compatibility
# TODO: Remove after full migration to Event
class Job < Event
  # This allows existing code using Job.find to still work
  # while we transition to using Event
end
