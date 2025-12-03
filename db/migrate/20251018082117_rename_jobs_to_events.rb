class RenameJobsToEvents < ActiveRecord::Migration[7.2]
  def change
    # Rename main table
    rename_table :jobs, :events

    # Rename related tables
    rename_table :job_skill_requirements, :event_skill_requirements
    rename_table :job_schedules, :event_schedules

    # Rename foreign key columns
    rename_column :shifts, :job_id, :event_id if column_exists?(:shifts, :job_id)
    rename_column :shifts, :job_skill_requirement_id, :event_skill_requirement_id if column_exists?(:shifts, :job_skill_requirement_id)
  end
end
