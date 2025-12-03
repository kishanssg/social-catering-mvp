# Production Data Cleanup Script - Realistic Names & Fixes
# Purpose: Make production data realistic for Social Catering demo
# Matches actual Rails schema (Event, EventSchedule, Shift, Venue models)

puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "🔧 REALISTIC DATA CLEANUP"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts ""

ActiveRecord::Base.transaction do
  # ============================================================================
  # STEP 1: Rename Events to Realistic Social Catering Names
  # ============================================================================
  puts "📝 STEP 1: Renaming events to realistic names..."

  event_updates = {
    'Papa jones celebration' => {
      title: 'Corporate Team Building Event - TechCorp',
      description: 'Annual team building event with outdoor activities and catered lunch for 50 employees.'
    },
    'FSA Wedding Dinner' => {
      title: 'Wedding Reception - Smith & Anderson',
      description: 'Elegant wedding reception with dinner service, cocktail hour, and late-night dessert bar for 150 guests.'
    },
    'FSA Graduation Party' => {
      title: 'Annual Charity Gala - Community Foundation',
      description: 'Black-tie fundraising gala with plated dinner, silent auction, and champagne reception for 200 attendees.'
    },
    'FSA Grad dinner' => {
      title: 'Holiday Party - Downtown Marketing Group',
      description: 'Corporate holiday celebration with buffet dinner, open bar, and dessert station for 75 team members.'
    },
    'Ram\'s Wedding' => {
      title: 'Private Anniversary Celebration - The Johnsons',
      description: '50th wedding anniversary dinner party with family-style service and anniversary cake for 40 guests.'
    },
    'Hannah\'s Baby Shower' => {
      title: 'Thanksgiving Corporate Luncheon - Falls Church Realty',
      description: 'Traditional Thanksgiving lunch buffet with all the fixings for 60 staff members.'
    },
    'Corporate Holiday Gala' => {
      title: 'End-of-Year Awards Dinner - Regional Chamber',
      description: 'Business awards ceremony with plated dinner and cocktail reception for 120 chamber members.'
    },
    'Downtown Party at The Hawkers' => {
      title: 'Corporate Networking Mixer - Tech Startups Alliance',
      description: 'Evening networking event with passed appetizers, open bar, and dessert station for 100 professionals.'
    },
    'FSU Alumni Wedding Reception' => {
      title: 'Wedding Reception - Martinez & Lee',
      description: 'Garden wedding reception with cocktail hour, plated dinner, and dessert bar for 180 guests.'
    },
    'Halloween' => {
      title: 'Halloween Corporate Event - Downtown Business District',
      description: 'Corporate Halloween celebration with themed buffet, open bar, and costume contest for 80 employees.'
    },
    'Diwali' => {
      title: 'Diwali Festival Celebration - Community Center',
      description: 'Cultural festival celebration with traditional Indian cuisine, music, and dance for 120 attendees.'
    },
    'Private Birthday Party' => {
      title: 'Birthday Celebration - Private Residence',
      description: 'Intimate birthday party with plated dinner and dessert service for 30 guests.'
    }
  }

  updated_count = 0
  event_updates.each do |old_title, new_data|
    event = Event.find_by(title: old_title)
    if event
      event.update!(title: new_data[:title])
      updated_count += 1
      puts "  ✓ #{old_title} → #{new_data[:title]}"
    end
  end

  puts "  ✓ Updated #{updated_count} event titles"
  puts ""

  # ============================================================================
  # STEP 2: Fix Halloween Event (98 unfilled roles - unrealistic)
  # ============================================================================
  puts "🎃 STEP 2: Fixing Halloween event (98 unfilled roles)..."

  halloween = Event.find_by("title LIKE ?", "%Halloween%")
  if halloween && halloween.status == 'published'
    # Mark as completed (since Halloween 2024 is past)
    halloween.update!(
      status: 'completed',
      completed_at_utc: Time.zone.parse('2024-10-31 23:00:00')
    )

    # Update schedule to Oct 31, 2024
    if halloween.event_schedule
      halloween.event_schedule.update!(
        start_time_utc: Time.zone.parse('2024-10-31 18:00:00'),
        end_time_utc: Time.zone.parse('2024-10-31 23:00:00')
      )
    end

    # Update shifts
    halloween.shifts.update_all(
      start_time_utc: Time.zone.parse('2024-10-31 18:00:00'),
      end_time_utc: Time.zone.parse('2024-10-31 23:00:00')
    )

    puts "  ✓ Halloween event marked as completed (Oct 31, 2024)"
  end
  puts ""

  # ============================================================================
  # STEP 3: Reduce Unfilled Roles to Realistic Numbers
  # ============================================================================
  puts "📊 STEP 3: Checking unfilled roles..."

  # Count current unfilled roles
  active_events = Event.published.joins(:event_schedule).where('event_schedules.end_time_utc > ?', Time.current)
  total_unfilled = active_events.sum { |e| e.unfilled_roles_count }

  puts "  Current unfilled roles: #{total_unfilled}"
  puts "  Target: 20-30 unfilled roles"

  # Note: We can't easily reduce unfilled roles without creating assignments
  # This would require creating fake assignments, which might not be desired
  # For now, we'll just note the current state
  puts "  ℹ️  Unfilled roles reflect actual staffing needs"
  puts ""

  # ============================================================================
  # STEP 4: Clean Up Test Admin Accounts
  # ============================================================================
  puts "👤 STEP 4: Cleaning up test admin accounts..."

  # Keep only: Natalie, Madison, Sarah, gravyadmin
  users_to_keep = [
    'natalie@socialcatering.com',
    'madison@socialcatering.com',
    'sarah@socialcatering.com',
    'gravyadmin@socialcatering.com'
  ]

  # Find test users to delete
  test_users = User.where('email LIKE ?', '%@socialcatering.com')
                   .where.not(email: users_to_keep)

  deleted_count = test_users.count
  if deleted_count > 0
    # Check if they have any activity logs or created shifts
    test_users.each do |user|
      has_data = ActivityLog.where(actor_user_id: user.id).exists? ||
                 Shift.where(created_by_id: user.id).exists? ||
                 Event.where(created_by_id: user.id).exists?

      if has_data
        puts "  ⚠️  Skipping #{user.email} (has historical data)"
      else
        user.destroy
        puts "  ✓ Deleted #{user.email}"
      end
    end
  else
    puts "  ✓ No test users to delete"
  end
  puts ""

  # ============================================================================
  # STEP 5: Verify Date Ranges
  # ============================================================================
  puts "📅 STEP 5: Verifying date ranges..."

  # Check completed events (should be Sept 1 - Nov 4, 2024)
  completed = Event.where(status: 'completed').joins(:event_schedule)
  if completed.any?
    earliest = completed.minimum('event_schedules.start_time_utc')
    latest = completed.maximum('event_schedules.start_time_utc')
    puts "  Completed events: #{earliest&.strftime('%Y-%m-%d')} to #{latest&.strftime('%Y-%m-%d')}"
  end

  # Check published events (should be Nov 5-30, 2025)
  published = Event.where(status: 'published').joins(:event_schedule)
                   .where('event_schedules.end_time_utc > ?', Time.current)
  if published.any?
    earliest = published.minimum('event_schedules.start_time_utc')
    latest = published.maximum('event_schedules.start_time_utc')
    puts "  Published events: #{earliest&.strftime('%Y-%m-%d')} to #{latest&.strftime('%Y-%m-%d')}"
  end
  puts ""

  # ============================================================================
  # SUMMARY
  # ============================================================================
  puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  puts "✅ CLEANUP COMPLETE"
  puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  puts ""
  puts "📊 FINAL NUMBERS:"
  puts "  Workers:"
  puts "    • Active: #{Worker.where(active: true).count}"
  puts "    • Total: #{Worker.count}"
  puts ""
  puts "  Events:"
  puts "    • Published (Active): #{Event.published.joins(:event_schedule).where('event_schedules.end_time_utc > ?', Time.current).count}"
  puts "    • Completed: #{Event.where(status: 'completed').count}"
  puts "    • Draft: #{Event.where(status: 'draft').count}"
  puts ""
  puts "  Admin Users:"
  puts "    • Total: #{User.where('email LIKE ?', '%@socialcatering.com').count}"
  puts ""
  puts "✅ All changes committed!"
end
