# Social Catering MVP - Staging Seed Data
# Tallahassee, FL based realistic data for staging environment

puts "🌱 Seeding Social Catering MVP Staging Data..."
puts "📍 Location: Tallahassee, Florida"
puts ""

# Clear existing data (except admin users)
puts "🧹 Cleaning existing data..."
Event.destroy_all
Worker.destroy_all
Assignment.destroy_all
Shift.destroy_all
EventSchedule.destroy_all
EventSkillRequirement.destroy_all
WorkerCertification.destroy_all
WorkerSkill.destroy_all

puts "✅ Cleanup complete"
puts ""

# Create Tallahassee Venues
puts "🏢 Creating Tallahassee venues..."

venues_data = [
  {
    place_id: "tallahassee-capital-city-country-club",
    name: "Capital City Country Club",
    formatted_address: "4800 Capital Circle NW, Tallahassee, FL 32303",
    latitude: 30.5074,
    longitude: -84.2508,
    phone: "(850) 386-1234",
    website: "https://capitalcitycc.com"
  },
  {
    place_id: "tallahassee-fsu-alumni-center",
    name: "Florida State University Alumni Center",
    formatted_address: "1030 W Tennessee St, Tallahassee, FL 32304",
    latitude: 30.4418,
    longitude: -84.2985,
    phone: "(850) 644-2761",
    website: "https://alumni.fsu.edu"
  },
  {
    place_id: "tallahassee-the-moon",
    name: "The Moon",
    formatted_address: "1105 E Lafayette St, Tallahassee, FL 32301",
    latitude: 30.4383,
    longitude: -84.2808,
    phone: "(850) 878-6900",
    website: "https://themoon.com"
  },
  {
    place_id: "tallahassee-hotel-duval",
    name: "Hotel Duval",
    formatted_address: "415 N Monroe St, Tallahassee, FL 32301",
    latitude: 30.4408,
    longitude: -84.2808,
    phone: "(850) 224-6000",
    website: "https://hotelduval.com"
  },
  {
    place_id: "tallahassee-goodwood-museum",
    name: "Goodwood Museum and Gardens",
    formatted_address: "1600 Miccosukee Rd, Tallahassee, FL 32308",
    latitude: 30.4567,
    longitude: -84.2345,
    phone: "(850) 877-4202",
    website: "https://goodwoodmuseum.org"
  },
  {
    place_id: "tallahassee-maclay-gardens",
    name: "Maclay Gardens State Park",
    formatted_address: "3540 Thomasville Rd, Tallahassee, FL 32309",
    latitude: 30.4567,
    longitude: -84.2345,
    phone: "(850) 487-4556",
    website: "https://floridastateparks.org"
  },
  {
    place_id: "tallahassee-aloft-downtown",
    name: "Aloft Tallahassee Downtown",
    formatted_address: "200 N Monroe St, Tallahassee, FL 32301",
    latitude: 30.4408,
    longitude: -84.2808,
    phone: "(850) 513-0313",
    website: "https://alofttallahassee.com"
  },
  {
    place_id: "tallahassee-lake-ella-pavilion",
    name: "The Pavilion at Lake Ella",
    formatted_address: "580 N Gadsden St, Tallahassee, FL 32301",
    latitude: 30.4567,
    longitude: -84.2808,
    phone: "(850) 891-3900",
    website: "https://lakeella.com"
  },
  {
    place_id: "tallahassee-mission-san-luis",
    name: "Mission San Luis",
    formatted_address: "2100 W Tennessee St, Tallahassee, FL 32304",
    latitude: 30.4418,
    longitude: -84.3200,
    phone: "(850) 245-6406",
    website: "https://missionsanluis.org"
  },
  {
    place_id: "tallahassee-museum",
    name: "Tallahassee Museum",
    formatted_address: "3945 Museum Dr, Tallahassee, FL 32310",
    latitude: 30.4567,
    longitude: -84.2808,
    phone: "(850) 575-8684",
    website: "https://tallahasseemuseum.org"
  }
]

