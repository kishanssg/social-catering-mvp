# spec/system/worker_assignment_flow_spec.rb

require 'rails_helper'

RSpec.describe 'Worker Assignment Flow', type: :system do
  let(:user) { create(:user) }
  let(:worker) { create(:worker, skills_json: ['Server']) }
  let(:event) { create(:event, status: 'published') }
  let!(:skill_req) { create(:event_skill_requirement, event: event, skill_name: 'Server', needed_workers: 2) }
  let!(:schedule) { create(:event_schedule, event: event, start_time_utc: Time.current + 1.day, end_time_utc: Time.current + 1.day + 4.hours) }
  let!(:shift) { create(:shift, event: event, role_needed: 'Server', capacity: 1) }
  
  before do
    event.generate_shifts!
    sign_in user
  end
  
  describe 'assigning worker to shift' do
    it 'allows successful assignment through the UI' do
      visit '/events'
      
      # Find and click on the event
      click_on event.title
      
      # Find the shift and click assign
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      # Select worker from modal
      within('.assignment-modal') do
        select worker.full_name, from: 'worker-select'
        click_on 'Assign Worker'
      end
      
      # Verify assignment was created
      expect(page).to have_content('Worker assigned successfully')
      expect(shift.reload.assignments.count).to eq(1)
      expect(shift.assignments.first.worker).to eq(worker)
    end
    
    it 'shows conflict error when worker has overlapping assignment' do
      # Create overlapping shift and assignment
      overlapping_shift = create(:shift, 
        event: event, 
        role_needed: 'Server', 
        capacity: 1,
        start_time_utc: shift.start_time_utc + 2.hours,
        end_time_utc: shift.end_time_utc + 2.hours
      )
      create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
      
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      within('.assignment-modal') do
        select worker.full_name, from: 'worker-select'
        click_on 'Assign Worker'
      end
      
      # Verify error message
      expect(page).to have_content('Worker has overlapping assignment')
      expect(shift.reload.assignments.count).to eq(0)
    end
    
    it 'shows skill mismatch error when worker lacks required skill' do
      bartender_worker = create(:worker, skills_json: ['Bartender'])
      
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      within('.assignment-modal') do
        select bartender_worker.full_name, from: 'worker-select'
        click_on 'Assign Worker'
      end
      
      # Verify error message
      expect(page).to have_content('Worker does not have required skill')
      expect(shift.reload.assignments.count).to eq(0)
    end
    
    it 'shows capacity error when shift is full' do
      # Fill the shift
      create(:assignment, shift: shift, status: 'confirmed')
      
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        expect(page).not_to have_content('Assign Worker')
        expect(page).to have_content('Fully Staffed')
      end
    end
  end
  
  describe 'bulk assignment flow' do
    let(:worker2) { create(:worker, skills_json: ['Server']) }
    let(:shift2) { create(:shift, event: event, role_needed: 'Server', capacity: 1) }
    
    before do
      event.shifts << shift2
    end
    
    it 'allows bulk assignment of multiple shifts' do
      visit '/workers'
      
      # Find worker and click bulk assign
      within("[data-worker-id='#{worker.id}']") do
        click_on 'Bulk Assign'
      end
      
      # Select multiple shifts
      within('.bulk-assignment-modal') do
        check "shift_#{shift.id}"
        check "shift_#{shift2.id}"
        click_on 'Assign to Selected Shifts'
      end
      
      # Verify assignments were created
      expect(page).to have_content('2 assignments created successfully')
      expect(shift.reload.assignments.count).to eq(1)
      expect(shift2.reload.assignments.count).to eq(1)
    end
    
    it 'shows conflicts for failed assignments in bulk mode' do
      # Create overlapping assignment for one shift
      overlapping_shift = create(:shift, 
        event: event, 
        role_needed: 'Server', 
        capacity: 1,
        start_time_utc: shift.start_time_utc + 2.hours,
        end_time_utc: shift.end_time_utc + 2.hours
      )
      create(:assignment, worker: worker, shift: overlapping_shift, status: 'confirmed')
      
      visit '/workers'
      
      within("[data-worker-id='#{worker.id}']") do
        click_on 'Bulk Assign'
      end
      
      within('.bulk-assignment-modal') do
        check "shift_#{shift.id}"
        check "shift_#{shift2.id}"
        click_on 'Assign to Selected Shifts'
      end
      
      # Verify partial success
      expect(page).to have_content('1 assignment created successfully')
      expect(page).to have_content('1 assignment failed')
      expect(shift.reload.assignments.count).to eq(0) # Failed due to conflict
      expect(shift2.reload.assignments.count).to eq(1) # Success
    end
  end
  
  describe 'unassigning workers' do
    let!(:assignment) { create(:assignment, worker: worker, shift: shift, status: 'confirmed') }
    
    it 'allows unassigning worker from shift' do
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Unassign'
      end
      
      # Confirm unassignment
      within('.unassign-modal') do
        click_on 'Confirm Unassignment'
      end
      
      # Verify assignment was removed
      expect(page).to have_content('Worker unassigned successfully')
      expect(shift.reload.assignments.count).to eq(0)
    end
    
    it 'cancels unassignment when cancel is clicked' do
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Unassign'
      end
      
      within('.unassign-modal') do
        click_on 'Cancel'
      end
      
      # Verify assignment still exists
      expect(shift.reload.assignments.count).to eq(1)
    end
  end
  
  describe 'staffing progress display' do
    it 'shows correct staffing percentages' do
      visit '/events'
      click_on event.title
      
      # Check individual shift progress
      within("[data-shift-id='#{shift.id}']") do
        expect(page).to have_content('0 of 1 filled (0%)')
      end
      
      # Assign worker
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      within('.assignment-modal') do
        select worker.full_name, from: 'worker-select'
        click_on 'Assign Worker'
      end
      
      # Verify updated progress
      within("[data-shift-id='#{shift.id}']") do
        expect(page).to have_content('1 of 1 filled (100%)')
        expect(page).to have_content('Fully Staffed')
      end
    end
    
    it 'shows correct event-level staffing progress' do
      visit '/events'
      
      # Check event-level progress
      within("[data-event-id='#{event.id}']") do
        expect(page).to have_content('0%')
      end
      
      # Assign worker to shift
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      within('.assignment-modal') do
        select worker.full_name, from: 'worker-select'
        click_on 'Assign Worker'
      end
      
      # Verify updated event-level progress
      within("[data-event-id='#{event.id}']") do
        expect(page).to have_content('50%') # 1 of 2 shifts assigned
      end
    end
  end
  
  describe 'search and filtering' do
    let(:worker2) { create(:worker, skills_json: ['Bartender']) }
    
    it 'filters workers by skill in assignment modal' do
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      within('.assignment-modal') do
        # Should only show workers with Server skill
        expect(page).to have_content(worker.full_name)
        expect(page).not_to have_content(worker2.full_name)
      end
    end
    
    it 'allows searching workers by name' do
      visit '/events'
      click_on event.title
      
      within("[data-shift-id='#{shift.id}']") do
        click_on 'Assign Worker'
      end
      
      within('.assignment-modal') do
        fill_in 'search', with: worker.first_name
        expect(page).to have_content(worker.full_name)
        
        fill_in 'search', with: 'NonExistent'
        expect(page).not_to have_content(worker.full_name)
      end
    end
  end
end
