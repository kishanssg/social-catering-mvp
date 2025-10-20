# spec/edge_cases/time_overlap_edge_cases_spec.rb

require 'rails_helper'

RSpec.describe 'Time Overlap Edge Cases', type: :model do
  describe 'Exact time boundary overlaps' do
    let(:base_time) { Time.current + 1.day }
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'shifts with identical start and end times' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time + 4.hours, end_time_utc: base_time + 8.hours) }
      
      it 'does not consider them overlapping' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be true
      end
    end
    
    context 'shifts with identical start times' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 2.hours) }
      
      it 'considers them overlapping' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be false
      end
    end
    
    context 'shifts with identical end times' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 4.hours) }
      
      it 'considers them overlapping' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be false
      end
    end
  end
  
  describe 'Partial overlap scenarios' do
    let(:base_time) { Time.current + 1.day }
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'new shift starts before existing shift ends' do
      let(:existing_shift) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 6.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 4.hours, end_time_utc: base_time + 8.hours) }
      
      it 'detects overlap' do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
        
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
    
    context 'new shift ends after existing shift starts' do
      let(:existing_shift) { create(:shift, start_time_utc: base_time + 4.hours, end_time_utc: base_time + 8.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 6.hours) }
      
      it 'detects overlap' do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
        
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
    
    context 'new shift completely contains existing shift' do
      let(:existing_shift) { create(:shift, start_time_utc: base_time + 3.hours, end_time_utc: base_time + 5.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 6.hours) }
      
      it 'detects overlap' do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
        
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
    
    context 'existing shift completely contains new shift' do
      let(:existing_shift) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 6.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 3.hours, end_time_utc: base_time + 5.hours) }
      
      it 'detects overlap' do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
        
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
  end
  
  describe 'Non-overlapping scenarios' do
    let(:base_time) { Time.current + 1.day }
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'shifts with gap between them' do
      let(:existing_shift) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 2.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 3.hours, end_time_utc: base_time + 5.hours) }
      
      it 'allows assignment' do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
        
        expect(worker.available_for_shift?(new_shift)).to be true
      end
    end
    
    context 'shifts on different days' do
      let(:existing_shift) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 1.day, end_time_utc: base_time + 1.day + 4.hours) }
      
      it 'allows assignment' do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
        
        expect(worker.available_for_shift?(new_shift)).to be true
      end
    end
  end
  
  describe 'Assignment status considerations' do
    let(:base_time) { Time.current + 1.day }
    let(:worker) { create(:worker, skills_json: ['Server']) }
    let(:existing_shift) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
    let(:new_shift) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 6.hours) }
    
    context 'confirmed assignment blocks new assignment' do
      before do
        create(:assignment, worker: worker, shift: existing_shift, status: 'confirmed')
      end
      
      it 'prevents overlap' do
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
    
    context 'pending assignment blocks new assignment' do
      before do
        create(:assignment, worker: worker, shift: existing_shift, status: 'pending')
      end
      
      it 'prevents overlap' do
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
    
    context 'cancelled assignment does not block new assignment' do
      before do
        create(:assignment, worker: worker, shift: existing_shift, status: 'cancelled')
      end
      
      it 'allows assignment' do
        expect(worker.available_for_shift?(new_shift)).to be true
      end
    end
    
    context 'no_show assignment does not block new assignment' do
      before do
        create(:assignment, worker: worker, shift: existing_shift, status: 'no_show')
      end
      
      it 'allows assignment' do
        expect(worker.available_for_shift?(new_shift)).to be true
      end
    end
  end
  
  describe 'Timezone edge cases' do
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'shifts across daylight saving time boundary' do
      # Spring forward (2 AM becomes 3 AM)
      let(:spring_forward_time) { Time.zone.parse('2025-03-09 01:00:00 EST') }
      let(:shift1) { create(:shift, start_time_utc: spring_forward_time, end_time_utc: spring_forward_time + 2.hours) }
      let(:shift2) { create(:shift, start_time_utc: spring_forward_time + 1.hour, end_time_utc: spring_forward_time + 3.hours) }
      
      it 'handles DST transition correctly' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be false
      end
    end
    
    context 'shifts across fall back boundary' do
      # Fall back (2 AM becomes 1 AM)
      let(:fall_back_time) { Time.zone.parse('2025-11-02 01:00:00 EST') }
      let(:shift1) { create(:shift, start_time_utc: fall_back_time, end_time_utc: fall_back_time + 2.hours) }
      let(:shift2) { create(:shift, start_time_utc: fall_back_time + 1.hour, end_time_utc: fall_back_time + 3.hours) }
      
      it 'handles DST transition correctly' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be false
      end
    end
  end
  
  describe 'Very short time differences' do
    let(:base_time) { Time.current + 1.day }
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'shifts with 1 second gap' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time + 4.hours + 1.second, end_time_utc: base_time + 8.hours) }
      
      it 'allows assignment' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be true
      end
    end
    
    context 'shifts with 1 second overlap' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 4.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time + 4.hours - 1.second, end_time_utc: base_time + 8.hours) }
      
      it 'prevents assignment' do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        
        expect(worker.available_for_shift?(shift2)).to be false
      end
    end
  end
  
  describe 'Multiple overlapping assignments' do
    let(:base_time) { Time.current + 1.day }
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'worker has multiple overlapping assignments' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 2.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time + 1.hour, end_time_utc: base_time + 3.hours) }
      let(:shift3) { create(:shift, start_time_utc: base_time + 2.hours, end_time_utc: base_time + 4.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 1.5.hours, end_time_utc: base_time + 2.5.hours) }
      
      before do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        create(:assignment, worker: worker, shift: shift2, status: 'confirmed')
        create(:assignment, worker: worker, shift: shift3, status: 'confirmed')
      end
      
      it 'prevents assignment due to any overlap' do
        expect(worker.available_for_shift?(new_shift)).to be false
      end
    end
    
    context 'worker has non-overlapping assignments' do
      let(:shift1) { create(:shift, start_time_utc: base_time, end_time_utc: base_time + 2.hours) }
      let(:shift2) { create(:shift, start_time_utc: base_time + 3.hours, end_time_utc: base_time + 5.hours) }
      let(:shift3) { create(:shift, start_time_utc: base_time + 6.hours, end_time_utc: base_time + 8.hours) }
      let(:new_shift) { create(:shift, start_time_utc: base_time + 2.5.hours, end_time_utc: base_time + 3.5.hours) }
      
      before do
        create(:assignment, worker: worker, shift: shift1, status: 'confirmed')
        create(:assignment, worker: worker, shift: shift2, status: 'confirmed')
        create(:assignment, worker: worker, shift: shift3, status: 'confirmed')
      end
      
      it 'allows assignment' do
        expect(worker.available_for_shift?(new_shift)).to be true
      end
    end
  end
  
  describe 'Edge case with nil times' do
    let(:worker) { create(:worker, skills_json: ['Server']) }
    
    context 'shift with nil start time' do
      let(:shift) { build(:shift, start_time_utc: nil, end_time_utc: Time.current + 1.day) }
      
      it 'is invalid' do
        expect(shift).not_to be_valid
        expect(shift.errors[:start_time_utc]).to include("can't be blank")
      end
    end
    
    context 'shift with nil end time' do
      let(:shift) { build(:shift, start_time_utc: Time.current + 1.day, end_time_utc: nil) }
      
      it 'is invalid' do
        expect(shift).not_to be_valid
        expect(shift.errors[:end_time_utc]).to include("can't be blank")
      end
    end
  end
end
