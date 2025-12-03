# Verification script for certification data integrity
puts "=== Global Certifications ==="
Certification.all.each { |c| puts "ID: #{c.id}, Name: #{c.name}" }

puts "\n=== Sample Worker Certifications ==="
worker = Worker.includes(worker_certifications: :certification).first
if worker
  puts "Worker: #{worker.first_name} #{worker.last_name}"
  worker.worker_certifications.each do |wc|
    puts "  - #{wc.certification.name} expires #{wc.expires_at_utc}"
  end
else
  puts "No workers found"
end

puts "\n=== Checking for Duplicates ==="
duplicates = WorkerCertification
  .select(:worker_id, :certification_id)
  .group(:worker_id, :certification_id)
  .having('COUNT(*) > 1')
  .count
puts duplicates.any? ? "Found duplicates: #{duplicates}" : "No duplicates found ✓"
