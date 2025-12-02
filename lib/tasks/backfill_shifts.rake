namespace :shifts do
  desc "Backfill missing Shift records for all published/active events using ensure_shifts_for_requirements!"
  task backfill_missing: :environment do
    dry_run = ENV['DRY_RUN'].to_s.downcase == 'true'

    if Rails.env.production?
      unless ENV['CONFIRM'].to_s.downcase == 'true'
        puts "🚫 Refusing to run in production without explicit confirmation."
        puts "   Re-run with: CONFIRM=true RAILS_ENV=production rake shifts:backfill_missing"
        puts "   (Optional) DRY_RUN=true to see what would happen without writing."
        exit 1
      end
    end

    puts "=== Shifts Backfill: Missing Shift Records ==="
    puts "Environment : #{Rails.env}"
    puts "Dry run    : #{dry_run ? 'YES (no changes will be saved)' : 'NO (changes will be persisted)'}"
    puts

    # Some older data may still use 'active' as a status, so include both
    target_statuses = %w[published active]

    events = Event.where(status: target_statuses)

    total_events = 0
    total_shifts_created = 0

    events.find_each do |event|
      total_events += 1

      puts "Event #{event.id} - #{event.title} (status: #{event.status})"

      # Track per-event created count (based on our pre-calculation)
      event_created_for_event = 0

      ActiveRecord::Base.transaction do
        event.event_skill_requirements.find_each do |skill_req|
          needed = skill_req.needed_workers.to_i
          next if needed <= 0

          existing = event.shifts.where(event_skill_requirement_id: skill_req.id).count
          missing = needed - existing

          if missing.positive?
            puts "  Role #{skill_req.skill_name.inspect}: needed=#{needed}, existing=#{existing}, missing=#{missing}"

            event_created_for_event += missing
          else
            puts "  Role #{skill_req.skill_name.inspect}: OK (needed=#{needed}, existing=#{existing})"
          end
        end

        if dry_run
          puts "  >> DRY RUN: would create #{event_created_for_event} shift(s) for this event"
        else
          # Let the model perform the actual creation using the canonical helper
          before_count = event.shifts.count
          event.ensure_shifts_for_requirements!
          after_count = event.shifts.reload.count
          created = after_count - before_count

          puts "  >> Created #{created} shift(s) via ensure_shifts_for_requirements!"
          # Use the actual created count for totals
          event_created_for_event = created
        end

        # In dry_run we still wrap in a transaction, but we roll back implicitly
        raise ActiveRecord::Rollback if dry_run
      end

      total_shifts_created += event_created_for_event
      puts
    rescue => e
      puts "  !! Error processing event #{event.id}: #{e.class} - #{e.message}"
      puts "     Skipping this event and continuing..."
      puts
      next
    end

    puts "=== Shifts Backfill Summary ==="
    puts "Events processed : #{total_events}"
    puts "Shifts created   : #{total_shifts_created}#{dry_run ? ' (simulated)' : ''}"
    puts "Done."
  end
end


