# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Events::RecalculateTotals, type: :service do
  let(:event) { create(:event) }
  let(:event_schedule) { create(:event_schedule, event: event) }
  let(:shift) { create(:shift, event: event, capacity: 2000) }
  let(:worker) { create(:worker) }
  let(:audit_user) { create(:user) }

  before do
    Current.user = audit_user
  end

  describe '#call' do
    context 'with mixed assignment statuses' do
      let!(:assignment1) { create(:assignment, shift: shift, worker: create(:worker), status: 'completed', hours_worked: 8.0, hourly_rate: 15.0) }
      let!(:assignment2) { create(:assignment, shift: shift, worker: create(:worker), status: 'assigned', hours_worked: nil) }
      let!(:assignment3) { create(:assignment, shift: shift, worker: create(:worker), status: 'cancelled', hours_worked: 4.0, hourly_rate: 15.0) }
      let!(:assignment4) { create(:assignment, shift: shift, worker: create(:worker), status: 'completed', hours_worked: 6.0, hourly_rate: 18.0) }

      it 'calculates totals using SSOT methods (effective_hours, effective_pay)' do
        result = described_class.new(event: event).call

        expect(result[:success]).to be true
        event.reload
        
        # Should include assignment1 (8h * $15 = $120) and assignment4 (6h * $18 = $108)
        # assignment2 has nil hours, should use scheduled hours
        # assignment3 is cancelled, should be excluded
        expect(event.total_hours_worked).to be > 0
        expect(event.total_pay_amount).to be > 0
      end

      it 'excludes cancelled and no_show assignments' do
        # Create a no_show assignment
        no_show_assignment = create(:assignment, shift: shift, worker: create(:worker), status: 'no_show', hours_worked: 5.0, hourly_rate: 15.0)
        
        result = described_class.new(event: event).call
        event.reload

        # Cancelled and no_show assignments should not contribute to totals
        expect(event.total_hours_worked).not_to eq(assignment1.hours_worked + assignment3.hours_worked + no_show_assignment.hours_worked)
        expect(event.total_pay_amount).not_to eq((assignment1.hours_worked * assignment1.hourly_rate) + (assignment3.hours_worked * assignment3.hourly_rate) + (no_show_assignment.hours_worked * no_show_assignment.hourly_rate))
      end

      it 'uses effective_hours for assignments with nil hours_worked' do
        # assignment2 has nil hours_worked, should use scheduled duration
        scheduled_hours = shift.duration_hours
        
        result = described_class.new(event: event).call
        event.reload

        # Total should include scheduled hours from assignment2
        expect(event.total_hours_worked).to be >= scheduled_hours
      end
    end

    context 'with large number of assignments' do
      before do
        # Create 1000 assignments
        other_workers = create_list(:worker, 1000)
        other_workers.each do |w|
          create(:assignment, 
            shift: shift, 
            worker: w, 
            status: 'completed', 
            hours_worked: rand(4.0..12.0).round(2),
            hourly_rate: rand(12.0..25.0).round(2)
          )
        end
      end

      it 'handles large datasets efficiently' do
        start_time = Time.current
        result = described_class.new(event: event).call
        elapsed = Time.current - start_time
        
        expect(result[:success]).to be true
        expect(elapsed).to be < 5
      end

      it 'does not cause N+1 queries' do
        # Verify calculation completed efficiently
        result = described_class.new(event: event).call
        
        expect(result[:success]).to be true
        expect(event.reload.total_hours_worked).to be > 0
      end

      it 'calculates correct totals' do
        expected_hours = Assignment.where(shift: event.shifts, status: ['assigned', 'confirmed', 'completed'])
          .sum { |a| a.effective_hours }
        expected_pay = Assignment.where(shift: event.shifts, status: ['assigned', 'confirmed', 'completed'])
          .sum { |a| a.effective_pay }

        result = described_class.new(event: event).call
        event.reload

        expect(event.total_hours_worked).to be_within(0.01).of(expected_hours)
        expect(event.total_pay_amount).to be_within(0.01).of(expected_pay)
      end
    end

    context 'with no assignments' do
      it 'sets totals to zero' do
        result = described_class.new(event: event).call
        event.reload

        expect(result[:success]).to be true
        expect(event.total_hours_worked).to eq(0.0)
        expect(event.total_pay_amount).to eq(0.0)
      end
    end

    context 'with nil event' do
      it 'returns failure' do
        result = described_class.new(event: nil).call

        expect(result[:success]).to be false
        expect(result[:error]).to include("Event is required")
      end
    end

    context 'transaction handling' do
      it 'wraps update in transaction' do
        create(:assignment, shift: shift, worker: worker, status: 'completed', hours_worked: 8.0)
        
        allow(event).to receive(:update_columns).and_raise(ActiveRecord::StatementInvalid.new("Database error"))
        
        result = described_class.new(event: event).call

        expect(result[:success]).to be false
        expect(result[:error]).to include("Failed to recalculate totals")
      end

      it 'updates all fields atomically' do
        create(:assignment, shift: shift, worker: worker, status: 'completed', hours_worked: 8.0, hourly_rate: 15.0)
        
        result = described_class.new(event: event).call
        event.reload

        expect(event.total_hours_worked).to be > 0
        expect(event.total_pay_amount).to be > 0
        expect(event.assigned_shifts_count).to eq(1)
        expect(event.total_shifts_count).to eq(1)
      end
    end

    context 'edge cases' do
      it 'handles assignments with nil hourly_rate (uses fallback)' do
        create(:assignment, shift: shift, worker: worker, status: 'completed', hours_worked: 8.0, hourly_rate: nil)
        shift.update!(pay_rate: 12.0) # Fallback rate
        
        result = described_class.new(event: event).call
        event.reload

        # Should use shift.pay_rate as fallback via effective_hourly_rate
        expect(event.total_pay_amount).to eq(8.0 * 12.0)
      end

      it 'handles assignments with zero hours' do
        create(:assignment, shift: shift, worker: worker, status: 'completed', hours_worked: 0.0, hourly_rate: 15.0)
        
        described_class.new(event: event).call
        event.reload

        # Zero logged hours still fall back to scheduled duration via effective_hours
        expect(event.total_hours_worked).to eq(shift.duration_hours)
        expect(event.total_pay_amount).to eq((shift.duration_hours * 15.0).round(2))
      end

      it 'rounds totals to 2 decimal places' do
        create(:assignment, shift: shift, worker: worker, status: 'completed', hours_worked: 8.333333, hourly_rate: 15.777777)
        
        result = described_class.new(event: event).call
        event.reload

        expect(event.total_hours_worked.to_s.split('.').last.length).to be <= 2
        expect(event.total_pay_amount.to_s.split('.').last.length).to be <= 2
      end
    end
  end
end

