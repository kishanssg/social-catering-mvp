require 'securerandom'

# Clear existing data (CAUTION: Only for development!)
if Rails.env.development?
  puts "Clearing existing data..."
  Assignment.destroy_all
  Shift.destroy_all
  EventSkillRequirement.destroy_all
  EventSchedule.destroy_all
  Event.destroy_all
  WorkerCertification.destroy_all
  Certification.destroy_all
  Worker.destroy_all
  Venue.destroy_all
  ActivityLog.destroy_all
  puts "✓ Data cleared"
end

# Create or find 3 admin users for Social Catering
puts "\n👤 Creating admin users..."
admin_credentials = [
  { email: 'natalie@socialcatering.com', password: 'Password@123' },
  { email: 'madison@socialcatering.com', password: 'Password@123' },
  { email: 'sarah@socialcatering.com', password: 'Password@123' },
  { email: 'gravyadmin@socialcatering.com', password: 'gravyadmin@sc_mvp' }
]

admins = []
admin_credentials.each do |cred|
  admin = User.find_or_create_by!(email: cred[:email]) do |u|
    u.password = cred[:password]
    u.password_confirmation = cred[:password]
    u.role = 'admin'
  end
  admins << admin
  puts "  ✓ #{admin.email}"
end

# Use first admin as primary admin for seeds
admin = admins.first
puts "Using primary admin: #{admin.email} (id=#{admin.id})"

# ===== VENUES =====
puts "\nCreating venues..."
venues_data = [
  {
    name: "Capital City Country Club",
    formatted_address: "4800 Capital Circle NW, Tallahassee, FL 32303",
    latitude: 30.4858, longitude: -84.3502,
    arrival_instructions: "Enter through main gate, park in designated staff lot on left",
    parking_info: "Free parking in staff lot. Do not park in member spaces.",
    phone: "850-893-6108"
  },
  {
    name: "Florida State University Alumni Center",
    formatted_address: "1030 W Tennessee St, Tallahassee, FL 32304",
    latitude: 30.4438, longitude: -84.2982,
    arrival_instructions: "Enter through Stadium Drive entrance, check in at front desk",
    parking_info: "Parking garage adjacent to building - first 2 hours free with validation",
    phone: "850-644-2761"
  },
  {
    name: "The Moon",
    formatted_address: "1105 E Lafayette St, Tallahassee, FL 32301",
    latitude: 30.4527, longitude: -84.2738,
    arrival_instructions: "Staff entrance on side alley, knock and identify yourself",
    parking_info: "Street parking on Lafayette or use public lot on Monroe St",
    phone: "850-222-6666"
  },
  {
    name: "Hotel Duval",
    formatted_address: "415 N Monroe St, Tallahassee, FL 32301",
    latitude: 30.4434, longitude: -84.2807,
    arrival_instructions: "Check in at catering office on 2nd floor, use staff elevator",
    parking_info: "Valet parking available, or use parking garage with validation",
    phone: "850-224-6000"
  },
  {
    name: "Goodwood Museum and Gardens",
    formatted_address: "1600 Miccosukee Rd, Tallahassee, FL 32308",
    latitude: 30.4829, longitude: -84.2459,
    arrival_instructions: "Enter through service entrance, follow signs to event area",
    parking_info: "Park in designated staff area behind main building",
    phone: "850-877-4202"
  },
  {
    name: "University of Florida Reitz Union",
    formatted_address: "686 Museum Rd, Gainesville, FL 32611",
    latitude: 29.6462, longitude: -82.3474,
    arrival_instructions: "Report to event services office on 2nd floor",
    parking_info: "Use parking garage #5, validation provided",
    phone: "352-392-1614"
  },
  {
    name: "Cade Museum",
    formatted_address: "811 S Main St, Gainesville, FL 32601",
    latitude: 29.6435, longitude: -82.3248,
    arrival_instructions: "Staff entrance on rear of building, buzz for entry",
    parking_info: "Free parking in museum lot after 5pm",
    phone: "352-371-8001"
  },
  {
    name: "Sweetwater Branch Inn",
    formatted_address: "625 E University Ave, Gainesville, FL 32601",
    latitude: 29.6501, longitude: -82.3182,
    arrival_instructions: "Check in at main house reception",
    parking_info: "Park on street or in designated area behind property",
    phone: "352-373-6760"
  },
  {
    name: "Haile Plantation Golf & Country Club",
    formatted_address: "12690 SW Williston Rd, Gainesville, FL 32608",
    latitude: 29.6019, longitude: -82.4365,
    arrival_instructions: "Enter through service entrance, report to kitchen manager",
    parking_info: "Staff parking behind clubhouse",
    phone: "352-335-6000"
  },
  {
    name: "The Warehouse",
    formatted_address: "305 S Main St, Gainesville, FL 32601",
    latitude: 29.6470, longitude: -82.3246,
    arrival_instructions: "Main entrance on Main St, check in with event coordinator",
    parking_info: "Street parking or city parking garage on 1st Ave",
    phone: "352-871-9294"
  }
]
venues = venues_data.map do |venue_data|
  Venue.create!(venue_data.merge(place_id: SecureRandom.uuid))
