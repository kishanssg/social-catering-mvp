# spec/performance/query_performance_spec.rb

require 'rails_helper'

RSpec.describe 'Query Performance', type: :model do
  describe 'N+1 query prevention' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 10) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
    
    before do
      event.generate_shifts!
      
      # Create assignments for some shifts
      event.shifts.limit(5).each do |shift|
        create(:assignment, shift: shift, status: 'confirmed')
      end
    end
    
    context 'Event#shifts with assignments' do
      it 'uses includes to prevent N+1 queries' do
        expect {
          Event.includes(shifts: :assignments).find(event.id).shifts.each do |shift|
            shift.assignments.count
          end
        }.to make_database_queries(count: 1)
      end
      
      it 'detects N+1 queries without includes' do
        expect {
          Event.find(event.id).shifts.each do |shift|
            shift.assignments.count
          end
        }.to make_database_queries(count: 11) # 1 for event + 10 for shifts + 10 for assignments
      end
    end
    
    context 'Event#staffing_progress calculation' do
      it 'uses includes to prevent N+1 queries' do
        expect {
          Event.includes(shifts: :assignments).find(event.id).staffing_progress
        }.to make_database_queries(count: 1)
      end
      
      it 'detects N+1 queries without includes' do
        expect {
          Event.find(event.id).staffing_progress
        }.to make_database_queries(count: 11) # 1 for event + 10 for shifts + 10 for assignments
      end
    end
    
    context 'Shift#staffing_progress calculation' do
      let(:shift) { event.shifts.first }
      
      it 'uses includes to prevent N+1 queries' do
        expect {
          Shift.includes(:assignments).find(shift.id).staffing_progress
        }.to make_database_queries(count: 1)
      end
      
      it 'detects N+1 queries without includes' do
        expect {
          Shift.find(shift.id).staffing_progress
        }.to make_database_queries(count: 2) # 1 for shift + 1 for assignments
      end
    end
  end
  
  describe 'Database indexing performance' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 100) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
    
    before do
      event.generate_shifts!
    end
    
    context 'Shift queries by time range' do
      it 'uses index on start_time_utc and end_time_utc' do
        start_time = Time.current + 1.day
        end_time = Time.current + 1.day + 4.hours
        
        expect {
          Shift.where('start_time_utc >= ? AND end_time_utc <= ?', start_time, end_time).count
        }.to make_database_queries(count: 1)
      end
    end
    
    context 'Assignment queries by worker and time' do
      let(:worker) { create(:worker, skills_json: ['Server']) }
      
      before do
        # Create assignments for some shifts
        event.shifts.limit(50).each do |shift|
          create(:assignment, shift: shift, worker: worker, status: 'confirmed')
        end
      end
      
      it 'uses index on worker_id and shift_id' do
        expect {
          Assignment.joins(:shift)
            .where(worker_id: worker.id, status: 'confirmed')
            .where('shifts.start_time_utc >= ?', Time.current + 1.day)
            .count
        }.to make_database_queries(count: 1)
      end
    end
    
    context 'Event queries by status' do
      before do
        create_list(:event, 50, status: 'published')
        create_list(:event, 50, status: 'draft')
        create_list(:event, 50, status: 'completed')
      end
      
      it 'uses index on status' do
        expect {
          Event.where(status: 'published').count
        }.to make_database_queries(count: 1)
      end
    end
    
    context 'Worker queries by skill' do
      before do
        create_list(:worker, 100, skills_json: ['Server'])
        create_list(:worker, 100, skills_json: ['Bartender'])
        create_list(:worker, 100, skills_json: ['Chef'])
      end
      
      it 'uses GIN index on skills_json' do
        expect {
          Worker.where("skills_json @> ?", ['Server'].to_json).count
        }.to make_database_queries(count: 1)
      end
    end
  end
  
  describe 'Bulk operations performance' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 100) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
    
    before do
      event.generate_shifts!
    end
    
    context 'Bulk assignment creation' do
      let(:workers) { create_list(:worker, 50, skills_json: ['Server']) }
      
      it 'creates multiple assignments efficiently' do
        assignments_data = event.shifts.limit(50).map do |shift|
          {
            shift_id: shift.id,
            worker_id: workers.sample.id,
            assigned_by_id: create(:user).id,
            assigned_at_utc: Time.current,
            status: 'confirmed'
          }
        end
        
        expect {
          Assignment.insert_all(assignments_data)
        }.to make_database_queries(count: 1)
      end
    end
    
    context 'Bulk shift generation' do
      it 'generates shifts efficiently' do
        expect {
          event.generate_shifts!
        }.to make_database_queries(count: 1) # Single INSERT with multiple values
      end
    end
  end
  
  describe 'Search performance' do
    before do
      # Create workers with various skills
      create_list(:worker, 100, skills_json: ['Server'])
      create_list(:worker, 100, skills_json: ['Bartender'])
      create_list(:worker, 100, skills_json: ['Chef'])
      create_list(:worker, 100, skills_json: ['Server', 'Bartender'])
    end
    
    context 'Worker search by skill' do
      it 'uses GIN index for efficient skill search' do
        expect {
          Worker.where("skills_json @> ?", ['Server'].to_json).count
        }.to make_database_queries(count: 1)
      end
    end
    
    context 'Worker search by name' do
      it 'uses text search index' do
        expect {
          Worker.where("first_name ILIKE ? OR last_name ILIKE ?", "%John%", "%John%").count
        }.to make_database_queries(count: 1)
      end
    end
    
    context 'Complex worker search' do
      it 'combines multiple conditions efficiently' do
        expect {
          Worker.where("skills_json @> ?", ['Server'].to_json)
            .where(active: true)
            .where("first_name ILIKE ?", "%John%")
            .count
        }.to make_database_queries(count: 1)
      end
    end
  end
  
  describe 'Memory usage optimization' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 1000) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
    
    before do
      event.generate_shifts!
    end
    
    context 'Large dataset processing' do
      it 'uses find_each for memory efficiency' do
        expect {
          Shift.find_each do |shift|
            shift.staffing_progress
          end
        }.to make_database_queries(count: 11) # 10 batches of 100 + 1 initial query
      end
      
      it 'avoids loading all records at once' do
        expect {
          Shift.all.each do |shift|
            shift.staffing_progress
          end
        }.to make_database_queries(count: 1001) # 1 for all shifts + 1000 for assignments
      end
    end
    
    context 'Selective field loading' do
      it 'loads only necessary fields' do
        expect {
          Shift.select(:id, :capacity, :start_time_utc, :end_time_utc).find_each do |shift|
            shift.capacity
          end
        }.to make_database_queries(count: 11) # 10 batches + 1 initial query
      end
    end
  end
  
  describe 'Caching performance' do
    let(:event) { create(:event, status: 'published') }
    let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 10) }
    let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
    
    before do
      event.generate_shifts!
    end
    
    context 'Repeated staffing calculations' do
      it 'benefits from memoization' do
        event = Event.includes(shifts: :assignments).find(event.id)
        
        # First calculation
        expect {
          event.staffing_progress
        }.to make_database_queries(count: 1)
        
        # Second calculation should use cached result
        expect {
          event.staffing_progress
        }.to make_database_queries(count: 0)
      end
    end
    
    context 'Counter cache usage' do
      let(:shift) { event.shifts.first }
      
      it 'uses counter cache for assignment count' do
        expect {
          shift.assignments_count
        }.to make_database_queries(count: 0) # Uses counter cache
      end
    end
  end
end
