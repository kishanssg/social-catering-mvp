# spec/requests/api/v1/events_spec.rb

require 'rails_helper'

RSpec.describe 'API::V1::Events', type: :request do
  let(:user) { create(:user) }
  let(:venue) { create(:venue) }
  
  before do
    sign_in user
  end
  
  describe 'GET /api/v1/events' do
    let!(:draft_event) { create(:event, status: 'draft', title: 'Draft Event') }
    let!(:published_event) { create(:event, status: 'published', title: 'Published Event') }
    let!(:completed_event) { create(:event, status: 'completed', title: 'Completed Event') }
    
    context 'without tab parameter' do
      it 'returns all events' do
        get '/api/v1/events'
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json['data'].length).to eq(3)
        expect(json['data'].map { |e| e['title'] }).to contain_exactly('Draft Event', 'Published Event', 'Completed Event')
      end
    end
    
    context 'with tab=active' do
      it 'returns only published events with shifts_by_role' do
        # Create skill requirement and schedule for published event
        create(:event_skill_requirement, event: published_event, skill_name: 'Server', needed_workers: 2)
        create(:event_schedule, event: published_event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours)
        published_event.generate_shifts!
        
        get '/api/v1/events', params: { tab: 'active' }
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json['data'].length).to eq(1)
        expect(json['data'].first['title']).to eq('Published Event')
        expect(json['data'].first['shifts_by_role']).to be_present
        expect(json['data'].first['shifts_by_role'].first['role_name']).to eq('Server')
        expect(json['data'].first['shifts_by_role'].first['total_shifts']).to eq(2)
      end
    end
    
    context 'with tab=draft' do
      it 'returns only draft events without shifts_by_role' do
        get '/api/v1/events', params: { tab: 'draft' }
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json['data'].length).to eq(1)
        expect(json['data'].first['title']).to eq('Draft Event')
        expect(json['data'].first['shifts_by_role']).to be_nil
      end
    end
    
    context 'with tab=past' do
      it 'returns only completed events' do
        get '/api/v1/events', params: { tab: 'past' }
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json['data'].length).to eq(1)
        expect(json['data'].first['title']).to eq('Completed Event')
      end
    end
  end
  
  describe 'POST /api/v1/events' do
    let(:event_params) do
      {
        event: {
          title: 'New Event',
          status: 'draft',
          venue_id: venue.id,
          check_in_instructions: 'Arrive 15 minutes early',
          supervisor_name: 'John Supervisor',
          supervisor_phone: '555-0123',
          skill_requirements: [
            { skill_name: 'Server', needed_workers: 2, uniform_name: 'Black pants, white shirt' },
            { skill_name: 'Bartender', needed_workers: 1, uniform_name: 'Black pants, white shirt' }
          ],
          schedule: [
            { start_time_utc: (Time.current + 1.day).iso8601, end_time_utc: (Time.current + 1.day + 4.hours).iso8601 }
          ],
          auto_publish: true
        }
      }
    end
    
    context 'valid event creation' do
      it 'creates event successfully' do
        post '/api/v1/events', params: event_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        expect(json['data']['title']).to eq('New Event')
        expect(json['data']['status']).to eq('published')
        expect(json['data']['venue']['id']).to eq(venue.id)
      end
      
      it 'generates shifts when auto_publish is true' do
        post '/api/v1/events', params: event_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        event = Event.find(json['data']['id'])
        expect(event.shifts.count).to eq(3) # 2 servers + 1 bartender
        expect(event.shifts.where(role_needed: 'Server').count).to eq(2)
        expect(event.shifts.where(role_needed: 'Bartender').count).to eq(1)
      end
    end
    
    context 'event creation without auto_publish' do
      let(:event_params) do
        {
          event: {
            title: 'Draft Event',
            status: 'draft',
            venue_id: venue.id,
            check_in_instructions: 'Arrive 15 minutes early',
            supervisor_name: 'John Supervisor',
            supervisor_phone: '555-0123',
            skill_requirements: [
              { skill_name: 'Server', needed_workers: 2, uniform_name: 'Black pants, white shirt' }
            ],
            schedule: [
              { start_time_utc: (Time.current + 1.day).iso8601, end_time_utc: (Time.current + 1.day + 4.hours).iso8601 }
            ]
          }
        }
      end
      
      it 'creates draft event without generating shifts' do
        post '/api/v1/events', params: event_params
        
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        
        expect(json['data']['status']).to eq('draft')
        event = Event.find(json['data']['id'])
        expect(event.shifts.count).to eq(0)
      end
    end
    
    context 'invalid event creation' do
      it 'returns validation errors for missing title' do
        post '/api/v1/events', params: { event: { status: 'draft' } }
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Title can\'t be blank')
      end
      
      it 'returns validation errors for invalid status' do
        post '/api/v1/events', params: { event: { title: 'Test', status: 'invalid' } }
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Status is not included in the list')
      end
    end
  end
  
  describe 'PUT /api/v1/events/:id' do
    let(:event) { create(:event, title: 'Original Title', status: 'draft') }
    
    context 'valid update' do
      it 'updates event successfully' do
        put "/api/v1/events/#{event.id}", params: { event: { title: 'Updated Title' } }
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json['data']['title']).to eq('Updated Title')
        expect(event.reload.title).to eq('Updated Title')
      end
    end
    
    context 'invalid update' do
      it 'returns validation errors' do
        put "/api/v1/events/#{event.id}", params: { event: { title: '' } }
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['errors']).to include('Title can\'t be blank')
      end
    end
    
    context 'non-existent event' do
      it 'returns 404' do
        put '/api/v1/events/99999', params: { event: { title: 'Updated Title' } }
        
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'published event regenerates shifts' do
      let(:event) { create(:event, status: 'published', venue: venue) }
      let!(:schedule) do
        create(:event_schedule, event: event, start_time_utc: Time.current + 2.days, end_time_utc: Time.current + 2.days + 4.hours)
      end

      it 'creates shifts for new requirements after update' do
        payload = {
          event: {
            skill_requirements: [
              { skill_name: 'Server', needed_workers: 2, pay_rate: 18 }
            ]
          }
        }

        expect {
          put "/api/v1/events/#{event.id}", params: payload
          event.reload
        }.to change { event.shifts.count }.from(0).to(2)

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['data']['skill_requirements'].first['skill_name']).to eq('Server')
      end
    end
  end
  
  describe 'DELETE /api/v1/events/:id' do
    let(:event) { create(:event, status: 'draft') }
    
    context 'draft event' do
      it 'deletes event successfully' do
        delete "/api/v1/events/#{event.id}"
        
        expect(response).to have_http_status(:ok)
        expect(Event.find_by(id: event.id)).to be_nil
      end
    end
    
    context 'published event with assignments' do
      let(:event) { create(:event, status: 'published') }
      let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 1) }
      let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
      let!(:shift) { create(:shift, event: event, role_needed: 'Server', capacity: 1) }
      let!(:assignment) { create(:assignment, shift: shift, status: 'confirmed') }
      
      it 'returns error and does not delete' do
        delete "/api/v1/events/#{event.id}"
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        
        expect(json['error']).to include('Cannot delete event with existing assignments')
        expect(Event.find_by(id: event.id)).to be_present
      end
    end
  end
end
