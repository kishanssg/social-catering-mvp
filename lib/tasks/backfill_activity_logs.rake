namespace :activity_logs do
  desc "Backfill summary and details_json for existing Activity Log entries"
  task backfill: :environment do
    puts "Starting backfill of Activity Logs..."

    total = ActivityLog.count
    processed = 0
    errors = 0

    ActivityLog.find_each do |log|
      begin
        presenter = ActivityLogPresenter.new(log)
        summary_text = presenter.summary
        curated = presenter.curated_details

        log.update_columns(
          summary: summary_text,
          details_json: curated
        )

        processed += 1
        print "." if processed % 100 == 0
      rescue => e
        errors += 1
        puts "\nError processing log #{log.id}: #{e.message}"
      end
    end

    puts "\n\nBackfill complete!"
    puts "Total: #{total}, Processed: #{processed}, Errors: #{errors}"
  end
end
