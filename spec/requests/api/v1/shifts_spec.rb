# spec/requests/api/v1/shifts_spec.rb

require 'rails_helper'

RSpec.describe 'API::V1::Shifts', type: :request do
  let(:user) { create(:user) }
  let(:event) { create(:event, status: 'published') }
  let(:shift) { create(:shift, event: event, role_needed: 'Server', capacity: 1) }
  let(:worker) { create(:worker, skills_json: ['Server']) }
  
  before do
    sign_in user
  end
  
  describe 'GET /api/v1/shifts/:id' do
    it 'returns shift details' do
      get "/api/v1/shifts/#{shift.id}"
      
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      
      expect(json['data']['id']).to eq(shift.id)
      expect(json['data']['role_needed']).to eq('Server')
      expect(json['data']['capacity']).to eq(1)
      expect(json['data']['staffing_progress']['required']).to eq(1)
      expect(json['data']['staffing_progress']['assigned']).to eq(0)
      expect(json['data']['staffing_progress']['percentage']).to eq(0)
      expect(json['data']['fully_staffed']).to be false
    end
    
    it 'includes event and venue information' do
      get "/api/v1/shifts/#{shift.id}"
      
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      
      expect(json['data']['event']).to be_present
      expect(json['data']['event']['id']).to eq(event.id)
      expect(json['data']['event']['title']).to eq(event.title)
    end
    
    it 'returns 404 for non-existent shift' do
      get '/api/v1/shifts/99999'
      
      expect(response).to have_http_status(:not_found)
    end
  end
  
  describe 'POST /api/v1/staffing' do
    let(:assignment_params) do
      {
        assignment: {
          shift_id: shift.id,
          worker_id: worker.id
        }
      }
    end
    
    context 'valid assignment' do
      it 'creates assignment successfully' do
        post '/api/v1/staffing', params: assignment_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        expect(json['data']['worker_id']).to eq(worker.id)
        expect(json['data']['shift_id']).to eq(shift.id)
        expect(json['data']['status']).to eq('assigned')
      end
      
      it 'updates shift staffing progress' do
        post '/api/v1/staffing', params: assignment_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        expect(json['data']['shift']['staffing_progress']['assigned']).to eq(1)
        expect(json['data']['shift']['staffing_progress']['percentage']).to eq(100)
        expect(json['data']['shift']['fully_staffed']).to be true
      end
    end
    
    context 'worker lacks required skill' do
      let(:worker) { create(:worker, skills_json: ['Bartender']) }
      
      it 'returns validation error' do
        post '/api/v1/staffing', params: assignment_params
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Worker does not have required skill')
      end
    end
    
    context 'shift at capacity' do
      before do
        create(:assignment, shift: shift, status: 'confirmed')
      end
      
      it 'returns validation error' do
        post '/api/v1/staffing', params: assignment_params
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Shift is at capacity')
      end
    end
    
    context 'worker has overlapping assignment' do
      let(:overlapping_shift) { create(:shift, start_time_utc: shift.start_time_utc + 2.hours, end_time_utc: shift.end_time_utc + 2.hours) }
      
      before do
        create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
      end
      
      it 'returns validation error' do
        post '/api/v1/staffing', params: assignment_params
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Worker has overlapping assignment')
      end
    end
    
    context 'missing parameters' do
      it 'returns validation error for missing shift_id' do
        post '/api/v1/staffing', params: { assignment: { worker_id: worker.id } }
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Shift must exist')
      end
      
      it 'returns validation error for missing worker_id' do
        post '/api/v1/staffing', params: { assignment: { shift_id: shift.id } }
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Worker must exist')
      end
    end
  end
  
  describe 'POST /api/v1/staffing/bulk_create' do
    let(:shift2) { create(:shift, event: event, role_needed: 'Server', capacity: 1) }
    let(:worker2) { create(:worker, skills_json: ['Server']) }
    let(:bulk_params) do
      {
        assignments: [
          { shift_id: shift.id, worker_id: worker.id },
          { shift_id: shift2.id, worker_id: worker2.id }
        ]
      }
    end
    
    context 'valid bulk assignment' do
      it 'creates multiple assignments successfully' do
        post '/api/v1/staffing/bulk_create', params: bulk_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        expect(json['data']['created_count']).to eq(2)
        expect(json['data']['assignments'].length).to eq(2)
      end
      
      it 'returns conflicts for failed assignments' do
        # Create overlapping assignment for worker
        overlapping_shift = create(:shift, start_time_utc: shift.start_time_utc + 2.hours, end_time_utc: shift.end_time_utc + 2.hours)
        create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
        
        post '/api/v1/staffing/bulk_create', params: bulk_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        expect(json['data']['created_count']).to eq(1)
        expect(json['data']['conflicts'].length).to eq(1)
        expect(json['data']['conflicts'].first['error']).to include('overlapping assignment')
      end
    end
    
    context 'all assignments fail' do
      before do
        # Make both workers unavailable
        overlapping_shift1 = create(:shift, start_time_utc: shift.start_time_utc + 2.hours, end_time_utc: shift.end_time_utc + 2.hours)
        overlapping_shift2 = create(:shift, start_time_utc: shift2.start_time_utc + 2.hours, end_time_utc: shift2.end_time_utc + 2.hours)
        create(:assignment, worker: worker, shift: overlapping_shift1, status: 'confirmed')
        create(:assignment, worker: worker2, shift: overlapping_shift2, status: 'confirmed')
      end
      
      it 'returns all conflicts' do
        post '/api/v1/staffing/bulk_create', params: bulk_params
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['data']['created_count']).to eq(0)
        expect(json['data']['conflicts'].length).to eq(2)
      end
    end
  end
end
