# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Assignment, type: :model do
  let(:event) { create(:event) }
  let(:shift) { create(:shift, event: event) }
  let(:worker) { create(:worker) }
  let(:assignment) { create(:assignment, shift: shift, worker: worker, status: 'assigned', hours_worked: 8.0, hourly_rate: 15.0) }

  describe 'event totals recalculation callbacks' do
    before do
      # Set up event with initial totals
      Events::RecalculateTotals.new(event: event).call
      event.reload
    end

    context 'on create' do
      it 'triggers event totals recalculation' do
        expect(Events::RecalculateTotals).to receive(:new).with(event: event).and_return(double(call: { success: true, event: event }))
        
        create(:assignment, shift: shift, worker: create(:worker), status: 'assigned', hours_worked: 5.0, hourly_rate: 18.0)
      end

      it 'updates event totals after creation' do
        initial_hours = event.total_hours_worked || 0
        initial_pay = event.total_pay_amount || 0
        
        new_assignment = create(:assignment, shift: shift, worker: create(:worker), status: 'assigned', hours_worked: 5.0, hourly_rate: 18.0)
        event.reload
        
        expect(event.total_hours_worked).to be > initial_hours
        expect(event.total_pay_amount).to be > initial_pay
      end
    end

    context 'on update' do
      it 'triggers recalculation when hours_worked changes' do
        expect(Events::RecalculateTotals).to receive(:new).with(event: event).and_return(double(call: { success: true, event: event }))
        
        assignment.update!(hours_worked: 10.0)
      end

      it 'triggers recalculation when hourly_rate changes' do
        expect(Events::RecalculateTotals).to receive(:new).with(event: event).and_return(double(call: { success: true, event: event }))
        
        assignment.update!(hourly_rate: 20.0)
      end

      it 'triggers recalculation when status changes' do
        expect(Events::RecalculateTotals).to receive(:new).with(event: event).and_return(double(call: { success: true, event: event }))
        
        assignment.update!(status: 'completed')
      end

      it 'triggers recalculation when shift_id changes' do
        new_shift = create(:shift, event: event)
        expect(Events::RecalculateTotals).to receive(:new).with(event: event).at_least(:once).and_return(double(call: { success: true, event: event }))
        
        assignment.update!(shift_id: new_shift.id)
      end

      it 'does not trigger recalculation for unrelated fields' do
        expect(Events::RecalculateTotals).not_to receive(:new)
        
        assignment.update!(updated_at: Time.current)
      end

      it 'updates event totals after hours change' do
        initial_pay = event.total_pay_amount || 0
        
        assignment.update!(hours_worked: 10.0)
        event.reload
        
        expect(event.total_pay_amount).to be > initial_pay
      end
    end

    context 'on destroy' do
      it 'triggers event totals recalculation' do
        expect(Events::RecalculateTotals).to receive(:new).with(event: event).and_return(double(call: { success: true, event: event }))
        
        assignment.destroy
      end

      it 'updates event totals after destruction' do
        initial_hours = event.total_hours_worked || 0
        
        assignment.destroy
        event.reload
        
        expect(event.total_hours_worked).to be < initial_hours
      end
    end

    context 'transaction safety' do
      it 'rolls back totals update if assignment update fails' do
        initial_hours = event.total_hours_worked || 0
        
        expect {
          begin
            assignment.update!(hours_worked: 10.0, shift_id: nil) # Invalid - shift_id required
          rescue
            nil
          end
        }.not_to change { event.reload.total_hours_worked }
      end
    end

    context 'with no_show and cancelled statuses' do
      it 'excludes no_show assignments from totals' do
        no_show_assignment = create(:assignment, shift: shift, worker: create(:worker), status: 'no_show', hours_worked: 5.0, hourly_rate: 15.0)
        event.reload
        
        # No-show should not contribute to totals
        expect(event.total_hours_worked).not_to include(no_show_assignment.hours_worked)
      end

      it 'excludes cancelled assignments from totals' do
        cancelled_assignment = create(:assignment, shift: shift, worker: create(:worker), status: 'cancelled', hours_worked: 5.0, hourly_rate: 15.0)
        event.reload
        
        # Cancelled should not contribute to totals
        expect(event.total_hours_worked).not_to include(cancelled_assignment.hours_worked)
      end
    end
  end
end

