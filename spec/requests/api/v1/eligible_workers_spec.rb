# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Eligible workers endpoint', type: :request do
  let(:user) { create(:user) }
  let(:event) { create(:event) }
  let!(:schedule) { create(:event_schedule, event: event, start_time_utc: 1.week.from_now, end_time_utc: 1.week.from_now + 4.hours) }
  let(:certification) { create(:certification, name: 'ServSafe') }
  let!(:requirement) do
    event.event_skill_requirements.create!(
      skill_name: 'Prep Cook',
      needed_workers: 1,
      required_certification_id: certification.id
    )
  end
  let!(:shift) do
    create(
      :shift,
      event: event,
      event_skill_requirement: requirement,
      role_needed: 'Prep Cook',
      start_time_utc: schedule.start_time_utc,
      end_time_utc: schedule.end_time_utc,
      required_cert_id: certification.id
    )
  end

  let!(:eligible_worker) do
    create(:worker, skills_json: ['Prep Cook']).tap do |worker|
      create(:worker_certification, worker: worker, certification: certification, expires_at_utc: schedule.end_time_utc + 1.day)
    end
  end

  let!(:worker_without_cert) { create(:worker, skills_json: ['Prep Cook']) }
  let!(:worker_with_expired_cert) do
    create(:worker, skills_json: ['Prep Cook']).tap do |worker|
      create(:worker_certification, worker: worker, certification: certification, expires_at_utc: schedule.start_time_utc - 1.day)
    end
  end

  let!(:conflicting_worker) do
    create(:worker, skills_json: ['Prep Cook']).tap do |worker|
      create(:worker_certification, worker: worker, certification: certification, expires_at_utc: schedule.end_time_utc + 2.days)
      conflicting_shift = create(
        :shift,
        start_time_utc: schedule.start_time_utc,
        end_time_utc: schedule.end_time_utc,
        role_needed: 'Prep Cook',
        created_by: user
      )
      create(:assignment, worker: worker, shift: conflicting_shift, status: 'assigned', assigned_by: user)
    end
  end

  before do
    sign_in user
    Current.user = user
  end

  it 'returns only workers who meet certification and availability rules' do
    get eligible_workers_api_v1_event_event_skill_requirement_path(event_id: event.id, id: requirement.id), params: { shift_id: shift.id }

    expect(response).to have_http_status(:success)
    body = json_response
    worker_ids = body.dig('data', 'eligible_workers').map { |w| w['id'] }
    expect(worker_ids).to contain_exactly(eligible_worker.id)

    role_payload = body.dig('data', 'role')
    expect(role_payload['required_certification']['id']).to eq(certification.id)

    shift_payload = body.dig('data', 'shift')
    expect(shift_payload['id']).to eq(shift.id)
  end

  def json_response
    JSON.parse(response.body)
  end
end