end
puts "✓ Created #{venues.count} venues"

# ===== WORKERS =====
puts "\nCreating workers..."
first_names = %w[Alex Jordan Taylor Morgan Casey Riley Drew Avery Quinn Jamie Sam Dakota Reese Charlie Skylar Payton Rowan Sage River Phoenix Emerson Harper Finley Cameron Parker]
last_names  = %w[Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez Hernandez Lopez Gonzalez Wilson Anderson Thomas Taylor Moore Jackson Martin Lee Walker Hall Allen Young]
all_skills  = ["Bartender","Banquet Server/Runner","Captain","Event Helper","Prep Cook"]

workers = []
25.times do |i|
  first_name = first_names.sample
  last_name  = last_names.sample
  worker_skills = all_skills.sample(rand(2..4))
  worker = Worker.create!(
    first_name: first_name,
    last_name: last_name,
    email: "#{first_name.downcase}.#{last_name.downcase}#{i}@socialcatering.com",
    phone: format("%03d-%03d-%04d", rand(200..999), rand(200..999), rand(1000..9999)),
    active: [true, true, true, false].sample,
    skills_json: worker_skills
  )

  # Add 1-2 certifications for some workers via join model
  if [true, false].sample
    cert_name = ["Food Handler Certificate","ServSafe","TIPS Certification","Alcohol Service License"].sample
    cert = Certification.find_or_create_by!(name: cert_name)
    WorkerCertification.create!(worker: worker, certification: cert, expires_at_utc: rand(1..24).months.from_now)
  end

  workers << worker
  print "."
end
puts "\n✓ Created #{workers.count} workers"

# ===== EVENTS =====
puts "\nCreating events..."
event_templates = [
  { title: "Corporate Holiday Gala", venue: venues[0], skills: [{skill: "Event Helper", count: 5},{skill: "Bartender", count: 2},{skill: "Captain", count: 1}], days_from_now: 3, duration_hours: 5, status: "published" },
  { title: "FSU Alumni Wedding Reception", venue: venues[1], skills: [{skill: "Event Helper", count: 4},{skill: "Bartender", count: 2},{skill: "Banquet Server/Runner", count: 2}], days_from_now: 7, duration_hours: 4, status: "published" },
  { title: "Private Birthday Party", venue: venues[2], skills: [{skill: "Bartender", count: 1},{skill: "Event Helper", count: 2}], days_from_now: 10, duration_hours: 6, status: "published" },
  { title: "Business Networking Event", venue: venues[3], skills: [{skill: "Event Helper", count: 3},{skill: "Bartender", count: 1}], days_from_now: 14, duration_hours: 3, status: "published" },
  { title: "Garden Wedding Ceremony & Reception", venue: venues[4], skills: [{skill: "Event Helper", count: 6},{skill: "Bartender", count: 2},{skill: "Captain", count: 1},{skill: "Banquet Server/Runner", count: 2}], days_from_now: 21, duration_hours: 6, status: "draft" },
  { title: "UF Homecoming Tailgate", venue: venues[5], skills: [{skill: "Event Helper", count: 4},{skill: "Bartender", count: 2}], days_from_now: 28, duration_hours: 4, status: "draft" },
  { title: "Museum Fundraiser Gala", venue: venues[6], skills: [{skill: "Event Helper", count: 5},{skill: "Bartender", count: 2},{skill: "Captain", count: 1}], days_from_now: -7, duration_hours: 5, status: "completed" },
  { title: "Intimate Anniversary Dinner", venue: venues[7], skills: [{skill: "Event Helper", count: 1},{skill: "Prep Cook", count: 1}], days_from_now: -3, duration_hours: 3, status: "completed" },
  { title: "Country Club Charity Golf Tournament", venue: venues[8], skills: [{skill: "Event Helper", count: 4},{skill: "Bartender", count: 3},{skill: "Banquet Server/Runner", count: 2}], days_from_now: 35, duration_hours: 8, status: "draft" },
  { title: "Downtown Concert After-Party", venue: venues[9], skills: [{skill: "Bartender", count: 3},{skill: "Banquet Server/Runner", count: 2}], days_from_now: 42, duration_hours: 5, status: "draft" }
]

