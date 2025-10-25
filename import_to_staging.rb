# Import script for staging database
puts "=== IMPORTING DATA TO STAGING ==="

# Import Workers
workers_data = [
  {first_name: "Charlie", last_name: "Williams", email: "charlie.williams1@socialcatering.com", phone: "348-480-7114", skills_json: ["Captain", "Banquet Server/Runner"], hourly_rate: nil, active: true},
  {first_name: "Maria", last_name: "Garcia", email: "maria.garcia@socialcatering.com", phone: "555-1234", skills_json: ["Server", "Bartender"], hourly_rate: 18.50, active: true},
  {first_name: "John", last_name: "Smith", email: "john.smith@socialcatering.com", phone: "555-5678", skills_json: ["Prep Cook", "Line Cook"], hourly_rate: 20.00, active: true},
  {first_name: "Sarah", last_name: "Johnson", email: "sarah.johnson@socialcatering.com", phone: "555-9012", skills_json: ["Event Captain", "Server"], hourly_rate: 22.00, active: true},
  {first_name: "Mike", last_name: "Brown", email: "mike.brown@socialcatering.com", phone: "555-3456", skills_json: ["Dishwasher", "Busser"], hourly_rate: 16.00, active: true}
]

workers_data.each do |worker_data|
  worker = Worker.find_or_create_by(email: worker_data[:email]) do |w|
    w.first_name = worker_data[:first_name]
    w.last_name = worker_data[:last_name]
    w.phone = worker_data[:phone]
    w.skills_json = worker_data[:skills_json]
    w.hourly_rate = worker_data[:hourly_rate]
    w.active = worker_data[:active]
  end
  puts "Created/Updated worker: #{worker_data[:first_name]} #{worker_data[:last_name]}"
end

# Import Skills
skills_data = [
  {name: "Server", active: true},
  {name: "Bartender", active: true},
  {name: "Prep Cook", active: true},
  {name: "Line Cook", active: true},
  {name: "Event Captain", active: true},
  {name: "Dishwasher", active: true},
  {name: "Host/Hostess", active: true},
  {name: "Busser", active: true},
  {name: "Food Runner", active: true},
  {name: "Barback", active: true},
  {name: "Sous Chef", active: true},
  {name: "Pastry Chef", active: true},
  {name: "Captain", active: true},
  {name: "Banquet Server/Runner", active: true}
]

skills_data.each do |skill_data|
  skill = Skill.find_or_create_by(name: skill_data[:name]) do |s|
    s.active = skill_data[:active]
  end
  puts "Created/Updated skill: #{skill_data[:name]}"
end

# Import Locations
locations_data = [
  {name: "Downtown Convention Center", address: "123 Main St", city: "San Francisco", state: "CA", active: true},
  {name: "Golden Gate Park Pavilion", address: "456 Park Ave", city: "San Francisco", state: "CA", active: true},
  {name: "Marina District Hall", address: "789 Marina Blvd", city: "San Francisco", state: "CA", active: true},
  {name: "SOMA Event Space", address: "321 Mission St", city: "San Francisco", state: "CA", active: true},
  {name: "Financial District Venue", address: "654 Market St", city: "San Francisco", state: "CA", active: true},
  {name: "Castro Theater", address: "987 Castro St", city: "San Francisco", state: "CA", active: true},
  {name: "Mission District Center", address: "147 Valencia St", city: "San Francisco", state: "CA", active: true},
  {name: "Presidio Event Hall", address: "258 Presidio Ave", city: "San Francisco", state: "CA", active: true},
  {name: "Nob Hill Venue", address: "369 California St", city: "San Francisco", state: "CA", active: true},
  {name: "Chinatown Cultural Center", address: "741 Grant Ave", city: "San Francisco", state: "CA", active: true}
]

locations_data.each do |location_data|
  location = Location.find_or_create_by(name: location_data[:name]) do |l|
    l.address = location_data[:address]
    l.city = location_data[:city]
    l.state = location_data[:state]
    l.active = location_data[:active]
  end
  puts "Created/Updated location: #{location_data[:name]}"
end

# Import Shifts (after locations are created)
shifts_data = [
  {client_name: "Tech Conference Lunch", role_needed: "Server", start_time_utc: "2025-10-29T15:00:00Z", end_time_utc: "2025-10-29T19:00:00Z", capacity: 5, location_name: "Downtown Convention Center", pay_rate: 22.00, notes: "Black tie event", status: "published"},
  {client_name: "Wedding Reception", role_needed: "Bartender", start_time_utc: "2025-10-30T18:00:00Z", end_time_utc: "2025-10-30T23:00:00Z", capacity: 3, location_name: "Golden Gate Park Pavilion", pay_rate: 25.00, notes: "Premium bar service", status: "published"},
  {client_name: "Corporate Dinner", role_needed: "Event Captain", start_time_utc: "2025-10-31T19:00:00Z", end_time_utc: "2025-10-31T22:00:00Z", capacity: 2, location_name: "SOMA Event Space", pay_rate: 30.00, notes: "High-end corporate event", status: "published"},
  {client_name: "Birthday Party", role_needed: "Server", start_time_utc: "2025-11-01T16:00:00Z", end_time_utc: "2025-11-01T20:00:00Z", capacity: 4, location_name: "Marina District Hall", pay_rate: 20.00, notes: "Family celebration", status: "draft"},
  {client_name: "Fundraising Gala", role_needed: "Bartender", start_time_utc: "2025-11-02T19:00:00Z", end_time_utc: "2025-11-02T24:00:00Z", capacity: 6, location_name: "Financial District Venue", pay_rate: 28.00, notes: "Charity event", status: "published"}
]

shifts_data.each do |shift_data|
  location = Location.find_by(name: shift_data[:location_name])
  next unless location
  
  shift = Shift.find_or_create_by(
    client_name: shift_data[:client_name],
    start_time_utc: shift_data[:start_time_utc],
    end_time_utc: shift_data[:end_time_utc]
  ) do |s|
    s.role_needed = shift_data[:role_needed]
    s.capacity = shift_data[:capacity]
    s.location_id = location.id
    s.pay_rate = shift_data[:pay_rate]
    s.notes = shift_data[:notes]
    s.status = shift_data[:status]
  end
  puts "Created/Updated shift: #{shift_data[:client_name]}"
end

puts "\nImport complete!"
puts "Workers: #{Worker.count}"
puts "Skills: #{Skill.count}"
puts "Locations: #{Location.count}"
puts "Shifts: #{Shift.count}"
