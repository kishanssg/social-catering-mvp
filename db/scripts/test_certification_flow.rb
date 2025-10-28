# Test certification assignment flow
puts "Setting up test data..."

# 1. Ensure certification exists
cert = Certification.find_or_create_by!(name: "Food Handler Certificate")
puts "✓ Certification: #{cert.name} (ID: #{cert.id})"

# 2. Get or create test worker
worker = Worker.first || Worker.create!(
  first_name: "Test",
  last_name: "Worker",
  email: "test#{rand(1000)}@example.com",
  phone: "555-0100"
)
puts "✓ Worker: #{worker.first_name} #{worker.last_name} (ID: #{worker.id})"

# 3. Add certification
wc = WorkerCertification.find_or_initialize_by(
  worker_id: worker.id,
  certification_id: cert.id
)
wc.expires_at_utc = 1.year.from_now.end_of_day
wc.save!
puts "✓ Added certification, expires: #{wc.expires_at_utc}"

# 4. Create test shift
shift = Shift.create!(
  client_name: "Test Client",
  role_needed: "Server",
  location: "Main Office",
  start_time_utc: 1.day.from_now.beginning_of_day + 10.hours,
  end_time_utc: 1.day.from_now.beginning_of_day + 18.hours,
  capacity: 5,
  status: 'published',
  required_cert_id: cert.id
)
puts "✓ Shift created (ID: #{shift.id})"

# 5. Test assignment
assignment = Assignment.new(
  shift: shift,
  worker: worker,
  assigned_by: User.first,
  status: 'assigned',
  assigned_at_utc: Time.current
)

if assignment.valid?
  assignment.save!
  puts "✓ Assignment successful!"
else
  puts "✗ Assignment failed: #{assignment.errors.full_messages.join(', ')}"
end


