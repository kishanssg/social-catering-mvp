# Clear existing data (development only)
if Rails.env.development?
  puts "Clearing existing data..."
  ActivityLog.delete_all
  Assignment.delete_all
  Shift.delete_all
  WorkerCertification.delete_all
  Worker.delete_all
  Certification.delete_all
  User.delete_all
end

# Create admin users
puts "Creating admin users..."
admins = [
  { email: 'natalie@socialcatering.com', password: 'Password123!', role: 'admin' },
  { email: 'madison@socialcatering.com', password: 'Password123!', role: 'admin' },
  { email: 'sarah@socialcatering.com', password: 'Password123!', role: 'admin' }
]

admins.each do |admin_data|
  User.find_or_create_by!(email: admin_data[:email]) do |user|
    user.password = admin_data[:password]
    user.role = admin_data[:role]
  end
end
puts "Created #{User.count} admin users"

# Create certifications
puts "Creating certifications..."
cert_names = [ 'ServSafe', 'TIPS', 'Food Handler' ]
cert_names.each do |name|
  Certification.find_or_create_by!(name: name)
end
puts "Created #{Certification.count} certifications"

# Create sample workers
puts "Creating sample workers..."
5.times do |i|
  worker = Worker.create!(
    first_name: "Worker#{i+1}",
    last_name: "Test",
    email: "worker#{i+1}@test.com",
    phone: "555-000#{i+1}",
    skills_json: [ 'cooking', 'bartending', 'serving' ].sample(rand(1..2)),
    active: true
  )

  # Add certification to some workers
  if i < 3
    cert = Certification.all.sample
    WorkerCertification.create!(
      worker: worker,
      certification: cert,
      expires_at_utc: 1.year.from_now
    )
  end
end
puts "Created #{Worker.count} workers"

puts "\n=== Seed Data Complete ==="
puts "Admins: #{User.count}"
puts "Workers: #{Worker.count}"
puts "Certifications: #{Certification.count}"
puts "\nLogin credentials:"
puts "Email: natalie@socialcatering.com"
puts "Password: Password123!"
