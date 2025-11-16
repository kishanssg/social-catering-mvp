# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Events::RecalculateTotals, type: :service do
  let(:event) { create(:event, status: 'published') }
  let(:shift) { create(:shift, event: event, pay_rate: 20.0) }
  let(:worker) { create(:worker) }

  before do
    # Create assignments with various scenarios
    create(:assignment, shift: shift, worker: worker, hours_worked: 8.0, hourly_rate: 20.0, status: 'assigned')
    create(:assignment, shift: shift, worker: create(:worker), hours_worked: nil, hourly_rate: nil, status: 'assigned') # Uses shift duration
    create(:assignment, shift: shift, worker: create(:worker), hours_worked: 4.0, hourly_rate: 25.0, status: 'no_show') # Excluded
  end

  describe 'Ruby vs SQL aggregation parity' do
    it 'produces identical results' do
      # Calculate with Ruby (default)
      original_env = ENV['USE_SQL_TOTALS']
      ENV['USE_SQL_TOTALS'] = nil
      Rails.configuration.x.use_sql_totals = false
      
      result_ruby = Events::RecalculateTotals.new(event: event).call
      hours_ruby = event.reload.total_hours_worked
      pay_ruby = event.reload.total_pay_amount
      
      # Reset event totals
      event.update_columns(total_hours_worked: 0, total_pay_amount: 0)
      
      # Calculate with SQL
      ENV['USE_SQL_TOTALS'] = 'true'
      Rails.configuration.x.use_sql_totals = true
      
      result_sql = Events::RecalculateTotals.new(event: event).call
      hours_sql = event.reload.total_hours_worked
      pay_sql = event.reload.total_pay_amount
      
      # Restore original env
      ENV['USE_SQL_TOTALS'] = original_env
      
      # Results should match (within rounding tolerance)
      expect(hours_sql).to be_within(0.01).of(hours_ruby)
      expect(pay_sql).to be_within(0.01).of(pay_ruby)
    end
  end
end

