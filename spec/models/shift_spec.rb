# spec/models/shift_spec.rb

require 'rails_helper'

RSpec.describe Shift, type: :model do
  def create_assignment_bypassing_capacity(attrs = {})
    assignment = build(:assignment, **attrs)
    assignment.skip_capacity_check = true
    assignment.save(validate: false) || raise(ActiveRecord::RecordInvalid, assignment)
    assignment
  end
  describe 'validations' do
    it { should validate_presence_of(:role_needed) }
    it { should validate_presence_of(:start_time_utc) }
    it { should validate_presence_of(:end_time_utc) }
    it { should validate_presence_of(:capacity) }

    it 'validates capacity is positive' do
      shift = build(:shift, capacity: 0)
      expect(shift).not_to be_valid
      expect(shift.errors[:capacity]).to include('must be greater than 0')
    end

    it 'validates end_time_utc is after start_time_utc' do
      shift = build(:shift,
        start_time_utc: Time.current,
        end_time_utc: Time.current - 1.hour
      )
      expect(shift).not_to be_valid
      expect(shift.errors[:end_time_utc]).to include('must be after start time')
    end
  end

  describe 'associations' do
    it { should belong_to(:event).optional }
    it { should have_many(:assignments).dependent(:destroy) }
  end

  describe '#staffing_progress - THE CRITICAL TEST' do
    context 'standalone shift (no event)' do
      let(:shift) { create(:shift, capacity: 3, event: nil) }

      it 'uses shift capacity as required_count' do
        progress = shift.staffing_progress
        expect(progress[:required]).to eq(3)
        expect(progress[:assigned]).to eq(0)
        expect(progress[:percentage]).to eq(0)
      end

      context 'with assignments' do
        before do
          create_list(:assignment, 2, shift: shift, status: 'assigned')
        end

        it 'calculates correct progress' do
          progress = shift.staffing_progress
          expect(progress[:required]).to eq(3)
          expect(progress[:assigned]).to eq(2)
          expect(progress[:percentage]).to eq(67)
        end
      end
    end

    context 'event-based shift' do
      let(:event) { create(:event) }
      let(:skill_requirement) { create(:event_skill_requirement,
        event: event,
        skill_name: 'Server',
        needed_workers: 5  # Role needs 5 total workers
      )}

      context 'shift with capacity=1' do
        let(:shift) { create(:shift,
          event: event,
          role_needed: 'Server',
          capacity: 1,  # Individual shift capacity
          event_skill_requirement: skill_requirement
        )}

        it 'uses SHIFT capacity (1), NOT role requirement (5)' do
          progress = shift.staffing_progress
          expect(progress[:required]).to eq(1),
            'Should use shift capacity, not skill_requirement.needed_workers'
          expect(progress[:assigned]).to eq(0)
        end

        context 'when 1 worker assigned' do
          before do
            create(:assignment, shift: shift, status: 'assigned')
          end

          it 'shows shift as fully staffed' do
            progress = shift.staffing_progress
            expect(progress[:required]).to eq(1)
            expect(progress[:assigned]).to eq(1)
            expect(progress[:percentage]).to eq(100)
            expect(shift.fully_staffed?).to be true
          end
        end
      end

      context 'shift with capacity=2' do
        let(:shift) { create(:shift,
          event: event,
          role_needed: 'Server',
          capacity: 2,
          event_skill_requirement: skill_requirement
        )}

        it 'uses shift capacity (2)' do
          progress = shift.staffing_progress
          expect(progress[:required]).to eq(2)
        end

        context 'when 1 worker assigned' do
          before do
            create(:assignment, shift: shift, status: 'assigned')
          end

          it 'shows shift as 50% staffed' do
            progress = shift.staffing_progress
            expect(progress[:percentage]).to eq(50)
            expect(shift.fully_staffed?).to be false
          end
        end

        context 'when 2 workers assigned' do
          before do
            create_list(:assignment, 2, shift: shift, status: 'assigned')
          end

          it 'shows shift as fully staffed' do
            progress = shift.staffing_progress
            expect(progress[:percentage]).to eq(100)
            expect(shift.fully_staffed?).to be true
          end
        end
      end
    end
  end

  describe '#fully_staffed?' do
    let(:shift) { create(:shift, capacity: 2) }

    context 'no assignments' do
      it 'returns false' do
        expect(shift.fully_staffed?).to be false
      end
    end

    context 'partial assignments' do
      before do
        create(:assignment, shift: shift, status: 'assigned')
      end

      it 'returns false' do
        expect(shift.fully_staffed?).to be false
      end
    end

    context 'fully assigned' do
      before do
        create_list(:assignment, 2, shift: shift, status: 'assigned')
      end

      it 'returns true' do
        expect(shift.fully_staffed?).to be true
      end
    end

    context 'over-assigned' do
      before do
        2.times { create(:assignment, shift: shift, status: 'assigned') }
        create_assignment_bypassing_capacity(shift: shift, status: 'assigned')
      end

      it 'returns true (considers it fully staffed)' do
        expect(shift.fully_staffed?).to be true
      end
    end
  end

  describe 'status-based assignment counting' do
    let(:shift) { create(:shift, capacity: 3) }

    before do
      create(:assignment, shift: shift, status: 'assigned')
      create(:assignment, shift: shift, status: 'completed')
      create(:assignment, shift: shift, status: 'cancelled')
    end

    it 'counts all persisted assignments for staffing progress (current invariant)' do
      progress = shift.staffing_progress
      expect(progress[:assigned]).to eq(3)
    end
  end
end