venues = venues_data.map do |venue_data|
  Venue.create!(
    place_id: venue_data[:place_id],
    name: venue_data[:name],
    formatted_address: venue_data[:formatted_address],
    latitude: venue_data[:latitude],
    longitude: venue_data[:longitude],
    phone: venue_data[:phone],
    website: venue_data[:website],
    last_synced_at_utc: Time.current
  )
end

puts "✅ Created #{venues.count} Tallahassee venues"
puts ""

# Create Skills
puts "🎯 Creating catering skills..."

skills_data = [
  "Server", "Bartender", "Chef", "Line Cook", "Sous Chef", "Captain",
  "Busser", "Host/Hostess", "Banquet Server/Runner", "Dishwasher",
  "Prep Cook", "Event Helper"
]

skills = skills_data.map do |skill_name|
  Skill.find_or_create_by!(name: skill_name)
end

puts "✅ Created #{skills.count} catering skills"
puts ""

# Create Certifications
puts "📜 Creating certifications..."

certifications_data = [
  "Food Handler Certificate", "ServSafe Manager", "TIPS Certification",
  "Alcohol Service License", "SafeStaff", "CPR Certified", "First Aid Certified"
]

certifications = certifications_data.map do |cert_name|
  Certification.find_or_create_by!(name: cert_name)
end

puts "✅ Created #{certifications.count} certifications"
puts ""

# Create Workers
puts "👥 Creating Social Catering workers..."

