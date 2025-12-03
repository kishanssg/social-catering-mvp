# spec/models/event_spec.rb

require 'rails_helper'

RSpec.describe Event, type: :model do
  let(:audit_user) { create(:user) }

  before do
    Current.user = audit_user
  end
  describe 'validations' do
    it { should validate_presence_of(:title) }
    it { should validate_inclusion_of(:status).in_array([ 'draft', 'published', 'assigned', 'completed', 'deleted' ]) }
  end

  describe 'associations' do
    it { should belong_to(:venue) }
    it { should have_many(:event_skill_requirements).dependent(:destroy) }
    it { should have_one(:event_schedule).dependent(:destroy) }
    it { should have_many(:shifts).dependent(:destroy) }
  end

  describe '#publish!' do
    let(:event) { create(:event, status: 'draft') }

    it 'changes status to published' do
      event.publish!
      expect(event.status).to eq('published')
    end

    it 'generates shifts when published' do
      create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2)
      create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours)

      expect { event.publish! }.to change { event.shifts.count }.from(0).to(2)
    end
  end

  describe '#generate_shifts!' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 3) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 6.hours) }

    it 'creates shifts based on skill requirements' do
      expect { event.generate_shifts! }.to change { event.shifts.count }.from(0).to(3)
    end

    it 'sets correct attributes on generated shifts' do
      event.generate_shifts!
      shift = event.shifts.first

      expect(shift.role_needed).to eq('Server')
      expect(shift.capacity).to eq(1)
      expect(shift.start_time_utc).to eq(schedule.start_time_utc)
      expect(shift.end_time_utc).to eq(schedule.end_time_utc)
    end

    it 'creates multiple shifts for multi-worker roles' do
      event.generate_shifts!
      server_shifts = event.shifts.where(role_needed: 'Server')

      expect(server_shifts.count).to eq(3)
      expect(server_shifts.pluck(:capacity)).to all(eq(1))
    end
  end

  describe 'staffing calculations' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }

    before do
      event.generate_shifts!
    end

    context 'no assignments' do
      it 'shows 0% staffing' do
        expect(event.staffing_progress[:percentage]).to eq(0)
      end
    end

    context 'partial assignments' do
      before do
        create(:assignment, shift: event.shifts.first, status: 'confirmed')
      end

      it 'shows partial staffing' do
        expect(event.staffing_progress[:percentage]).to eq(50)
      end
    end

    context 'fully assigned' do
      before do
        event.shifts.each do |shift|
          create(:assignment, shift: shift, status: 'confirmed')
        end
      end

      it 'shows 100% staffing' do
        expect(event.staffing_progress[:percentage]).to eq(100)
      end
    end
  end

  describe 'scopes' do
    let!(:draft_event) { create(:event, status: 'draft') }
    let!(:published_event) { create(:event, status: 'published') }
    let!(:completed_event) { create(:event, status: 'completed') }

    describe '.draft' do
      it 'returns only draft events' do
        expect(Event.draft).to contain_exactly(draft_event)
      end
    end

    describe '.published' do
      it 'returns only published events' do
        expect(Event.published).to contain_exactly(published_event)
      end
    end

    describe '.completed' do
      it 'returns only completed events' do
        expect(Event.completed).to contain_exactly(completed_event)
      end
    end
  end
end
