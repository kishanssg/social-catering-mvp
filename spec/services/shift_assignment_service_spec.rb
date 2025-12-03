# spec/services/shift_assignment_service_spec.rb

require 'rails_helper'

RSpec.describe ShiftAssignmentService, type: :service do
  let(:user) { create(:user) }
  let(:worker) { create(:worker, skills_json: [ 'Server' ]) }
  let(:shift) { create(:shift, role_needed: 'Server', capacity: 1) }
  let(:service) { ShiftAssignmentService.new(shift: shift, worker: worker, assigned_by: user) }
  before do
    Current.user = user
  end

  describe '#call' do
    context 'valid assignment' do
      it 'creates assignment successfully' do
        result = service.call

        expect(result[:success]).to be true
        expect(result[:assignment]).to be_present
        expect(result[:assignment].worker).to eq(worker)
        expect(result[:assignment].shift).to eq(shift)
        expect(result[:assignment].status).to eq('assigned')
      end
    end

    context 'worker lacks required skill' do
      let(:worker) { create(:worker, skills_json: [ 'Bartender' ]) }

      it 'returns error' do
        result = service.call

        expect(result[:success]).to be false
        expect(result[:error]).to include('Worker does not have required skill')
      end
    end

    context 'shift at capacity' do
      before do
        create(:assignment, shift: shift, status: 'confirmed')
      end

      it 'returns error' do
        result = service.call

        expect(result[:success]).to be false
        expect(result[:error]).to include('Shift is at capacity')
      end
    end

    context 'worker has overlapping assignment' do
      let(:overlapping_shift) { create(:shift, start_time_utc: shift.start_time_utc + 2.hours, end_time_utc: shift.end_time_utc + 2.hours) }

      before do
        create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
      end

      it 'returns error' do
        result = service.call

        expect(result[:success]).to be false
        expect(result[:error]).to include('Worker has overlapping assignment')
      end
    end

    context 'certification required but missing' do
      let(:certification) { create(:certification, name: 'Food Safety') }
      let(:shift) { create(:shift, role_needed: 'Server', capacity: 1, required_certification: certification) }

      it 'returns error' do
        result = service.call

        expect(result[:success]).to be false
        expect(result[:error]).to include('Worker lacks required certification')
      end
    end

    context 'certification required and present' do
      let(:certification) { create(:certification, name: 'Food Safety') }
      let(:shift) { create(:shift, role_needed: 'Server', capacity: 1, required_certification: certification) }

      before do
        create(:worker_certification, worker: worker, certification: certification, expires_at_utc: Time.current + 1.year)
      end

      it 'creates assignment successfully' do
        result = service.call

        expect(result[:success]).to be true
        expect(result[:assignment]).to be_present
      end
    end

    context 'certification expired' do
      let(:certification) { create(:certification, name: 'Food Safety') }
      let(:shift) { create(:shift, role_needed: 'Server', capacity: 1, required_certification: certification) }

      before do
        create(:worker_certification, worker: worker, certification: certification, expires_at_utc: Time.current - 1.day)
      end

      it 'returns error' do
        result = service.call

        expect(result[:success]).to be false
        expect(result[:error]).to include('Worker certification has expired')
      end
    end
  end

  describe '#validate_assignment' do
    it 'returns true for valid assignment' do
      expect(service.send(:validate_assignment)).to be true
    end

    it 'returns false for invalid assignment' do
      allow(service).to receive(:worker_has_skill?).and_return(false)
      expect(service.send(:validate_assignment)).to be false
    end
  end

  describe '#worker_has_skill?' do
    it 'returns true when worker has required skill' do
      expect(service.send(:worker_has_skill?)).to be true
    end

    it 'returns false when worker lacks required skill' do
      allow(worker).to receive(:has_skill?).with('Server').and_return(false)
      expect(service.send(:worker_has_skill?)).to be false
    end
  end

  describe '#shift_has_capacity?' do
    it 'returns true when shift has capacity' do
      expect(service.send(:shift_has_capacity?)).to be true
    end

    it 'returns false when shift is at capacity' do
      create(:assignment, shift: shift, status: 'confirmed')
      expect(service.send(:shift_has_capacity?)).to be false
    end
  end

  describe '#worker_available?' do
    it 'returns true when worker is available' do
      expect(service.send(:worker_available?)).to be true
    end

    it 'returns false when worker has overlapping assignment' do
      overlapping_shift = create(:shift, start_time_utc: shift.start_time_utc + 2.hours, end_time_utc: shift.end_time_utc + 2.hours)
      create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
      expect(service.send(:worker_available?)).to be false
    end
  end
end
