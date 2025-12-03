# spec/edge_cases/capacity_edge_cases_spec.rb

require 'rails_helper'

RSpec.describe 'Capacity Edge Cases', type: :model do
  before do
    Current.user = create(:user)
  end

  def create_assignment_bypassing_capacity(attrs = {})
    assignment = build(:assignment, **attrs)
    assignment.skip_capacity_check = true
    assignment.save(validate: false) || raise(ActiveRecord::RecordInvalid, assignment)
    assignment
  end
  describe 'Shift capacity calculations' do
    context 'zero capacity shifts' do
      let(:shift) { build(:shift, capacity: 0) }

      it 'is invalid' do
        expect(shift).not_to be_valid
        expect(shift.errors[:capacity]).to include('must be greater than 0')
      end
    end

    context 'negative capacity shifts' do
      let(:shift) { build(:shift, capacity: -1) }

      it 'is invalid' do
        expect(shift).not_to be_valid
        expect(shift.errors[:capacity]).to include('must be greater than 0')
      end
    end

    context 'very large capacity shifts' do
      let(:shift) { create(:shift, capacity: 1000) }

      it 'calculates staffing progress correctly' do
        progress = shift.staffing_progress
        expect(progress[:required]).to eq(1000)
        expect(progress[:assigned]).to eq(0)
        expect(progress[:percentage]).to eq(0)
      end

      it 'handles partial assignments correctly' do
        create_list(:assignment, 500, shift: shift, status: 'confirmed')

        progress = shift.staffing_progress
        expect(progress[:required]).to eq(1000)
        expect(progress[:assigned]).to eq(500)
        expect(progress[:percentage]).to eq(50)
      end
    end

    context 'capacity exactly at assignment count' do
      let(:shift) { create(:shift, capacity: 3) }

      before do
        create_list(:assignment, 3, shift: shift, status: 'confirmed')
      end

      it 'shows as fully staffed' do
        expect(shift.fully_staffed?).to be true
        expect(shift.staffing_progress[:percentage]).to eq(100)
      end
    end

    context 'over-capacity assignments' do
      let(:shift) { create(:shift, capacity: 2) }

      before do
        2.times { create(:assignment, shift: shift, status: 'confirmed') }
        create_assignment_bypassing_capacity(shift: shift, status: 'confirmed')
      end

      it 'still shows as fully staffed' do
        expect(shift.fully_staffed?).to be true
        expect(shift.staffing_progress[:percentage]).to eq(150) # 3/2 * 100
      end
    end
  end

  describe 'Event skill requirement vs shift capacity consistency' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 5) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }

    before do
      event.generate_shifts!
    end

    it 'creates individual shifts with capacity 1' do
      server_shifts = event.shifts.where(role_needed: 'Server')

      expect(server_shifts.count).to eq(5)
      server_shifts.each do |shift|
        expect(shift.capacity).to eq(1)
        expect(shift.staffing_progress[:required]).to eq(1)
      end
    end

    it 'maintains consistency between event-level and shift-level calculations' do
      # Assign workers to some shifts
      event.shifts.where(role_needed: 'Server').limit(3).each do |shift|
        create(:assignment, shift: shift, status: 'confirmed')
      end

      # Event-level calculation
      event_progress = event.staffing_progress
      expect(event_progress[:assigned]).to eq(3)
      expect(event_progress[:required]).to eq(5)
      expect(event_progress[:percentage]).to eq(60)

      # Individual shift calculations
      event.shifts.where(role_needed: 'Server').each_with_index do |shift, index|
        if index < 3
          expect(shift.staffing_progress[:assigned]).to eq(1)
          expect(shift.staffing_progress[:percentage]).to eq(100)
          expect(shift.fully_staffed?).to be true
        else
          expect(shift.staffing_progress[:assigned]).to eq(0)
          expect(shift.staffing_progress[:percentage]).to eq(0)
          expect(shift.fully_staffed?).to be false
        end
      end
    end
  end

  describe 'Assignment status edge cases' do
    let(:shift) { create(:shift, capacity: 2) }

    context 'mixed assignment statuses' do
      before do
        create(:assignment, shift: shift, status: 'confirmed')
        create(:assignment, shift: shift, status: 'assigned')
        create_assignment_bypassing_capacity(shift: shift, status: 'cancelled')
        create_assignment_bypassing_capacity(shift: shift, status: 'no_show')
      end

      it 'counts all persisted assignments toward staffing (current invariant)' do
        progress = shift.staffing_progress
        expect(progress[:assigned]).to eq(4)
        expect(progress[:percentage]).to eq(200)
        expect(shift.fully_staffed?).to be true
      end
    end

    context 'all assignments cancelled or no_show' do
      before do
        create_assignment_bypassing_capacity(shift: shift, status: 'cancelled')
        create_assignment_bypassing_capacity(shift: shift, status: 'no_show')
      end

      it 'still reports staffing based on total assignment records' do
        progress = shift.staffing_progress
        expect(progress[:assigned]).to eq(2)
        expect(progress[:percentage]).to eq(100)
        expect(shift.fully_staffed?).to be true
      end
    end

    context 'all assignments completed' do
      before do
        create(:assignment, shift: shift, status: 'completed')
        create_assignment_bypassing_capacity(shift: shift, status: 'completed')
      end

      it 'treats completed work as staffed' do
        progress = shift.staffing_progress
        expect(progress[:assigned]).to eq(2)
        expect(progress[:percentage]).to eq(100)
        expect(shift.fully_staffed?).to be true
      end
    end
  end

  describe 'Time boundary edge cases' do
    context 'shifts with identical start and end times' do
      let(:time) { Time.current + 1.day }
      let(:shift) { build(:shift, start_time_utc: time, end_time_utc: time) }

      it 'is invalid' do
        expect(shift).not_to be_valid
        expect(shift.errors[:end_time_utc]).to include('must be after start time')
      end
    end

    context 'shifts with end time before start time' do
      let(:shift) { build(:shift, start_time_utc: Time.current + 1.day, end_time_utc: Time.current) }

      it 'is invalid' do
        expect(shift).not_to be_valid
        expect(shift.errors[:end_time_utc]).to include('must be after start time')
      end
    end

    context 'very short shifts' do
      let(:shift) { create(:shift, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 1.minute) }

      it 'is valid and calculates correctly' do
        expect(shift).to be_valid
        expect(shift.staffing_progress[:required]).to eq(1)
      end
    end

    context 'very long shifts' do
      let(:shift) { create(:shift, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 24.hours) }

      it 'is valid and calculates correctly' do
        expect(shift).to be_valid
        expect(shift.staffing_progress[:required]).to eq(1)
      end
    end
  end

  describe 'Concurrent assignment edge cases' do
    let(:shift) { create(:shift, capacity: 1) }
    let(:worker1) { create(:worker, skills_json: [ 'Server' ]) }
    let(:worker2) { create(:worker, skills_json: [ 'Server' ]) }

    context 'simultaneous assignment attempts' do
      it 'prevents double assignment through advisory locks' do
        # Simulate concurrent assignment attempts
        threads = []
        results = []

        2.times do |i|
          threads << Thread.new do
            begin
              Assignment.transaction do
                conn = ActiveRecord::Base.connection
                conn.execute("SELECT pg_advisory_lock(#{worker1.id})")

                # Check for conflicts
                conflicts = Assignment.joins(:shift)
                  .where(worker_id: worker1.id, status: 'confirmed')
                  .where("shifts.start_time_utc < ? AND shifts.end_time_utc > ?",
                         shift.end_time_utc, shift.start_time_utc)
                  .lock("FOR UPDATE")

                if conflicts.exists?
                  results << "conflict"
                else
                  # Check capacity
                  assigned = Assignment.where(shift_id: shift.id, status: 'confirmed').count
                  if assigned >= shift.capacity
                    results << "capacity_full"
                  else
                    Assignment.create!(
                      shift: shift, worker: worker1, assigned_by: create(:user),
                      assigned_at_utc: Time.current, status: 'confirmed'
                    )
                    results << "success"
                  end
                end
              ensure
                conn.execute("SELECT pg_advisory_unlock(#{worker1.id})")
              end
            rescue => e
              results << "error: #{e.message}"
            end
          end
        end

        threads.each(&:join)

        # Only one should succeed
        expect(results.count("success")).to eq(1)
        expect(shift.assignments.count).to eq(1)
      end
    end
  end

  describe 'Data integrity edge cases' do
    context 'shift without event' do
      let(:shift) { create(:shift, event: nil) }

      it 'calculates staffing correctly' do
        expect(shift.staffing_progress[:required]).to eq(1)
        expect(shift.staffing_progress[:assigned]).to eq(0)
        expect(shift.fully_staffed?).to be false
      end
    end

    context 'shift with deleted event' do
      let(:event) { create(:event) }
      let(:shift) { create(:shift, event: event) }

      before do
        # Events are soft-deleted via status to preserve FK integrity
        event.update!(status: 'deleted')
      end

      it 'maintains shift data integrity while event is soft-deleted' do
        expect(shift.reload).to be_present
        expect(shift.event.status).to eq('deleted')
        expect(shift.staffing_progress[:required]).to eq(1)
      end
    end

    context 'assignment with deleted worker' do
      let(:worker) { create(:worker) }
      let(:assignment) { create(:assignment, worker: worker) }

      before do
        # Workers with history are deactivated instead of hard-deleted
        worker.update!(active: false)
      end

      it 'keeps assignment linked to inactive worker for audit trail' do
        expect(assignment.reload.worker).to eq(worker)
        expect(worker.active).to be false
      end
    end
  end
end
