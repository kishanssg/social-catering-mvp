namespace :activity_logs do
  desc "Backfill humanized summaries for existing activity logs"
  task backfill_summaries: :environment do
    puts "🔄 Backfilling humanized summaries for activity logs..."
    
    total = ActivityLog.count
    processed = 0
    updated = 0
    errors = 0
    
    ActivityLog.find_each do |log|
      processed += 1
      
      begin
        presenter = ActivityLogPresenter.new(log)
        new_summary = presenter.summary
        new_details = presenter.curated_details
        
        # Only update if summary is different or missing
        if log.summary != new_summary || log.details_json != new_details
          log.update_columns(
            summary: new_summary,
            details_json: new_details
          )
          updated += 1
        end
        
        if processed % 100 == 0
          puts "  Processed #{processed}/#{total} (#{updated} updated, #{errors} errors)"
        end
      rescue => e
        errors += 1
        Rails.logger.error "Error processing ActivityLog #{log.id}: #{e.message}"
        puts "  ⚠️  Error processing log #{log.id}: #{e.message}"
      end
    end
    
    puts "✅ Complete! Processed #{processed} logs, updated #{updated}, #{errors} errors"
  end
end

