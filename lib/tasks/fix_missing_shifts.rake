namespace :events do
  desc "Fix old events with missing shifts (one-time migration)"
  task fix_missing_shifts: :environment do
    puts "=== FIXING OLD EVENTS WITH MISSING SHIFTS ==="
    puts "Finding published events with incomplete shifts...\n"

    # Get first admin user for created_by
    admin_user = User.where(role: 'admin').first || User.first
    unless admin_user
      puts "❌ ERROR: No users found. Cannot create shifts without a created_by user."
      exit 1
    end

    fixed_count = 0
    skipped_count = 0

    Event.where(status: 'published').find_each do |event|
      next unless event.event_schedule.present?
      next unless event.event_skill_requirements.any?
      
      needs_fixing = false
      
      event.event_skill_requirements.each do |req|
        skill_name = req.skill_name
        next unless skill_name
        
        needed = req.needed_workers
        existing = event.shifts.where(role_needed: skill_name).count
        
        if existing < needed
          needs_fixing = true
          break
        end
      end
      
      if needs_fixing
        puts "\n📋 Fixing: #{event.title} (ID: #{event.id})"
        
        event.event_skill_requirements.each do |req|
          skill_name = req.skill_name
          next unless skill_name
          
          needed = req.needed_workers
          existing_shifts = event.shifts.where(role_needed: skill_name)
          existing_count = existing_shifts.count
          
          if existing_count < needed
            missing = needed - existing_count
            puts "  #{skill_name}: creating #{missing} shifts (has #{existing_count}, needs #{needed})"
            
            missing.times do
              event.shifts.create!(
                role_needed: skill_name,
                start_time_utc: event.event_schedule.start_time_utc,
                end_time_utc: event.event_schedule.end_time_utc,
                capacity: 1,
                status: 'published',
                pay_rate: req.pay_rate,
                auto_generated: false,
                client_name: event.title,
                created_by: admin_user
              )
            end
          end
        end
        
        puts "  ✅ Now has #{event.shifts.reload.count} total shifts"
        fixed_count += 1
      else
        skipped_count += 1
      end
    end

    puts "\n" + "="*50
    puts "✅ MIGRATION COMPLETE"
    puts "Fixed: #{fixed_count} events"
    puts "Skipped (already complete): #{skipped_count} events"
    puts "="*50
  end
end

