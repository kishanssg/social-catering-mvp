namespace :fix do
  desc "Add a certification to a worker (env: WORKER_ID, CERT_NAME, EXPIRES)"
  task add_cert: :environment do
    worker_id = ENV['WORKER_ID'] || raise("WORKER_ID required")
    cert_name = ENV['CERT_NAME'] || 'Food Safety Manager'
    expires   = ENV['EXPIRES'] || '2026-12-31'

    worker = Worker.find(worker_id)
    cert = Certification.find_or_create_by!(name: cert_name)

    wc = WorkerCertification.find_or_initialize_by(worker_id: worker.id, certification_id: cert.id)
    wc.expires_at_utc = Date.parse(expires).end_of_day.utc
    wc.save!

    puts "\n✓ Added #{cert_name} to #{worker.first_name} #{worker.last_name} (expires #{wc.expires_at_utc})"
  end
end


