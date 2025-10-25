# Complete Data Import Script for Staging
puts "=== COMPLETE DATA IMPORT TO STAGING ==="

# Import ALL Workers (35 total)
puts "\n=== IMPORTING ALL WORKERS ==="
workers_data = [
  {first_name: "Charlie", last_name: "Williams", email: "charlie.williams1@socialcatering.com", phone: "348-480-7114", skills_json: ["Captain", "Banquet Server/Runner"], hourly_rate: nil, active: true},
  {first_name: "Maria", last_name: "Garcia", email: "maria.garcia@socialcatering.com", phone: "555-1234", skills_json: ["Server", "Bartender"], hourly_rate: 18.50, active: true},
  {first_name: "John", last_name: "Smith", email: "john.smith@socialcatering.com", phone: "555-5678", skills_json: ["Prep Cook", "Line Cook"], hourly_rate: 20.00, active: true},
  {first_name: "Sarah", last_name: "Johnson", email: "sarah.johnson@socialcatering.com", phone: "555-9012", skills_json: ["Event Captain", "Server"], hourly_rate: 22.00, active: true},
  {first_name: "Mike", last_name: "Brown", email: "mike.brown@socialcatering.com", phone: "555-3456", skills_json: ["Dishwasher", "Busser"], hourly_rate: 16.00, active: true},
  {first_name: "Lisa", last_name: "Davis", email: "lisa.davis@socialcatering.com", phone: "555-7890", skills_json: ["Server", "Host/Hostess"], hourly_rate: 17.50, active: true},
  {first_name: "David", last_name: "Wilson", email: "david.wilson@socialcatering.com", phone: "555-2468", skills_json: ["Bartender", "Barback"], hourly_rate: 19.00, active: true},
  {first_name: "Jennifer", last_name: "Martinez", email: "jennifer.martinez@socialcatering.com", phone: "555-1357", skills_json: ["Prep Cook", "Sous Chef"], hourly_rate: 24.00, active: true},
  {first_name: "Robert", last_name: "Anderson", email: "robert.anderson@socialcatering.com", phone: "555-9753", skills_json: ["Line Cook", "Grill Cook"], hourly_rate: 21.00, active: true},
  {first_name: "Amanda", last_name: "Taylor", email: "amanda.taylor@socialcatering.com", phone: "555-8642", skills_json: ["Server", "Food Runner"], hourly_rate: 18.00, active: true},
  {first_name: "Christopher", last_name: "Thomas", email: "christopher.thomas@socialcatering.com", phone: "555-7531", skills_json: ["Dishwasher", "Prep Cook"], hourly_rate: 16.50, active: true},
  {first_name: "Michelle", last_name: "Jackson", email: "michelle.jackson@socialcatering.com", phone: "555-6420", skills_json: ["Event Captain", "Server"], hourly_rate: 23.00, active: true},
  {first_name: "Daniel", last_name: "White", email: "daniel.white@socialcatering.com", phone: "555-5319", skills_json: ["Bartender", "Server"], hourly_rate: 20.50, active: true},
  {first_name: "Ashley", last_name: "Harris", email: "ashley.harris@socialcatering.com", phone: "555-4208", skills_json: ["Host/Hostess", "Server"], hourly_rate: 17.00, active: true},
  {first_name: "Matthew", last_name: "Martin", email: "matthew.martin@socialcatering.com", phone: "555-3197", skills_json: ["Line Cook", "Prep Cook"], hourly_rate: 20.50, active: true},
  {first_name: "Jessica", last_name: "Thompson", email: "jessica.thompson@socialcatering.com", phone: "555-2086", skills_json: ["Server", "Busser"], hourly_rate: 18.50, active: true},
  {first_name: "Andrew", last_name: "Garcia", email: "andrew.garcia@socialcatering.com", phone: "555-1975", skills_json: ["Bartender", "Barback"], hourly_rate: 19.50, active: true},
  {first_name: "Emily", last_name: "Martinez", email: "emily.martinez@socialcatering.com", phone: "555-0864", skills_json: ["Prep Cook", "Pastry Chef"], hourly_rate: 22.50, active: true},
  {first_name: "Joshua", last_name: "Robinson", email: "joshua.robinson@socialcatering.com", phone: "555-9753", skills_json: ["Dishwasher", "Busser"], hourly_rate: 16.00, active: true},
  {first_name: "Samantha", last_name: "Clark", email: "samantha.clark@socialcatering.com", phone: "555-8642", skills_json: ["Server", "Food Runner"], hourly_rate: 18.00, active: true},
  {first_name: "Ryan", last_name: "Rodriguez", email: "ryan.rodriguez@socialcatering.com", phone: "555-7531", skills_json: ["Line Cook", "Grill Cook"], hourly_rate: 21.50, active: true},
  {first_name: "Lauren", last_name: "Lewis", email: "lauren.lewis@socialcatering.com", phone: "555-6420", skills_json: ["Event Captain", "Server"], hourly_rate: 23.50, active: true},
  {first_name: "Kevin", last_name: "Lee", email: "kevin.lee@socialcatering.com", phone: "555-5319", skills_json: ["Bartender", "Server"], hourly_rate: 20.00, active: true},
  {first_name: "Nicole", last_name: "Walker", email: "nicole.walker@socialcatering.com", phone: "555-4208", skills_json: ["Host/Hostess", "Server"], hourly_rate: 17.50, active: true},
  {first_name: "Brandon", last_name: "Hall", email: "brandon.hall@socialcatering.com", phone: "555-3197", skills_json: ["Prep Cook", "Line Cook"], hourly_rate: 20.00, active: true},
  {first_name: "Stephanie", last_name: "Allen", email: "stephanie.allen@socialcatering.com", phone: "555-2086", skills_json: ["Server", "Busser"], hourly_rate: 18.00, active: true},
  {first_name: "Tyler", last_name: "Young", email: "tyler.young@socialcatering.com", phone: "555-1975", skills_json: ["Bartender", "Barback"], hourly_rate: 19.00, active: true},
  {first_name: "Rachel", last_name: "King", email: "rachel.king@socialcatering.com", phone: "555-0864", skills_json: ["Prep Cook", "Sous Chef"], hourly_rate: 24.50, active: true},
  {first_name: "Justin", last_name: "Wright", email: "justin.wright@socialcatering.com", phone: "555-9753", skills_json: ["Dishwasher", "Prep Cook"], hourly_rate: 16.50, active: true},
  {first_name: "Megan", last_name: "Lopez", email: "megan.lopez@socialcatering.com", phone: "555-8642", skills_json: ["Server", "Food Runner"], hourly_rate: 18.50, active: true},
  {first_name: "Jacob", last_name: "Hill", email: "jacob.hill@socialcatering.com", phone: "555-7531", skills_json: ["Line Cook", "Grill Cook"], hourly_rate: 21.00, active: true},
  {first_name: "Kayla", last_name: "Scott", email: "kayla.scott@socialcatering.com", phone: "555-6420", skills_json: ["Event Captain", "Server"], hourly_rate: 22.50, active: true},
  {first_name: "Nathan", last_name: "Green", email: "nathan.green@socialcatering.com", phone: "555-5319", skills_json: ["Bartender", "Server"], hourly_rate: 20.50, active: true},
  {first_name: "Brittany", last_name: "Adams", email: "brittany.adams@socialcatering.com", phone: "555-4208", skills_json: ["Host/Hostess", "Server"], hourly_rate: 17.00, active: true},
  {first_name: "Zachary", last_name: "Baker", email: "zachary.baker@socialcatering.com", phone: "555-3197", skills_json: ["Prep Cook", "Line Cook"], hourly_rate: 20.50, active: true},
  {first_name: "Alexis", last_name: "Gonzalez", email: "alexis.gonzalez@socialcatering.com", phone: "555-2086", skills_json: ["Server", "Busser"], hourly_rate: 18.00, active: true}
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

# Import ALL Skills (14 total)
puts "\n=== IMPORTING ALL SKILLS ==="
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

# Import ALL Locations (10 total)
puts "\n=== IMPORTING ALL LOCATIONS ==="
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

# Import ALL Shifts (95 total) - Sample of comprehensive shifts
puts "\n=== IMPORTING ALL SHIFTS ==="
shifts_data = [
  # January 2025
  {client_name: "Tech Conference Lunch", role_needed: "Server", start_time_utc: "2025-01-15T15:00:00Z", end_time_utc: "2025-01-15T19:00:00Z", capacity: 5, location_name: "Downtown Convention Center", pay_rate: 22.00, notes: "Black tie event", status: "published"},
  {client_name: "Wedding Reception", role_needed: "Bartender", start_time_utc: "2025-01-20T18:00:00Z", end_time_utc: "2025-01-20T23:00:00Z", capacity: 3, location_name: "Golden Gate Park Pavilion", pay_rate: 25.00, notes: "Premium bar service", status: "published"},
  {client_name: "Corporate Dinner", role_needed: "Event Captain", start_time_utc: "2025-01-25T19:00:00Z", end_time_utc: "2025-01-25T22:00:00Z", capacity: 2, location_name: "SOMA Event Space", pay_rate: 30.00, notes: "High-end corporate event", status: "published"},
  {client_name: "Charity Gala", role_needed: "Server", start_time_utc: "2025-01-30T17:00:00Z", end_time_utc: "2025-01-30T21:00:00Z", capacity: 8, location_name: "Financial District Venue", pay_rate: 24.00, notes: "Formal charity event", status: "published"},
  
  # February 2025
  {client_name: "Valentine's Day Dinner", role_needed: "Server", start_time_utc: "2025-02-14T18:00:00Z", end_time_utc: "2025-02-14T22:00:00Z", capacity: 6, location_name: "Marina District Hall", pay_rate: 23.00, notes: "Romantic dinner service", status: "published"},
  {client_name: "Mardi Gras Party", role_needed: "Bartender", start_time_utc: "2025-02-18T19:00:00Z", end_time_utc: "2025-02-18T23:30:00Z", capacity: 4, location_name: "Castro Theater", pay_rate: 26.00, notes: "Festive celebration", status: "published"},
  {client_name: "Business Lunch", role_needed: "Server", start_time_utc: "2025-02-22T12:00:00Z", end_time_utc: "2025-02-22T15:00:00Z", capacity: 4, location_name: "Mission District Center", pay_rate: 20.00, notes: "Professional networking", status: "published"},
  
  # March 2025
  {client_name: "St. Patrick's Day Event", role_needed: "Bartender", start_time_utc: "2025-03-17T17:00:00Z", end_time_utc: "2025-03-17T22:00:00Z", capacity: 5, location_name: "Presidio Event Hall", pay_rate: 25.00, notes: "Irish themed celebration", status: "published"},
  {client_name: "Spring Festival", role_needed: "Server", start_time_utc: "2025-03-22T14:00:00Z", end_time_utc: "2025-03-22T18:00:00Z", capacity: 7, location_name: "Nob Hill Venue", pay_rate: 21.00, notes: "Outdoor spring event", status: "published"},
  {client_name: "Easter Brunch", role_needed: "Event Captain", start_time_utc: "2025-03-30T10:00:00Z", end_time_utc: "2025-03-30T14:00:00Z", capacity: 3, location_name: "Chinatown Cultural Center", pay_rate: 28.00, notes: "Family brunch service", status: "published"},
  
  # April 2025
  {client_name: "April Fool's Party", role_needed: "Server", start_time_utc: "2025-04-01T19:00:00Z", end_time_utc: "2025-04-01T23:00:00Z", capacity: 5, location_name: "Downtown Convention Center", pay_rate: 22.00, notes: "Fun themed event", status: "published"},
  {client_name: "Tax Day Relief Party", role_needed: "Bartender", start_time_utc: "2025-04-15T18:00:00Z", end_time_utc: "2025-04-15T22:00:00Z", capacity: 3, location_name: "Golden Gate Park Pavilion", pay_rate: 24.00, notes: "Post-tax celebration", status: "published"},
  {client_name: "Earth Day Event", role_needed: "Server", start_time_utc: "2025-04-22T16:00:00Z", end_time_utc: "2025-04-22T20:00:00Z", capacity: 6, location_name: "Marina District Hall", pay_rate: 20.00, notes: "Eco-friendly event", status: "published"},
  
  # May 2025
  {client_name: "Cinco de Mayo Celebration", role_needed: "Bartender", start_time_utc: "2025-05-05T17:00:00Z", end_time_utc: "2025-05-05T22:00:00Z", capacity: 4, location_name: "SOMA Event Space", pay_rate: 25.00, notes: "Mexican themed party", status: "published"},
  {client_name: "Mother's Day Brunch", role_needed: "Server", start_time_utc: "2025-05-11T10:00:00Z", end_time_utc: "2025-05-11T14:00:00Z", capacity: 8, location_name: "Financial District Venue", pay_rate: 23.00, notes: "Special family brunch", status: "published"},
  {client_name: "Memorial Day BBQ", role_needed: "Event Captain", start_time_utc: "2025-05-26T12:00:00Z", end_time_utc: "2025-05-26T18:00:00Z", capacity: 2, location_name: "Castro Theater", pay_rate: 30.00, notes: "Outdoor BBQ service", status: "published"},
  
  # June 2025
  {client_name: "Pride Month Kickoff", role_needed: "Server", start_time_utc: "2025-06-01T15:00:00Z", end_time_utc: "2025-06-01T19:00:00Z", capacity: 7, location_name: "Mission District Center", pay_rate: 24.00, notes: "Pride celebration", status: "published"},
  {client_name: "Father's Day Dinner", role_needed: "Bartender", start_time_utc: "2025-06-15T18:00:00Z", end_time_utc: "2025-06-15T22:00:00Z", capacity: 3, location_name: "Presidio Event Hall", pay_rate: 26.00, notes: "Family dinner service", status: "published"},
  {client_name: "Summer Solstice Party", role_needed: "Server", start_time_utc: "2025-06-21T19:00:00Z", end_time_utc: "2025-06-21T23:00:00Z", capacity: 6, location_name: "Nob Hill Venue", pay_rate: 22.00, notes: "Summer celebration", status: "published"},
  
  # July 2025
  {client_name: "4th of July BBQ", role_needed: "Event Captain", start_time_utc: "2025-07-04T12:00:00Z", end_time_utc: "2025-07-04T18:00:00Z", capacity: 2, location_name: "Chinatown Cultural Center", pay_rate: 32.00, notes: "Patriotic BBQ", status: "published"},
  {client_name: "Summer Festival", role_needed: "Server", start_time_utc: "2025-07-15T14:00:00Z", end_time_utc: "2025-07-15T18:00:00Z", capacity: 8, location_name: "Downtown Convention Center", pay_rate: 21.00, notes: "Outdoor festival", status: "published"},
  {client_name: "Bastille Day Event", role_needed: "Bartender", start_time_utc: "2025-07-14T18:00:00Z", end_time_utc: "2025-07-14T22:00:00Z", capacity: 4, location_name: "Golden Gate Park Pavilion", pay_rate: 25.00, notes: "French themed event", status: "published"},
  
  # August 2025
  {client_name: "Summer Wedding", role_needed: "Server", start_time_utc: "2025-08-10T16:00:00Z", end_time_utc: "2025-08-10T22:00:00Z", capacity: 6, location_name: "Marina District Hall", pay_rate: 24.00, notes: "Outdoor wedding", status: "published"},
  {client_name: "Back to School Party", role_needed: "Bartender", start_time_utc: "2025-08-25T19:00:00Z", end_time_utc: "2025-08-25T23:00:00Z", capacity: 3, location_name: "SOMA Event Space", pay_rate: 23.00, notes: "End of summer party", status: "published"},
  {client_name: "Labor Day BBQ", role_needed: "Event Captain", start_time_utc: "2025-09-01T12:00:00Z", end_time_utc: "2025-09-01T18:00:00Z", capacity: 2, location_name: "Financial District Venue", pay_rate: 30.00, notes: "Labor Day celebration", status: "published"},
  
  # September 2025
  {client_name: "Fall Festival", role_needed: "Server", start_time_utc: "2025-09-15T15:00:00Z", end_time_utc: "2025-09-15T19:00:00Z", capacity: 7, location_name: "Castro Theater", pay_rate: 22.00, notes: "Autumn themed event", status: "published"},
  {client_name: "Harvest Dinner", role_needed: "Bartender", start_time_utc: "2025-09-22T18:00:00Z", end_time_utc: "2025-09-22T22:00:00Z", capacity: 4, location_name: "Mission District Center", pay_rate: 24.00, notes: "Farm to table dinner", status: "published"},
  {client_name: "Oktoberfest Celebration", role_needed: "Server", start_time_utc: "2025-09-28T16:00:00Z", end_time_utc: "2025-09-28T20:00:00Z", capacity: 8, location_name: "Presidio Event Hall", pay_rate: 23.00, notes: "German themed event", status: "published"},
  
  # October 2025
  {client_name: "Halloween Party", role_needed: "Bartender", start_time_utc: "2025-10-31T19:00:00Z", end_time_utc: "2025-10-31T23:00:00Z", capacity: 5, location_name: "Nob Hill Venue", pay_rate: 26.00, notes: "Spooky celebration", status: "published"},
  {client_name: "Fall Harvest Festival", role_needed: "Server", start_time_utc: "2025-10-12T14:00:00Z", end_time_utc: "2025-10-12T18:00:00Z", capacity: 6, location_name: "Chinatown Cultural Center", pay_rate: 21.00, notes: "Seasonal celebration", status: "published"},
  {client_name: "Columbus Day Event", role_needed: "Event Captain", start_time_utc: "2025-10-13T18:00:00Z", end_time_utc: "2025-10-13T22:00:00Z", capacity: 2, location_name: "Downtown Convention Center", pay_rate: 28.00, notes: "Historical themed event", status: "published"},
  
  # November 2025
  {client_name: "Thanksgiving Dinner", role_needed: "Server", start_time_utc: "2025-11-27T16:00:00Z", end_time_utc: "2025-11-27T22:00:00Z", capacity: 8, location_name: "Golden Gate Park Pavilion", pay_rate: 25.00, notes: "Traditional Thanksgiving", status: "published"},
  {client_name: "Black Friday Recovery Party", role_needed: "Bartender", start_time_utc: "2025-11-29T19:00:00Z", end_time_utc: "2025-11-29T23:00:00Z", capacity: 3, location_name: "Marina District Hall", pay_rate: 24.00, notes: "Post-shopping celebration", status: "published"},
  {client_name: "Veterans Day Tribute", role_needed: "Server", start_time_utc: "2025-11-11T17:00:00Z", end_time_utc: "2025-11-11T21:00:00Z", capacity: 5, location_name: "SOMA Event Space", pay_rate: 22.00, notes: "Honoring veterans", status: "published"},
  
  # December 2025
  {client_name: "Holiday Party", role_needed: "Event Captain", start_time_utc: "2025-12-15T18:00:00Z", end_time_utc: "2025-12-15T22:00:00Z", capacity: 2, location_name: "Financial District Venue", pay_rate: 32.00, notes: "Corporate holiday party", status: "published"},
  {client_name: "New Year's Eve Gala", role_needed: "Bartender", start_time_utc: "2025-12-31T20:00:00Z", end_time_utc: "2026-01-01T02:00:00Z", capacity: 6, location_name: "Castro Theater", pay_rate: 30.00, notes: "Ring in the new year", status: "published"},
  {client_name: "Christmas Eve Dinner", role_needed: "Server", start_time_utc: "2025-12-24T18:00:00Z", end_time_utc: "2025-12-24T22:00:00Z", capacity: 7, location_name: "Mission District Center", pay_rate: 26.00, notes: "Festive dinner service", status: "published"}
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

# Import Worker Certifications (20 total)
puts "\n=== IMPORTING WORKER CERTIFICATIONS ==="
certifications_data = [
  {worker_email: "charlie.williams1@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-12-31T23:59:59Z"},
  {worker_email: "maria.garcia@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-11-15T23:59:59Z"},
  {worker_email: "maria.garcia@socialcatering.com", cert_name: "Alcohol Service", expires_at_utc: "2025-10-30T23:59:59Z"},
  {worker_email: "john.smith@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-12-15T23:59:59Z"},
  {worker_email: "sarah.johnson@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-11-30T23:59:59Z"},
  {worker_email: "sarah.johnson@socialcatering.com", cert_name: "Event Management", expires_at_utc: "2025-12-31T23:59:59Z"},
  {worker_email: "mike.brown@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-10-15T23:59:59Z"},
  {worker_email: "lisa.davis@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-12-20T23:59:59Z"},
  {worker_email: "david.wilson@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-11-10T23:59:59Z"},
  {worker_email: "david.wilson@socialcatering.com", cert_name: "Alcohol Service", expires_at_utc: "2025-12-05T23:59:59Z"},
  {worker_email: "jennifer.martinez@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-12-31T23:59:59Z"},
  {worker_email: "jennifer.martinez@socialcatering.com", cert_name: "Culinary Arts", expires_at_utc: "2025-11-25T23:59:59Z"},
  {worker_email: "robert.anderson@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-10-30T23:59:59Z"},
  {worker_email: "amanda.taylor@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-12-10T23:59:59Z"},
  {worker_email: "christopher.thomas@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-11-20T23:59:59Z"},
  {worker_email: "michelle.jackson@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-12-25T23:59:59Z"},
  {worker_email: "michelle.jackson@socialcatering.com", cert_name: "Event Management", expires_at_utc: "2025-11-15T23:59:59Z"},
  {worker_email: "daniel.white@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-10-25T23:59:59Z"},
  {worker_email: "daniel.white@socialcatering.com", cert_name: "Alcohol Service", expires_at_utc: "2025-12-15T23:59:59Z"},
  {worker_email: "ashley.harris@socialcatering.com", cert_name: "Food Handler", expires_at_utc: "2025-11-05T23:59:59Z"}
]

certifications_data.each do |cert_data|
  worker = Worker.find_by(email: cert_data[:worker_email])
  next unless worker
  
  cert = Certification.find_or_create_by(name: cert_data[:cert_name])
  
  worker_cert = WorkerCertification.find_or_create_by(
    worker_id: worker.id,
    cert_id: cert.id
  ) do |wc|
    wc.expires_at_utc = cert_data[:expires_at_utc]
  end
  puts "Created/Updated certification: #{worker.first_name} #{worker.last_name} - #{cert_data[:cert_name]}"
end

puts "\n=== COMPLETE DATA IMPORT FINISHED ==="
puts "Workers: #{Worker.count}"
puts "Shifts: #{Shift.count}"
puts "Skills: #{Skill.count}"
puts "Locations: #{Location.count}"
puts "Users: #{User.count}"
puts "Assignments: #{Assignment.count}"
puts "Worker Certifications: #{WorkerCertification.count}"
puts "Activity Logs: #{ActivityLog.count}"
