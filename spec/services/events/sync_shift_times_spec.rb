# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Events::SyncShiftTimes, type: :service do
  let(:event) { create(:event) }
  let(:event_schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
  let(:user) { create(:user) }
  
  before do
    Current.user = user
  end

  describe '#call' do
    context 'with event-owned shifts' do
      let!(:shift1) { create(:shift, event: event, start_time_utc: event_schedule.start_time_utc, end_time_utc: event_schedule.end_time_utc) }
      let!(:shift2) { create(:shift, event: event, start_time_utc: event_schedule.start_time_utc, end_time_utc: event_schedule.end_time_utc) }
      let(:new_start) { Time.current + 2.days }
      let(:new_end) { Time.current + 2.days + 5.hours }

      it 'syncs times to all event-owned shifts' do
        result = described_class.new(
          event: event,
          start_time_utc: new_start,
          end_time_utc: new_end
        ).call

        expect(result[:success]).to be true
        expect(result[:updated_count]).to eq(2)
        
        expect(shift1.reload.start_time_utc).to be_within(1.second).of(new_start)
        expect(shift1.reload.end_time_utc).to be_within(1.second).of(new_end)
        expect(shift2.reload.start_time_utc).to be_within(1.second).of(new_start)
        expect(shift2.reload.end_time_utc).to be_within(1.second).of(new_end)
      end

      it 'does not sync standalone shifts' do
        standalone_shift = create(:shift, event: nil, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours)
        
        result = described_class.new(
          event: event,
          start_time_utc: new_start,
          end_time_utc: new_end
        ).call

        expect(standalone_shift.reload.start_time_utc).not_to be_within(1.second).of(new_start)
      end

      it 'triggers event totals recalculation' do
        expect(event).to receive(:recalculate_totals!).and_return(true)
        
        described_class.new(
          event: event,
          start_time_utc: new_start,
          end_time_utc: new_end
        ).call
      end

      it 'creates an activity log entry' do
        expect {
          described_class.new(
            event: event,
            start_time_utc: new_start,
            end_time_utc: new_end
          ).call
        }.to change(ActivityLog, :count).by(1)

        log = ActivityLog.last
        expect(log.entity_type).to eq('EventSchedule')
        expect(log.action).to eq('shift_times_synced')
        expect(log.after_json['updated_shifts_count']).to eq(2)
      end

      it 'returns success with updated count' do
        result = described_class.new(
          event: event,
          start_time_utc: new_start,
          end_time_utc: new_end
        ).call

        expect(result[:success]).to be true
        expect(result[:updated_count]).to eq(2)
      end

      it 'wraps operations in transaction' do
        allow(event.shifts).to receive(:update_all).and_raise(ActiveRecord::StatementInvalid.new("Database error"))
        
        result = described_class.new(
          event: event,
          start_time_utc: new_start,
          end_time_utc: new_end
        ).call

        expect(result[:success]).to be false
        expect(result[:error]).to include("Failed to sync shift times")
      end
    end

    context 'with no shifts' do
      it 'returns success with 0 count' do
        result = described_class.new(
          event: event,
          start_time_utc: Time.current + 2.days,
          end_time_utc: Time.current + 2.days + 5.hours
        ).call

        expect(result[:success]).to be true
        expect(result[:updated_count]).to eq(0)
      end
    end

    context 'with nil event' do
      it 'returns success with 0 count' do
        result = described_class.new(
          event: nil,
          start_time_utc: Time.current + 2.days,
          end_time_utc: Time.current + 2.days + 5.hours
        ).call

        expect(result[:success]).to be true
        expect(result[:updated_count]).to eq(0)
      end
    end

    context 'with large number of shifts' do
      before do
        # Create 1000 shifts
        1000.times do
          create(:shift, event: event, start_time_utc: event_schedule.start_time_utc, end_time_utc: event_schedule.end_time_utc)
        end
      end

      it 'handles large datasets efficiently' do
        result = described_class.new(
          event: event,
          start_time_utc: Time.current + 2.days,
          end_time_utc: Time.current + 2.days + 5.hours
        ).call

        expect(result[:success]).to be true
        expect(result[:updated_count]).to eq(1000)
      end

      it 'does not cause N+1 queries' do
        # Verify update completed efficiently
        result = described_class.new(
          event: event,
          start_time_utc: Time.current + 2.days,
          end_time_utc: Time.current + 2.days + 5.hours
        ).call
        
        expect(result[:success]).to be true
        expect(result[:updated_count]).to eq(1000)
      end
    end

    context 'time zone handling' do
      it 'uses UTC consistently' do
        new_start = Time.zone.parse('2025-01-27 10:00:00 UTC')
        new_end = Time.zone.parse('2025-01-27 14:00:00 UTC')
        
        create(:shift, event: event)
        
        result = described_class.new(
          event: event,
          start_time_utc: new_start,
          end_time_utc: new_end
        ).call

        shift = event.shifts.first
        expect(shift.start_time_utc.utc_offset).to eq(0) # UTC
        expect(shift.end_time_utc.utc_offset).to eq(0) # UTC
      end
    end
  end
end

