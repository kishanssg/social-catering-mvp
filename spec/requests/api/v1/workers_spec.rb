# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Workers', type: :request do
  let(:user) { create(:user) }
  let(:worker) { create(:worker) }
  let(:certification) { create(:certification, name: 'ServSafe') }

  before do
    sign_in user
    Current.user = user
  end

  describe 'PATCH /api/v1/workers/:id' do
    it 'updates certification expiration without creating duplicates' do
      worker_cert = create(:worker_certification, worker: worker, certification: certification, expires_at_utc: 1.year.from_now)

      patch api_v1_worker_path(worker), params: {
        worker: {
          worker_certifications_attributes: {
            "0" => {
              id: worker_cert.id,
              certification_id: certification.id,
              expires_at_utc: '2030-01-01'
            }
          }
        }
      }

      expect(response).to have_http_status(:success)
      expect(worker_cert.reload.expires_at_utc.to_date).to eq(Date.parse('2030-01-01'))
      expect(worker.worker_certifications.count).to eq(1)
    end

    it 'keeps the latest duplicate certification entry in the same payload' do
      existing = create(:worker_certification, worker: worker, certification: certification, expires_at_utc: 1.year.from_now)

      patch api_v1_worker_path(worker), params: {
        worker: {
          worker_certifications_attributes: {
            "0" => {
              certification_id: certification.id,
              expires_at_utc: '2030-01-01'
            },
            "1" => {
              certification_id: certification.id,
              expires_at_utc: '2035-01-01'
            }
          }
        }
      }

      expect(response).to have_http_status(:success)
      expect(worker.reload.worker_certifications.count).to eq(1)
      expect(existing.reload.expires_at_utc.to_date).to eq(Date.parse('2035-01-01'))
    end

    it 'allows adding a new certification to an existing worker' do
      new_cert = create(:certification, name: 'Alcohol Service License')

      patch api_v1_worker_path(worker), params: {
        worker: {
          worker_certifications_attributes: {
            "0" => {
              certification_id: new_cert.id,
              expires_at_utc: '2031-05-05'
            }
          }
        }
      }

      expect(response).to have_http_status(:success)
      worker.reload
      expect(worker.worker_certifications.count).to eq(1)
      wc = worker.worker_certifications.first
      expect(wc.certification_id).to eq(new_cert.id)
      expect(wc.expires_at_utc.to_date).to eq(Date.parse('2031-05-05'))
    end

    it 'updates existing certification when id is omitted but certification_id matches' do
      worker_cert = create(:worker_certification, worker: worker, certification: certification, expires_at_utc: 1.year.from_now)

      patch api_v1_worker_path(worker), params: {
        worker: {
          worker_certifications_attributes: {
            "0" => {
              certification_id: certification.id,
              expires_at_utc: '2032-02-02'
            }
          }
        }
      }

      expect(response).to have_http_status(:success)
      expect(worker_cert.reload.expires_at_utc.to_date).to eq(Date.parse('2032-02-02'))
      expect(worker.worker_certifications.count).to eq(1)
    end
  end

  describe 'GET /api/v1/workers' do
    it 'orders inactive workers at the end by default' do
      active_worker = create(:worker, first_name: 'Alice', last_name: 'Active', active: true)
      inactive_worker = create(:worker, first_name: 'Bob', last_name: 'Inactive', active: false)
      another_active = create(:worker, first_name: 'Charlie', last_name: 'Alpha', active: true)

      get api_v1_workers_path

      expect(response).to have_http_status(:success)
      ids = json_response['data'].map { |w| w['id'] }
      # Active workers should appear before inactive ones
      expect(ids.index(inactive_worker.id)).to be > ids.index(active_worker.id)
      expect(ids.index(inactive_worker.id)).to be > ids.index(another_active.id)
      # The last worker should be inactive
      expect(json_response['data'].last['id']).to eq(inactive_worker.id)
      expect(json_response['data'].last['active']).to be(false)
    end
  end

  def json_response
    JSON.parse(response.body)
  end
end
