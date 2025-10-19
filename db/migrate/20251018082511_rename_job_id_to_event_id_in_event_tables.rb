class RenameJobIdToEventIdInEventTables < ActiveRecord::Migration[7.2]
  def change
    # Rename foreign key columns in event-related tables
    rename_column :event_skill_requirements, :job_id, :event_id if column_exists?(:event_skill_requirements, :job_id)
    rename_column :event_schedules, :job_id, :event_id if column_exists?(:event_schedules, :job_id)
  end
end
