# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Events Index API with Aggregates', type: :request do
  let(:user) { create(:user) }
  let(:event) { create(:event, status: 'published') }
  let(:event_schedule) { create(:event_schedule, event: event) }
  let(:shift) { create(:shift, event: event) }
  let(:worker) { create(:worker) }

  before do
    sign_in user
  end

  describe 'GET /api/v1/events' do
    context 'with aggregates' do
      before do
        # Create assignments with different statuses
        create(:assignment, shift: shift, worker: worker, status: 'completed', hours_worked: 8.0, hourly_rate: 15.0)
        create(:assignment, shift: shift, worker: create(:worker), status: 'assigned', hours_worked: 5.0, hourly_rate: 18.0)
        create(:assignment, shift: shift, worker: create(:worker), status: 'no_show', hours_worked: 4.0, hourly_rate: 15.0)

        # Recalculate totals to ensure they're accurate
        Events::RecalculateTotals.new(event: event).call
        event.reload
      end

      it 'includes aggregates in lightweight serializer' do
        get '/api/v1/events', params: { tab: 'active' }

        expect(response).to have_http_status(:success)
        json = JSON.parse(response.body)
        event_data = json['data'].find { |e| e['id'] == event.id }

        expect(event_data).to include(
          'total_hours' => be_a(Numeric),
          'total_cost' => be_a(Numeric),
          'estimated_cost' => be_a(Numeric),
          'total_workers_needed' => be_a(Numeric),
          'assigned_workers_count' => be_a(Numeric),
          'hired_count' => be_a(Numeric),
          'required_count' => be_a(Numeric),
          'unfilled_roles_count' => be_a(Numeric),
          'staffing_percentage' => be_a(Numeric)
        )
      end

      it 'returns correct total_hours (excludes no_show)' do
        get '/api/v1/events', params: { tab: 'active' }

        json = JSON.parse(response.body)
        event_data = json['data'].find { |e| e['id'] == event.id }

        # Should include completed (8h) and assigned (5h), exclude no_show (4h)
        expect(event_data['total_hours']).to be_within(0.01).of(13.0)
      end

      it 'returns correct estimated_cost (excludes no_show)' do
        get '/api/v1/events', params: { tab: 'active' }

        json = JSON.parse(response.body)
        event_data = json['data'].find { |e| e['id'] == event.id }

        # Should include completed (8h * $15 = $120) and assigned (5h * $18 = $90), exclude no_show
        expect(event_data['estimated_cost']).to be_within(0.01).of(210.0)
      end

      it 'returns aggregates for completed events' do
        event.update!(status: 'completed')
        Events::RecalculateTotals.new(event: event).call

        get '/api/v1/events', params: { tab: 'completed' }

        expect(response).to have_http_status(:success)
        json = JSON.parse(response.body)
        event_data = json['data'].find { |e| e['id'] == event.id }

        expect(event_data['total_hours']).to be > 0
        expect(event_data['total_cost']).to be > 0
      end

      it 'does not cause N+1 queries' do
        # Create multiple events
        events = create_list(:event, 5, status: 'published')
        events.each do |e|
          create(:event_schedule, event: e)
          s = create(:shift, event: e)
          create(:assignment, shift: s, worker: create(:worker), status: 'completed', hours_worked: 8.0, hourly_rate: 15.0)
          Events::RecalculateTotals.new(event: e).call
        end

        expect {
          get '/api/v1/events', params: { tab: 'active' }
        }.to make_database_queries(count: 10..15) # Reasonable query count
      end

      it 'matches ground truth calculations' do
        # Calculate expected values manually
        valid_assignments = Assignment.joins(:shift)
          .where(shifts: { event_id: event.id })
          .where.not(status: [ 'cancelled', 'no_show' ])

        expected_hours = valid_assignments.sum(&:effective_hours).round(2)
        expected_cost = valid_assignments.sum(&:effective_pay).round(2)

        get '/api/v1/events', params: { tab: 'active' }

        json = JSON.parse(response.body)
        event_data = json['data'].find { |e| e['id'] == event.id }

        expect(event_data['total_hours']).to be_within(0.01).of(expected_hours)
        expect(event_data['estimated_cost']).to be_within(0.01).of(expected_cost)
      end
    end

    context 'with no assignments' do
      it 'returns zero aggregates' do
        get '/api/v1/events', params: { tab: 'active' }

        json = JSON.parse(response.body)
        event_data = json['data'].find { |e| e['id'] == event.id }

        expect(event_data['total_hours']).to eq(0)
        expect(event_data['estimated_cost']).to eq(0)
        expect(event_data['hired_count']).to eq(0)
      end
    end
  end
end
