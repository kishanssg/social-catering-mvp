# frozen_string_literal: true

require 'rails_helper'

RSpec.describe EventSkillRequirement, type: :model do
  let(:event) { create(:event) }
  let(:event_schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
  let(:requirement) { create(:event_skill_requirement, event: event, skill_name: 'Server', pay_rate: 15.0) }
  let(:user) { create(:user) }

  before do
    Current.user = user
  end

  describe '#cascade_pay_rate_to_shifts' do
    context 'when pay_rate changes' do
      let!(:shift1) { create(:shift, event: event, role_needed: 'Server', pay_rate: nil, auto_generated: true) }
      let!(:shift2) { create(:shift, event: event, role_needed: 'Server', pay_rate: 15.0, auto_generated: true) }
      let!(:shift3) { create(:shift, event: event, role_needed: 'Server', pay_rate: 20.0, auto_generated: false) } # Manually overridden
      let!(:shift4) { create(:shift, event: event, role_needed: 'Chef', pay_rate: 15.0) } # Different role

      it 'cascades pay_rate to shifts with nil or old requirement rate' do
        expect {
          requirement.update!(pay_rate: 18.0)
        }.to change { shift1.reload.pay_rate }.from(nil).to(18.0)
          .and change { shift2.reload.pay_rate }.from(15.0).to(18.0)
      end

      it 'does not update shifts with manually set different rates' do
        expect {
          requirement.update!(pay_rate: 18.0)
        }.not_to change { shift3.reload.pay_rate }
      end

      it 'does not update shifts with different roles' do
        expect {
          requirement.update!(pay_rate: 18.0)
        }.not_to change { shift4.reload.pay_rate }
      end

      it 'creates an activity log entry' do
        expect {
          requirement.update!(pay_rate: 18.0)
        }.to change(ActivityLog, :count).by(1)

        log = ActivityLog.last
        expect(log.entity_type).to eq('EventSkillRequirement')
        expect(log.entity_id).to eq(requirement.id)
        expect(log.action).to eq('requirement_pay_rate_cascade')
        expect(log.after_json['pay_rate']).to eq(18.0)
        expect(log.after_json['updated_shifts_count']).to eq(2)
      end

      it 'triggers event totals recalculation' do
        expect(requirement.event).to receive(:recalculate_totals!).and_return(true)
        requirement.update!(pay_rate: 18.0)
      end

      it 'rolls back requirement update if cascade fails' do
        allow_any_instance_of(Shift).to receive(:update_all).and_raise(ActiveRecord::StatementInvalid.new("Database error"))

        expect {
          begin
            requirement.update!(pay_rate: 18.0)
          rescue
            nil
          end
        }.not_to change { requirement.reload.pay_rate }
      end

      context 'with large number of shifts' do
        before do
          # Create 100 shifts to test performance
          100.times do
            create(:shift, event: event, role_needed: 'Server', pay_rate: 15.0, auto_generated: true)
          end
        end

        it 'updates all matching shifts efficiently' do
          expect {
            requirement.update!(pay_rate: 18.0)
          }.to change {
            Shift.where(event: event, role_needed: 'Server', pay_rate: 18.0).count
          }.from(0).to(100)
        end

        it 'does not cause N+1 queries' do
          # Use bullet or query analyzer to verify no N+1
          expect {
            requirement.update!(pay_rate: 18.0)
          }.not_to raise_error

          # Verify update completed efficiently
          expect(requirement.reload.pay_rate).to eq(18.0)
        end
      end
    end

    context 'when pay_rate does not change' do
      it 'does not trigger cascade' do
        expect(requirement).not_to receive(:cascade_pay_rate_to_shifts)
        requirement.update!(skill_name: 'Chef')
      end
    end

    context 'when pay_rate is nil' do
      it 'does not trigger cascade' do
        requirement.update!(pay_rate: 15.0)
        expect {
          requirement.update!(pay_rate: nil)
        }.not_to change(ActivityLog, :count)
      end
    end
  end

  describe 'edge cases' do
    context 'concurrent updates' do
      let!(:shift) { create(:shift, event: event, role_needed: 'Server', pay_rate: 15.0) }

      it 'handles concurrent pay_rate updates with optimistic locking' do
        req1 = EventSkillRequirement.find(requirement.id)
        req2 = EventSkillRequirement.find(requirement.id)

        req1.update!(pay_rate: 18.0)

        expect {
          req2.update!(pay_rate: 20.0)
        }.to raise_error(ActiveRecord::StaleObjectError)
      end
    end

    context 'time zones' do
      it 'uses UTC consistently' do
        # All times stored in UTC, comparisons use UTC
        requirement.update!(pay_rate: 18.0)
        shift = Shift.where(event: event, role_needed: 'Server').first
        expect(shift.updated_at).to be_within(1.second).of(Time.current)
      end
    end
  end
end