workers_data = [
  # Active Workers (20)
  { first_name: "Emma", last_name: "Johnson", email: "emma.johnson@socialcatering.com", phone: "850-555-0101", skills: ["Server", "Captain"], certifications: ["ServSafe Manager", "TIPS Certification"] },
  { first_name: "Liam", last_name: "Williams", email: "liam.williams@socialcatering.com", phone: "850-555-0102", skills: ["Bartender", "Server"], certifications: ["TIPS Certification", "Alcohol Service License"] },
  { first_name: "Olivia", last_name: "Brown", email: "olivia.brown@socialcatering.com", phone: "850-555-0103", skills: ["Chef", "Sous Chef"], certifications: ["ServSafe Manager", "CPR Certified"] },
  { first_name: "Noah", last_name: "Jones", email: "noah.jones@socialcatering.com", phone: "850-555-0104", skills: ["Line Cook", "Prep Cook"], certifications: ["Food Handler Certificate"] },
  { first_name: "Ava", last_name: "Garcia", email: "ava.garcia@socialcatering.com", phone: "850-555-0105", skills: ["Server", "Host/Hostess"], certifications: ["ServSafe Manager"] },
  { first_name: "Sophia", last_name: "Miller", email: "sophia.miller@socialcatering.com", phone: "850-555-0106", skills: ["Bartender", "Captain"], certifications: ["TIPS Certification", "Alcohol Service License"] },
  { first_name: "Jackson", last_name: "Davis", email: "jackson.davis@socialcatering.com", phone: "850-555-0107", skills: ["Chef", "Line Cook"], certifications: ["ServSafe Manager", "CPR Certified"] },
  { first_name: "Isabella", last_name: "Rodriguez", email: "isabella.rodriguez@socialcatering.com", phone: "850-555-0108", skills: ["Server", "Busser"], certifications: ["Food Handler Certificate"] },
  { first_name: "Aiden", last_name: "Martinez", email: "aiden.martinez@socialcatering.com", phone: "850-555-0109", skills: ["Bartender", "Event Helper"], certifications: ["TIPS Certification"] },
  { first_name: "Mia", last_name: "Hernandez", email: "mia.hernandez@socialcatering.com", phone: "850-555-0110", skills: ["Server", "Banquet Server/Runner"], certifications: ["ServSafe Manager"] },
  { first_name: "Lucas", last_name: "Lopez", email: "lucas.lopez@socialcatering.com", phone: "850-555-0111", skills: ["Chef", "Prep Cook"], certifications: ["ServSafe Manager", "First Aid Certified"] },
  { first_name: "Charlotte", last_name: "Gonzalez", email: "charlotte.gonzalez@socialcatering.com", phone: "850-555-0112", skills: ["Server", "Host/Hostess"], certifications: ["Food Handler Certificate"] },
  { first_name: "Mason", last_name: "Wilson", email: "mason.wilson@socialcatering.com", phone: "850-555-0113", skills: ["Bartender", "Captain"], certifications: ["TIPS Certification", "Alcohol Service License"] },
  { first_name: "Amelia", last_name: "Anderson", email: "amelia.anderson@socialcatering.com", phone: "850-555-0114", skills: ["Line Cook", "Dishwasher"], certifications: ["Food Handler Certificate"] },
  { first_name: "Ethan", last_name: "Thomas", email: "ethan.thomas@socialcatering.com", phone: "850-555-0115", skills: ["Server", "Event Helper"], certifications: ["ServSafe Manager"] },
  { first_name: "Harper", last_name: "Taylor", email: "harper.taylor@socialcatering.com", phone: "850-555-0116", skills: ["Bartender", "Banquet Server/Runner"], certifications: ["TIPS Certification"] },
  { first_name: "Logan", last_name: "Moore", email: "logan.moore@socialcatering.com", phone: "850-555-0117", skills: ["Chef", "Sous Chef"], certifications: ["ServSafe Manager", "CPR Certified"] },
  { first_name: "Evelyn", last_name: "Jackson", email: "evelyn.jackson@socialcatering.com", phone: "850-555-0118", skills: ["Server", "Busser"], certifications: ["Food Handler Certificate"] },
  { first_name: "Sebastian", last_name: "Martin", email: "sebastian.martin@socialcatering.com", phone: "850-555-0119", skills: ["Bartender", "Event Helper"], certifications: ["TIPS Certification", "Alcohol Service License"] },
  { first_name: "Abigail", last_name: "Lee", email: "abigail.lee@socialcatering.com", phone: "850-555-0120", skills: ["Server", "Host/Hostess"], certifications: ["ServSafe Manager"] },
  
  # Inactive Workers (5)
  { first_name: "Alexander", last_name: "Perez", email: "alexander.perez@socialcatering.com", phone: "850-555-0121", skills: ["Line Cook", "Prep Cook"], certifications: ["Food Handler Certificate"], active: false },
  { first_name: "Emily", last_name: "Thompson", email: "emily.thompson@socialcatering.com", phone: "850-555-0122", skills: ["Server", "Captain"], certifications: ["ServSafe Manager"], active: false },
  { first_name: "Michael", last_name: "White", email: "michael.white@socialcatering.com", phone: "850-555-0123", skills: ["Bartender", "Event Helper"], certifications: ["TIPS Certification"], active: false },
  { first_name: "Elizabeth", last_name: "Harris", email: "elizabeth.harris@socialcatering.com", phone: "850-555-0124", skills: ["Chef", "Line Cook"], certifications: ["ServSafe Manager"], active: false },
  { first_name: "William", last_name: "Sanchez", email: "william.sanchez@socialcatering.com", phone: "850-555-0125", skills: ["Server", "Banquet Server/Runner"], certifications: ["Food Handler Certificate"], active: false }
]

workers = workers_data.map do |worker_data|
  skills_list = worker_data[:skills]
  certs_list = worker_data[:certifications] || []
  active_status = worker_data[:active] != false # Default to true unless explicitly false
  
  worker = Worker.create!(
    first_name: worker_data[:first_name],
    last_name: worker_data[:last_name],
    email: worker_data[:email],
    phone: worker_data[:phone],
    skills_json: skills_list,
    skills_text: skills_list.join(" "),
    skills_tsvector: skills_list.join(" "),
    active: active_status
  )
  
  # Add certifications
  certs_list.each do |cert_name|
    cert = Certification.find_by(name: cert_name)
    if cert
      WorkerCertification.create!(
        worker: worker,
        certification: cert,
        expires_at_utc: 1.year.from_now
      )
    end
  end
  
  worker
end

puts "✅ Created #{workers.count} workers (#{workers.count(&:active?)} active, #{workers.count(&:inactive?)} inactive)"
puts ""

