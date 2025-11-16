# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Approvals', type: :request do
  let(:user) { create(:user) }
  let(:event) { create(:event, status: 'published') }
  let(:shift) { create(:shift, event: event, start_time_utc: 1.day.ago, end_time_utc: 1.hour.ago, capacity: 10, role_needed: 'Server') }
  let(:worker) { create(:worker, skills_json: ['Server']) }
  let(:assignment) { create(:assignment, shift: shift, worker: worker, status: 'assigned', approved: false, assigned_by: user) }

  before do
    sign_in user
    Current.user = user
  end

  describe 'POST /api/v1/events/:event_id/approve_selected' do
    context 'when idempotent' do
      it 'approves assignments on first call' do
        post "/api/v1/events/#{event.id}/approve_selected", params: { assignment_ids: [assignment.id] }
        
        expect(response).to have_http_status(:success)
        expect(assignment.reload.approved).to be true
        expect(json_response['data']['approved_count']).to eq(1)
      end

      it 'does not create duplicate activity logs on second call' do
        # First approval
        post "/api/v1/events/#{event.id}/approve_selected", params: { assignment_ids: [assignment.id] }
        first_log_count = ActivityLog.where(action: 'bulk_approve_assignments').count

        # Second approval (idempotent)
        post "/api/v1/events/#{event.id}/approve_selected", params: { assignment_ids: [assignment.id] }
        second_log_count = ActivityLog.where(action: 'bulk_approve_assignments').count

        expect(second_log_count).to eq(first_log_count)
        expect(json_response['data']['approved_count']).to eq(0) # No changes
      end

      it 'only logs changed assignments' do
        assignment2 = create(:assignment, shift: shift, worker: create(:worker, skills_json: ['Server']), status: 'assigned', approved: false, assigned_by: user)
        
        # Approve first assignment
        post "/api/v1/events/#{event.id}/approve_selected", params: { assignment_ids: [assignment.id] }
        
        # Approve both (one already approved)
        post "/api/v1/events/#{event.id}/approve_selected", params: { assignment_ids: [assignment.id, assignment2.id] }
        
        expect(json_response['data']['approved_count']).to eq(1) # Only assignment2
      end
    end

    context 'when no-show to cancel-no-show to approve flow' do
      it 'restores no-show assignment and allows approval' do
        # Mark as no-show
        assignment.update_columns(status: 'no_show', hours_worked: 0, approved: false)
        
        # Restore by editing hours (simulates cancel-no-show)
        patch "/api/v1/approvals/#{assignment.id}/update_hours", params: { hours_worked: 8.0 }
        expect(assignment.reload.status).to eq('assigned')
        
        # Now approve
        post "/api/v1/events/#{event.id}/approve_selected", params: { assignment_ids: [assignment.id] }
        expect(assignment.reload.approved).to be true
      end
    end
  end

  describe 'PATCH /api/v1/approvals/:id/update_hours' do
    it 'handles concurrent edits with optimistic locking' do
      # Simulate two concurrent updates
      assignment1 = Assignment.find(assignment.id)
      assignment2 = Assignment.find(assignment.id)
      
      assignment1.update!(hours_worked: 7.0)
      
      # Second update should fail with stale object error
      expect {
        assignment2.update!(hours_worked: 8.0)
      }.to raise_error(ActiveRecord::StaleObjectError)
    end
  end

  private

  def json_response
    JSON.parse(response.body)
  end
end

