# frozen_string_literal: true

namespace :events do
  desc "Recalculate totals for all events (fixes stale data)"
  task recalculate_totals: :environment do
    puts "🔄 Recalculating totals for all events..."

    events = Event.includes(shifts: :assignments).all
    total = events.count
    success_count = 0
    error_count = 0

    events.find_each.with_index do |event, index|
      print "\r  Processing event #{index + 1}/#{total} (ID: #{event.id})..."

      result = Events::RecalculateTotals.new(event: event).call

      if result[:success]
        success_count += 1
        event.reload
        puts "\n    ✅ Event #{event.id} (#{event.title}): $#{event.total_pay_amount || 0} (#{event.total_hours_worked || 0} hours)"
      else
        error_count += 1
        puts "\n    ❌ Event #{event.id} (#{event.title}): #{result[:error]}"
      end
    end

    puts "\n\n📊 Summary:"
    puts "  ✅ Success: #{success_count}"
    puts "  ❌ Errors: #{error_count}"
    puts "  📦 Total: #{total}"
    puts "\n✨ Done!"
  end

  desc "Recalculate totals for active events only"
  task recalculate_active_totals: :environment do
    puts "🔄 Recalculating totals for active events..."

    events = Event.published.includes(shifts: :assignments)
    total = events.count
    success_count = 0
    error_count = 0

    events.find_each.with_index do |event, index|
      print "\r  Processing event #{index + 1}/#{total} (ID: #{event.id})..."

      result = Events::RecalculateTotals.new(event: event).call

      if result[:success]
        success_count += 1
        event.reload
        puts "\n    ✅ Event #{event.id} (#{event.title}): $#{event.total_pay_amount || 0} (#{event.total_hours_worked || 0} hours)"
      else
        error_count += 1
        puts "\n    ❌ Event #{event.id} (#{event.title}): #{result[:error]}"
      end
    end

    puts "\n\n📊 Summary:"
    puts "  ✅ Success: #{success_count}"
    puts "  ❌ Errors: #{error_count}"
    puts "  📦 Total: #{total}"
    puts "\n✨ Done!"
  end
end
