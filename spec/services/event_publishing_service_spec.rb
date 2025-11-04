# spec/services/event_publishing_service_spec.rb

require 'rails_helper'

RSpec.describe EventPublishingService, type: :service do
  let(:event) { create(:event, status: 'draft') }
  let(:service) { EventPublishingService.new(event: event) }
  
  describe '#call' do
    context 'valid event with skill requirements and schedule' do
      let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2) }
      let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
      
      it 'publishes event successfully' do
        result = service.call
        
        expect(result[:success]).to be true
        expect(event.reload.status).to eq('published')
        expect(event.shifts.count).to eq(2)
      end
      
      it 'generates shifts with correct attributes' do
        service.call
        shift = event.shifts.first
        
        expect(shift.role_needed).to eq('Server')
        expect(shift.capacity).to eq(1)
        expect(shift.start_time_utc).to eq(schedule.start_time_utc)
        expect(shift.end_time_utc).to eq(schedule.end_time_utc)
      end
    end
    
    context 'event without skill requirements' do
      it 'returns error' do
        result = service.call
        
        expect(result[:success]).to be false
        expect(result[:error]).to include('Event must have skill requirements')
      end
    end
    
    context 'event without schedule' do
      let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2) }
      
      it 'returns error' do
        result = service.call
        
        expect(result[:success]).to be false
        expect(result[:error]).to include('Event must have schedule')
      end
    end
    
    context 'event already published' do
      let(:event) { create(:event, status: 'published') }
      
      it 'returns error' do
        result = service.call
        
        expect(result[:success]).to be false
        expect(result[:error]).to include('Event is already published')
      end
    end
    
    context 'multiple skill requirements' do
      let!(:server_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2) }
      let!(:bartender_req) { create(:event_skill_requirement, event: event, skill_name: 'Bartender', needed_workers: 1) }
      let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
      
      it 'generates shifts for all skill requirements' do
        service.call
        
        expect(event.shifts.count).to eq(3)
        expect(event.shifts.where(role_needed: 'Server').count).to eq(2)
        expect(event.shifts.where(role_needed: 'Bartender').count).to eq(1)
      end
    end
    
    context 'multiple schedule periods' do
      let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 1) }
      let!(:morning_schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
      let!(:evening_schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day + 6.hours, end_time_utc: Time.current + 1.day + 10.hours) }
      
      it 'generates shifts for all schedule periods' do
        service.call
        
        expect(event.shifts.count).to eq(2)
        expect(event.shifts.pluck(:start_time_utc)).to contain_exactly(morning_schedule.start_time_utc, evening_schedule.start_time_utc)
      end
    end
  end
  
  describe '#validate_event' do
    it 'returns true for valid event' do
      create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2)
      create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours)
      
      expect(service.send(:validate_event)).to be true
    end
    
    it 'returns false for event without skill requirements' do
      expect(service.send(:validate_event)).to be false
    end
    
    it 'returns false for event without schedule' do
      create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2)
      expect(service.send(:validate_event)).to be false
    end
  end
  
  describe '#generate_shifts_for_skill_requirement' do
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 3) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
    
    it 'creates correct number of shifts' do
      service.send(:generate_shifts_for_skill_requirement, skill_req)
      
      expect(event.shifts.where(role_needed: 'Server').count).to eq(3)
    end
    
    it 'sets correct capacity for each shift' do
      service.send(:generate_shifts_for_skill_requirement, skill_req)
      
      event.shifts.where(role_needed: 'Server').each do |shift|
        expect(shift.capacity).to eq(1)
      end
    end
  end
end
