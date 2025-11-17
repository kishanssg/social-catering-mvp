# spec/support/matchers/make_database_queries.rb

module DatabaseQueryMatchers
  IGNORED_PAYLOAD_NAMES = %w[SCHEMA TRANSACTION].freeze
  IGNORED_SQL_PATTERNS = [
    /\A(?:BEGIN|COMMIT|ROLLBACK)\b/i,
    /sqlite_master/i,
    /pg_tables/i
  ].freeze

  def self.count_queries
    count = 0
    callback = lambda do |_name, _start, _finish, _id, payload|
      sql = payload[:sql]
      next if payload[:name]&.in?(IGNORED_PAYLOAD_NAMES)
      next if sql.nil?
      next if IGNORED_SQL_PATTERNS.any? { |pattern| sql.match?(pattern) }

      count += 1
    end

    ActiveSupport::Notifications.subscribed(callback, 'sql.active_record') do
      yield
    end

    count
  end
end

RSpec::Matchers.define :make_database_queries do |expected|
  supports_block_expectations

  match do |actual|
    raise ArgumentError, 'make_database_queries requires a block' unless actual.respond_to?(:call)

    @expected_count = expected.is_a?(Hash) ? expected[:count] : expected
    range = case @expected_count
            when Range then @expected_count
            when Integer then @expected_count..@expected_count
            when nil then 0..Float::INFINITY
            else
              raise ArgumentError, "Unsupported expected value: #{expected.inspect}"
            end

    @actual_count = DatabaseQueryMatchers.count_queries { actual.call }
    range.cover?(@actual_count)
  end

  failure_message do
    "expected block to make #{@expected_count.inspect} database queries, but made #{@actual_count}"
  end
end

