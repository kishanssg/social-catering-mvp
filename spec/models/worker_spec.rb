# spec/models/worker_spec.rb

require 'rails_helper'

RSpec.describe Worker, type: :model do
  describe 'validations' do
    subject { build(:worker) }

    it { should validate_presence_of(:first_name) }
    it { should validate_presence_of(:last_name) }
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_presence_of(:phone) }
  end

  describe 'associations' do
    it { should have_many(:assignments).dependent(:restrict_with_error) }
    it { should have_many(:shifts).through(:assignments) }
    it { should have_many(:worker_certifications).dependent(:destroy) }
    it { should have_many(:certifications).through(:worker_certifications) }
  end

  describe '#full_name' do
    let(:worker) { create(:worker, first_name: 'John', last_name: 'Doe') }

    it 'returns concatenated first and last name' do
      expect(worker.full_name).to eq('John Doe')
    end
  end

  describe '#skills' do
    let(:worker) { create(:worker, skills_json: [ 'Server', 'Bartender' ]) }

    it 'returns parsed skills array' do
      expect(worker.skills).to eq([ 'Server', 'Bartender' ])
    end

    context 'with nil skills_json' do
      let(:worker) { create(:worker, skills_json: nil) }

      it 'returns empty array' do
        expect(worker.skills).to eq([])
      end
    end

    context 'with string skills_json' do
      let(:worker) { create(:worker, skills_json: '["Server", "Bartender"]') }

      it 'parses JSON string correctly' do
        expect(worker.skills).to eq([ 'Server', 'Bartender' ])
      end
    end
  end

  describe '#has_skill?' do
    let(:worker) { create(:worker, skills_json: [ 'Server', 'Bartender' ]) }

    it 'returns true for existing skill' do
      expect(worker.has_skill?('Server')).to be true
    end

    it 'returns false for non-existing skill' do
      expect(worker.has_skill?('Chef')).to be false
    end

    it 'is case sensitive' do
      expect(worker.has_skill?('server')).to be false
    end
  end

  describe '#available_for_shift?' do
    let(:worker) { create(:worker, skills_json: [ 'Server' ]) }
    let(:shift) { create(:shift, role_needed: 'Server', start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }

    context 'worker has required skill' do
      it 'returns true' do
        expect(worker.available_for_shift?(shift)).to be true
      end
    end

    context 'worker lacks required skill' do
      let(:worker) { create(:worker, skills_json: [ 'Bartender' ]) }

      it 'returns false' do
        expect(worker.available_for_shift?(shift)).to be false
      end
    end

    context 'worker has overlapping assignment' do
      let(:overlapping_shift) { create(:shift, start_time_utc: Time.current + 1.day + 2.hours, end_time_utc: Time.current + 1.day + 6.hours) }

      before do
        create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
      end

      it 'returns false' do
        expect(worker.available_for_shift?(shift)).to be false
      end
    end

    context 'worker has non-overlapping assignment' do
      let(:non_overlapping_shift) { create(:shift, start_time_utc: Time.current + 2.days, end_time_utc: Time.current + 2.days + 4.hours) }

      before do
        create(:assignment, worker: worker, shift: non_overlapping_shift, status: 'confirmed')
      end

      it 'returns true' do
        expect(worker.available_for_shift?(shift)).to be true
      end
    end
  end

  describe 'scopes' do
    let!(:active_worker) { create(:worker, active: true, skills_json: []) }
    let!(:inactive_worker) { create(:worker, active: false, skills_json: []) }

    describe '.active' do
      it 'returns only active workers' do
        expect(Worker.active).to contain_exactly(active_worker)
      end
    end

    describe '.with_skill' do
      let!(:server_worker) { create(:worker, skills_json: [ 'Server' ]) }
      let!(:bartender_worker) { create(:worker, skills_json: [ 'Bartender' ]) }
      let!(:multi_skill_worker) { create(:worker, skills_json: [ 'Server', 'Bartender' ]) }

      it 'returns workers with specific skill' do
        expect(Worker.with_skill('Server')).to contain_exactly(server_worker, multi_skill_worker)
      end
    end
  end

  describe 'search functionality' do
    let!(:john_doe) { create(:worker, first_name: 'John', last_name: 'Doe', skills_json: [ 'Server' ]) }
    let!(:jane_smith) { create(:worker, first_name: 'Jane', last_name: 'Smith', skills_json: [ 'Bartender' ]) }
    let!(:john_wilson) { create(:worker, first_name: 'John', last_name: 'Wilson', skills_json: [ 'Chef' ]) }

    describe '.search' do
      it 'searches by name' do
        expect(Worker.search('John')).to contain_exactly(john_doe, john_wilson)
      end

      it 'searches by skill' do
        expect(Worker.search('Server')).to contain_exactly(john_doe)
      end

      it 'returns empty for no matches' do
        expect(Worker.search('NonExistent')).to be_empty
      end
    end
  end

  describe 'callbacks' do
    describe 'auto-unassigning active assignments on deactivation' do
      let(:user) { create(:user) }
      let(:event_status) { 'published' }
      let(:event) { create(:event, status: event_status) }
      let(:shift) { create(:shift, event: event, created_by: user) }
      let(:worker) { create(:worker, active: true, skills_json: [ 'Server' ]) }
      let(:assignment_status) { 'assigned' }
      let!(:assignment) do
        create(:assignment, shift: shift, worker: worker, status: assignment_status, assigned_by: user)
      end

      around do |example|
        previous_user = Current.user
        Current.user = user
        example.run
      ensure
        Current.user = previous_user
      end

      it 'removes assignments tied to active events when worker is deactivated' do
        expect {
          worker.update!(active: false)
        }.to change { Assignment.exists?(assignment.id) }.from(true).to(false)
      end

      context 'when assignment is confirmed' do
        let(:assignment_status) { 'confirmed' }

        it 'also removes the assignment' do
          expect {
            worker.update!(active: false)
          }.to change { Assignment.exists?(assignment.id) }.from(true).to(false)
        end
      end

      context 'when event is not active' do
        let(:event_status) { 'draft' }

        it 'does not touch the assignment' do
          expect {
            worker.update!(active: false)
          }.not_to change { Assignment.exists?(assignment.id) }
        end
      end
    end
  end
end
