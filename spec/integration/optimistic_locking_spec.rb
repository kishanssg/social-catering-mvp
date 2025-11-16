# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Optimistic Locking', type: :request do
  let(:user) { create(:user) }
  let(:assignment) { create(:assignment, hours_worked: 5.0) }

  before do
    sign_in user
    Current.user = user
  end

  describe 'concurrent assignment updates' do
    it 'returns 409 conflict when assignment is stale' do
      # First request loads assignment
      assignment1 = Assignment.find(assignment.id)
      
      # Second request loads same assignment
      assignment2 = Assignment.find(assignment.id)
      
      # First request updates
      assignment1.update!(hours_worked: 7.0)
      
      # Second request tries to update (should fail)
      patch "/api/v1/approvals/#{assignment2.id}/update_hours", 
        params: { hours_worked: 8.0, lock_version: assignment2.lock_version }
      
      expect(response).to have_http_status(:conflict)
      expect(json_response['error']).to eq('stale_object')
      expect(json_response['current']).to be_present
    end

    it 'allows update when lock_version matches' do
      patch "/api/v1/approvals/#{assignment.id}/update_hours", 
        params: { hours_worked: 6.0, lock_version: assignment.lock_version }
      
      expect(response).to have_http_status(:success)
      expect(assignment.reload.hours_worked).to eq(6.0)
    end
  end

  private

  def json_response
    JSON.parse(response.body)
  end
end