# Create Events
puts "🎉 Creating Social Catering events..."

events_data = [
  # Draft Events (3)
  {
    title: "FSU Alumni Homecoming Gala",
    venue: venues[1], # FSU Alumni Center
    status: "draft",
    schedule: { start_time: "2025-11-15 18:00:00", end_time: "2025-11-15 23:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 8, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 4, pay_rate: 20.00 },
      { skill_name: "Captain", needed_workers: 2, pay_rate: 22.00 }
    ],
    supervisor_name: "Sarah Johnson",
    supervisor_phone: "850-555-0101"
  },
  {
    title: "Corporate Holiday Party",
    venue: venues[0], # Capital City Country Club
    status: "draft",
    schedule: { start_time: "2025-12-20 17:00:00", end_time: "2025-12-20 22:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 6, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 3, pay_rate: 20.00 },
      { skill_name: "Chef", needed_workers: 2, pay_rate: 25.00 }
    ],
    supervisor_name: "Mike Chen",
    supervisor_phone: "850-555-0102"
  },
  {
    title: "Wedding Reception - Smith Family",
    venue: venues[4], # Goodwood Museum
    status: "draft",
    schedule: { start_time: "2025-10-25 16:00:00", end_time: "2025-10-25 21:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 10, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 4, pay_rate: 20.00 },
      { skill_name: "Captain", needed_workers: 2, pay_rate: 22.00 },
      { skill_name: "Chef", needed_workers: 3, pay_rate: 25.00 }
    ],
    supervisor_name: "Lisa Rodriguez",
    supervisor_phone: "850-555-0103"
  },
  
  # Published Events (4)
  {
    title: "Business Networking Luncheon",
    venue: venues[2], # The Moon
    status: "published",
    schedule: { start_time: "2025-10-22 11:00:00", end_time: "2025-10-22 15:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 6, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 2, pay_rate: 20.00 },
      { skill_name: "Chef", needed_workers: 2, pay_rate: 25.00 }
    ],
    supervisor_name: "David Kim",
    supervisor_phone: "850-555-0104"
  },
  {
    title: "Charity Fundraiser Dinner",
    venue: venues[3], # Hotel Duval
    status: "published",
    schedule: { start_time: "2025-10-28 18:00:00", end_time: "2025-10-28 23:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 8, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 4, pay_rate: 20.00 },
      { skill_name: "Captain", needed_workers: 2, pay_rate: 22.00 },
      { skill_name: "Chef", needed_workers: 3, pay_rate: 25.00 }
    ],
    supervisor_name: "Emma Williams",
    supervisor_phone: "850-555-0105"
  },
  {
    title: "UF Homecoming Tailgate",
    venue: venues[7], # Lake Ella Pavilion
    status: "published",
    schedule: { start_time: "2025-11-02 10:00:00", end_time: "2025-11-02 16:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 8, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 4, pay_rate: 20.00 },
      { skill_name: "Chef", needed_workers: 3, pay_rate: 25.00 },
      { skill_name: "Event Helper", needed_workers: 4, pay_rate: 16.00 }
    ],
    supervisor_name: "Alex Thompson",
    supervisor_phone: "850-555-0106"
  },
  {
    title: "Private Birthday Celebration",
    venue: venues[5], # Maclay Gardens
    status: "published",
    schedule: { start_time: "2025-10-30 17:00:00", end_time: "2025-10-30 22:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 4, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 2, pay_rate: 20.00 },
      { skill_name: "Chef", needed_workers: 2, pay_rate: 25.00 }
    ],
    supervisor_name: "Jessica Martinez",
    supervisor_phone: "850-555-0107"
  },
  
  # Completed Events (3)
  {
    title: "Museum Fundraiser Gala",
    venue: venues[9], # Tallahassee Museum
    status: "completed",
    schedule: { start_time: "2025-10-15 18:00:00", end_time: "2025-10-15 23:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 8, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 4, pay_rate: 20.00 },
      { skill_name: "Captain", needed_workers: 2, pay_rate: 22.00 },
      { skill_name: "Chef", needed_workers: 3, pay_rate: 25.00 }
    ],
    supervisor_name: "Robert Davis",
    supervisor_phone: "850-555-0108"
  },
  {
    title: "Anniversary Dinner",
    venue: venues[6], # Aloft Downtown
    status: "completed",
    schedule: { start_time: "2025-10-12 18:00:00", end_time: "2025-10-12 22:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 4, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 2, pay_rate: 20.00 },
      { skill_name: "Chef", needed_workers: 2, pay_rate: 25.00 }
    ],
    supervisor_name: "Maria Garcia",
    supervisor_phone: "850-555-0109"
  },
  {
    title: "Graduation Party",
    venue: venues[8], # Mission San Luis
    status: "completed",
    schedule: { start_time: "2025-10-08 16:00:00", end_time: "2025-10-08 21:00:00", break_minutes: 30 },
    skill_requirements: [
      { skill_name: "Server", needed_workers: 6, pay_rate: 18.00 },
      { skill_name: "Bartender", needed_workers: 3, pay_rate: 20.00 },
      { skill_name: "Chef", needed_workers: 2, pay_rate: 25.00 }
    ],
    supervisor_name: "James Wilson",
    supervisor_phone: "850-555-0110"
  }
]

