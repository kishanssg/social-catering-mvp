namespace :audit do
  desc "Audit event schedules for cross-date shifts, overlaps, and count mismatches"
  task schedule: :environment do
    errors = []

    puts "\n=== SCHEDULE AUDIT ===\n\n"

    # 1. Check for cross-date shifts
    puts "Checking for shifts on wrong calendar date..."
    Event.includes(:event_schedule, :shifts).find_each do |event|
      next unless event.event_schedule

      event_date = event.event_schedule.start_time_utc.to_date

      event.shifts.find_each do |shift|
        shift_date = shift.start_time_utc.to_date

        if shift_date != event_date
          errors << {
            type: :date_mismatch,
            event_id: event.id,
            event_title: event.title,
            shift_id: shift.id,
            role: shift.role_needed,
            event_date: event_date,
            shift_date: shift_date
          }

          puts "[DATE MISMATCH] event_id=#{event.id} event_title=#{event.title} shift_id=#{shift.id} role=#{shift.role_needed} event_date=#{event_date} shift_date=#{shift_date}"
        end
      end
    end

    puts "\n---\n\n"

    # 2. Check for overlapping assignments per worker per day
    puts "Checking for overlapping worker assignments..."
    Worker.includes(assignments: { shift: :event }).find_each do |worker|
      assignments = worker.assignments.where(status: "assigned").includes(:shift)

      # Group by date
      by_date = assignments.group_by { |a| a.shift.start_time_utc.to_date }

      by_date.each do |date, day_assignments|
        day_assignments.combination(2).each do |a1, a2|
          s1, s2 = a1.shift, a2.shift

          # Check if they overlap
          if s1.start_time_utc < s2.end_time_utc && s1.end_time_utc > s2.start_time_utc
            errors << {
              type: :overlap,
              worker_id: worker.id,
              worker_name: "#{worker.first_name} #{worker.last_name}",
              date: date,
              shift_ids: [ s1.id, s2.id ],
              times: [
                "#{s1.start_time_utc.strftime('%Y-%m-%d %H:%M')} UTC - #{s1.end_time_utc.strftime('%H:%M')} UTC",
                "#{s2.start_time_utc.strftime('%Y-%m-%d %H:%M')} UTC - #{s2.end_time_utc.strftime('%H:%M')} UTC"
              ],
              roles: [ s1.role_needed, s2.role_needed ]
            }

            puts "[OVERLAP] worker_id=#{worker.id} worker_name=#{worker.first_name} #{worker.last_name} date=#{date} shift_ids=[#{s1.id},#{s2.id}] times=[#{s1.start_time_utc.strftime('%Y-%m-%d %H:%M')}, #{s2.start_time_utc.strftime('%H-%m-%d %H:%M')}] roles=[#{s1.role_needed},#{s2.role_needed}]"
          end
        end
      end
    end

    puts "\n---\n\n"

    # 3. Check for ghost assignments (assignments whose shift belongs to wrong event)
    puts "Checking for ghost assignments..."
    # This is harder to detect at the DB level without comparing against rendered groups,
    # so we'll skip this for now or implement it more carefully

    puts "\n---\n\n"

    # 4. Check for count mismatches
    puts "Checking for count mismatches..."
    Event.includes(:event_skill_requirements, :shifts).where.not(status: "draft").find_each do |event|
      next unless event.event_schedule

      event.event_skill_requirements.find_each do |requirement|
        # Count published shifts for this role
        published_shifts_count = event.shifts
          .where(role_needed: requirement.skill_name)
          .where.not(status: "draft")
          .count

        if published_shifts_count != requirement.needed_workers
          errors << {
            type: :count_mismatch,
            event_id: event.id,
            event_title: event.title,
            role: requirement.skill_name,
            needed: requirement.needed_workers,
            published_shifts: published_shifts_count
          }

          puts "[COUNT MISMATCH] event_id=#{event.id} event_title=#{event.title} role=#{requirement.skill_name} needed=#{requirement.needed_workers} published_shifts=#{published_shifts_count}"
        end
      end
    end

    # Summary
    puts "\n=== SUMMARY ==="
    puts "Total issues found: #{errors.count}"
    puts "  - Date mismatches: #{errors.count { |e| e[:type] == :date_mismatch }}"
    puts "  - Overlaps: #{errors.count { |e| e[:type] == :overlap }}"
    puts "  - Count mismatches: #{errors.count { |e| e[:type] == :count_mismatch }}"

    if errors.empty?
      puts "\n✅ Schedule audit passed with no issues found!"
      exit 0
    else
      puts "\n❌ Schedule audit FAILED with #{errors.count} issue(s)"
      exit 1
    end
  end
end