supervisors = [
  { name: "Sarah Johnson", phone: "850-555-0101" },
  { name: "Mike Chen", phone: "850-555-0102" },
  { name: "Lisa Rodriguez", phone: "352-555-0103" },
  { name: "David Kim", phone: "352-555-0104" },
  { name: "Emma Williams", phone: "850-555-0105" }
]

events = []
event_templates.each do |template|
  start_time = template[:days_from_now].days.from_now.change(hour: [16,17,18,19].sample, min: 0)
  end_time   = start_time + template[:duration_hours].hours
  supervisor = supervisors.sample

  event = Event.create!(
    title: template[:title],
    status: template[:status],
    venue: template[:venue],
    check_in_instructions: "Please arrive 15 minutes early. Check in at the main entrance and ask for the event coordinator. Uniform: #{['Black & White','All Black','White Shirt & Black Pants','Provided Uniform'].sample}",
    supervisor_name: supervisor[:name],
    supervisor_phone: supervisor[:phone]
  )

  template[:skills].each do |skill_data|
    event.event_skill_requirements.create!(
      skill_name: skill_data[:skill],
      needed_workers: skill_data[:count],
      uniform_name: ['Black & White','All Black','The Bistro','Formal Attire'].sample,
      certification_name: ['Bartender','Event Helper','Banquet Server/Runner'].include?(skill_data[:skill]) ? ['TIPS','ServSafe',nil].sample : nil
    )
  end

  event.create_event_schedule!(
    start_time_utc: start_time,
    end_time_utc: end_time,
    break_minutes: [0,15,30].sample
  )

  # Generate shifts if published
  Current.user = admin
  event.generate_shifts! if event.status == 'published'
  Current.user = nil

  events << event
  print "."
end
puts "\n✓ Created #{events.count} events"

# ===== ASSIGNMENTS =====
puts "\nCreating assignments for published events..."
published_events = events.select { |e| e.status == 'published' }

published_events.each do |event|
  shifts_to_fill = (event.shifts.count * rand(0.4..0.8)).to_i
  event.shifts.shuffle.first(shifts_to_fill).each do |shift|
    # Find eligible workers with matching skill and availability
    eligible_workers = workers.select do |worker|
      worker.active && worker.skills_json&.include?(shift.role_needed) && shift.can_assign_worker?(worker)
    end
    next if eligible_workers.empty?
    worker = eligible_workers.sample

    hours = if event.status == 'completed'
      ((shift.end_time_utc - shift.start_time_utc) / 1.hour).round(1)
    else
      [true, false].sample ? rand(3.0..8.0).round(1) : nil
    end

    Assignment.create!(
      worker: worker,
      shift: shift,
      assigned_by: admin,
      assigned_at_utc: Time.current,
      hours_worked: hours,
      status: event.status == 'completed' ? 'completed' : 'assigned'
    )
    print "."
  end
end
puts "\n✓ Created assignments"

# ===== SUMMARY =====
puts "\n" + "="*50
puts "SEED DATA SUMMARY"
puts "="*50
puts "\nVenues: #{Venue.count}"
puts "Workers: #{Worker.count}"
puts "  - Active: #{Worker.where(active: true).count}"
puts "  - Inactive: #{Worker.where(active: false).count}"
puts "\nEvents: #{Event.count}"
puts "  - Draft: #{Event.draft.count}"
puts "  - Published: #{Event.published.count}"
puts "  - Completed: #{Event.completed.count}"
puts "\nShifts: #{Shift.count}"
puts "  - Needs Workers: #{Shift.needing_workers.count}"
puts "  - Fully Staffed: #{Shift.fully_staffed.count}"
puts "  - In Progress: #{Shift.in_progress.count}"
puts "  - Completed: #{Shift.completed.count}"
puts "\nAssignments: #{Assignment.count}"
puts "  - With Hours: #{Assignment.with_hours.count}"
puts "  - Without Hours: #{Assignment.where(hours_worked: nil).count}"
puts "\nCertifications: #{Certification.count}"
puts "\n" + "="*50
puts "✓ SEED DATA COMPLETE!"
puts "="*50

# Print sample event details
puts "\nSample Event Details:"
sample_event = Event.published.first
if sample_event
  puts "\n#{sample_event.title}"
  puts "  Venue: #{sample_event.venue.name}"
  puts "  Date: #{sample_event.event_schedule.start_time_utc.strftime('%A, %B %d, %Y at %I:%M %p')}"
  puts "  Staffing: #{sample_event.staffing_summary} (#{sample_event.staffing_percentage}%)"
  puts "  Status: #{sample_event.staffing_status}"
  puts "\n  Shifts:"
  sample_event.shifts.each do |shift|
    puts "    - #{shift.role_needed}: #{shift.staffing_summary} [#{shift.current_status}]"
  end
end