events = events_data.map do |event_data|
  event = Event.create!(
    title: event_data[:title],
    venue: event_data[:venue],
    status: event_data[:status],
    supervisor_name: event_data[:supervisor_name],
    supervisor_phone: event_data[:supervisor_phone],
    check_in_instructions: "Please arrive 15 minutes early. Check in at the main entrance with your supervisor. Wear black pants and white shirt. Bring your ID and any required certifications."
  )
  
  # Create event schedule
  schedule_data = event_data[:schedule]
  EventSchedule.create!(
    event: event,
    start_time_utc: Time.zone.parse(schedule_data[:start_time]).utc,
    end_time_utc: Time.zone.parse(schedule_data[:end_time]).utc,
    break_minutes: schedule_data[:break_minutes]
  )
  
  # Create skill requirements
  event_data[:skill_requirements].each do |req_data|
    EventSkillRequirement.create!(
      event: event,
      skill_name: req_data[:skill_name],
      needed_workers: req_data[:needed_workers],
      pay_rate: req_data[:pay_rate],
      description: "Professional #{req_data[:skill_name].downcase} for #{event.title}"
    )
  end
  
  # Generate shifts for published events
  if event.status == "published"
    event.generate_shifts!
    event.update!(published_at_utc: Time.current)
  end
  
  event
end

puts "✅ Created #{events.count} events (#{events.count { |e| e.status == 'draft' }} draft, #{events.count { |e| e.status == 'published' }} published, #{events.count { |e| e.status == 'completed' }} completed)"
puts ""

# Create some assignments for published events
puts "👥 Creating worker assignments..."

published_events = events.select { |e| e.status == "published" }
active_workers = workers.select(&:active?)

published_events.each_with_index do |event, event_index|
  event.shifts.limit(3).each_with_index do |shift, shift_index|
    worker = active_workers[(event_index * 3 + shift_index) % active_workers.length]
    
    Assignment.create!(
      shift: shift,
      worker: worker,
      status: "assigned",
      assigned_at_utc: Time.current,
      hourly_rate: shift.pay_rate || 18.00
    )
  end
end

puts "✅ Created #{Assignment.count} worker assignments"
puts ""

puts "🎉 Staging data seeding complete!"
puts ""
puts "📊 Final counts:"
puts "   Events: #{Event.count}"
puts "   Workers: #{Worker.count} (#{Worker.active.count} active)"
puts "   Venues: #{Venue.count}"
puts "   Shifts: #{Shift.count}"
puts "   Assignments: #{Assignment.count}"
puts ""
puts "🏢 All venues are in Tallahassee, FL"
puts "👥 All workers have realistic names and skills"
puts "🎉 All events are realistic Social Catering scenarios"
puts ""
puts "✅ Ready for staging environment!"
