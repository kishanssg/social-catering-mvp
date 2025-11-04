class AddSummaryToActivityLogs < ActiveRecord::Migration[7.2]
  def change
    add_column :activity_logs, :summary, :text
    add_column :activity_logs, :details_json, :jsonb
  end
end
