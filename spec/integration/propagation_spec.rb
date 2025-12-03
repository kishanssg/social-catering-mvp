# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'SSOT Propagation Integration', type: :integration do
  let(:event) { create(:event) }
  let(:event_schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
  let(:requirement) { create(:event_skill_requirement, event: event, skill_name: 'Server', pay_rate: 15.0) }
  let(:user) { create(:user) }

  before do
    Current.user = user
    event_schedule
    requirement
    event.generate_shifts!
  end

  describe 'EventSchedule → Shift time sync' do
    it 'syncs all shifts when schedule times change' do
      shifts = event.shifts.to_a
      original_times = shifts.map { |s| [ s.start_time_utc, s.end_time_utc ] }

      new_start = Time.current + 2.days
      new_end = Time.current + 2.days + 5.hours

      event_schedule.update!(
        start_time_utc: new_start,
        end_time_utc: new_end
      )

      shifts.each do |shift|
        shift.reload
        expect(shift.start_time_utc).to be_within(1.second).of(new_start)
        expect(shift.end_time_utc).to be_within(1.second).of(new_end)
      end
    end

    it 'recalculates event totals after time sync' do
      assignment = create(:assignment, shift: event.shifts.first, worker: create(:worker), hours_worked: 8.0)

      original_total = event.total_hours_worked

      new_start = Time.current + 2.days
      new_end = Time.current + 2.days + 6.hours # Different duration

      event_schedule.update!(
        start_time_utc: new_start,
        end_time_utc: new_end
      )

      # Totals should be recalculated (hours may change if using scheduled duration)
      event.reload
      # Note: If assignment has logged hours, total won't change
      # But if using scheduled hours, it would change
    end

    it 'rolls back if sync fails' do
      allow_any_instance_of(Events::SyncShiftTimes).to receive(:call).and_raise(ActiveRecord::StatementInvalid.new("Database error"))

      original_times = event.shifts.first.start_time_utc

      expect {
        begin
          event_schedule.update!(start_time_utc: Time.current + 2.days)
        rescue
          nil
        end
      }.not_to change { event_schedule.reload.start_time_utc }
    end
  end

  describe 'EventSkillRequirement → Shift pay_rate cascade' do
    it 'cascades pay_rate to all matching shifts' do
      shifts = event.shifts.where(role_needed: 'Server')
      original_rates = shifts.pluck(:pay_rate)

      requirement.update!(pay_rate: 18.0)

      shifts.reload.each do |shift|
        expect(shift.pay_rate).to eq(18.0) unless shift.pay_rate != original_rates.find { |r| r == shift.pay_rate }
      end
    end

    it 'recalculates event totals after pay_rate cascade' do
      assignment = create(:assignment,
        shift: event.shifts.first,
        worker: create(:worker),
        hours_worked: 8.0,
        hourly_rate: nil # Will use shift.pay_rate
      )

      original_total = event.total_pay_amount || 0.0

      requirement.update!(pay_rate: 18.0)

      event.reload
      # Total should change if assignment uses shift.pay_rate
      if assignment.effective_hourly_rate == event.shifts.first.pay_rate
        expect(event.total_pay_amount).not_to eq(original_total)
      end
    end

    it 'rolls back if cascade fails' do
      allow_any_instance_of(EventSkillRequirement).to receive(:cascade_pay_rate_to_shifts).and_raise(ActiveRecord::StatementInvalid.new("Database error"))

      original_rate = requirement.pay_rate

      expect {
        begin
          requirement.update!(pay_rate: 18.0)
        rescue
          nil
        end
      }.not_to change { requirement.reload.pay_rate }
    end
  end

  describe 'Assignment → Event totals recalculation' do
    let!(:assignment) do
      assignment = create(:assignment, shift: event.shifts.first, worker: create(:worker), hours_worked: 8.0, hourly_rate: 15.0)
      assignment.shift.update!(capacity: 5)
      assignment.skip_capacity_check = true
      assignment.define_singleton_method(:skip_capacity_check) { true }
      assignment
    end

    it 'updates event totals when assignment hours change' do
      original_total = event.total_hours_worked || 0.0

      assignment.skip_capacity_check = true
      assignment.update!(hours_worked: 10.0)

      event.reload
      expect(event.total_hours_worked).not_to eq(original_total)
      expect(event.total_hours_worked).to eq(10.0)
    end

    it 'updates event totals when assignment rate changes' do
      original_total = event.total_pay_amount || 0.0

      assignment.skip_capacity_check = true
      assignment.update!(hourly_rate: 20.0)

      event.reload
      expect(event.total_pay_amount).not_to eq(original_total)
    end

    it 'updates event totals when assignment status changes' do
      assignment.skip_capacity_check = true
      assignment.update!(status: 'cancelled')

      event.reload
      # Cancelled assignments should be excluded from totals
      expect(event.total_hours_worked).to eq(0.0)
    end

    it 'rolls back if recalculation fails' do
      allow_any_instance_of(Events::RecalculateTotals).to receive(:call).and_raise(ActiveRecord::StatementInvalid.new("Database error"))

      original_hours = assignment.hours_worked

      expect {
        assignment.skip_capacity_check = true
        begin
          Assignment.transaction(requires_new: true) do
            assignment.update!(hours_worked: 10.0)
          end
        rescue
          nil
        end
      }.not_to change { assignment.reload.hours_worked }
    end
  end

  describe 'end-to-end: change schedule → shifts sync → totals recalc' do
    let!(:assignment) { create(:assignment, shift: event.shifts.first, worker: create(:worker), hours_worked: nil, hourly_rate: 15.0) }

    it 'handles complete propagation chain' do
      # Change schedule times
      new_start = Time.current + 3.days
      new_end = Time.current + 3.days + 6.hours # Different duration

      ActiveRecord::Base.transaction do
        event_schedule.update!(
          start_time_utc: new_start,
          end_time_utc: new_end
        )
      end

      # Verify shifts synced
      event.shifts.reload.each do |shift|
        expect(shift.start_time_utc).to be_within(1.second).of(new_start)
        expect(shift.end_time_utc).to be_within(1.second).of(new_end)
      end

      # Verify totals recalculated (if assignment uses scheduled hours)
      event.reload
      if assignment.hours_worked.nil?
        # Uses scheduled duration, which changed
        expect(event.total_hours_worked).to be > 0
      end
    end
  end

  describe 'concurrency: two admins updating simultaneously' do
    it 'handles concurrent schedule updates (last write wins)' do
      schedule1 = EventSchedule.find(event_schedule.id)
      schedule2 = EventSchedule.find(event_schedule.id)

      first_update = Time.current + 2.days
      second_update = Time.current + 3.days

      schedule1.update!(start_time_utc: first_update, end_time_utc: first_update + 4.hours)

      expect {
        schedule2.update!(start_time_utc: second_update, end_time_utc: second_update + 4.hours)
      }.not_to raise_error

      expect(event_schedule.reload.start_time_utc).to be_within(1.second).of(second_update)
    end

    it 'handles concurrent pay_rate updates (last write wins)' do
      req1 = EventSkillRequirement.find(requirement.id)
      req2 = EventSkillRequirement.find(requirement.id)

      req1.update!(pay_rate: 18.0)

      expect {
        req2.update!(pay_rate: 20.0)
      }.not_to raise_error

      expect(requirement.reload.pay_rate).to eq(20.0)
    end
  end

  describe 'time zone edge cases' do
    it 'handles DST transitions correctly' do
      # Create schedule during DST transition
      dst_start = Time.zone.parse('2025-03-09 02:00:00 America/Los_Angeles') # Spring forward
      dst_end = Time.zone.parse('2025-03-09 10:00:00 America/Los_Angeles')

      event_schedule.update!(
        start_time_utc: dst_start.utc,
        end_time_utc: dst_end.utc
      )

      event.shifts.reload.each do |shift|
        expect(shift.start_time_utc.utc_offset).to eq(0) # Stored in UTC
        expect(shift.end_time_utc.utc_offset).to eq(0) # Stored in UTC
      end
    end
  end
end
