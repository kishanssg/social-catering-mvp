class AddEditAfterPublishConstraints < ActiveRecord::Migration[7.2]
  def up
    # Add lock_version for optimistic locking
    add_column :events, :lock_version, :integer, default: 0, null: false, if_not_exists: true

    # Add CHECK constraint for status (only if doesn't exist)
    begin
      execute <<-SQL
        ALTER TABLE events
        ADD CONSTRAINT check_event_status
        CHECK (status IN ('draft', 'published', 'assigned', 'completed', 'archived'));
      SQL
    rescue ActiveRecord::StatementInvalid => e
      Rails.logger.warn("Constraint check_event_status may already exist: #{e.message}")
    end

    # Add CHECK constraint for shift times (only if doesn't exist)
    begin
      execute <<-SQL
        ALTER TABLE shifts
        ADD CONSTRAINT check_shift_times
        CHECK (start_time_utc < end_time_utc);
      SQL
    rescue ActiveRecord::StatementInvalid => e
      Rails.logger.warn("Constraint check_shift_times may already exist: #{e.message}")
    end

    # Change assignments.shift_id FK to RESTRICT (prevent cascade deletes)
    if foreign_key_exists?(:assignments, :shifts)
      remove_foreign_key :assignments, :shifts
    end
    unless foreign_key_exists?(:assignments, column: :shift_id)
      add_foreign_key :assignments, :shifts, on_delete: :restrict
    end

    # Add indexes for diff queries
    unless index_exists?(:shifts, [:event_id, :role_needed])
      add_index :shifts, [:event_id, :role_needed], name: 'index_shifts_on_event_id_and_role_needed'
    end
    
    unless index_exists?(:assignments, [:shift_id, :status])
      add_index :assignments, [:shift_id, :status], name: 'index_assignments_on_shift_id_and_status'
    end
  end

  def down
    remove_index :assignments, name: 'index_assignments_on_shift_id_and_status' if index_exists?(:assignments, [:shift_id, :status])
    remove_index :shifts, name: 'index_shifts_on_event_id_and_role_needed' if index_exists?(:shifts, [:event_id, :role_needed])
    
    remove_foreign_key :assignments, :shifts if foreign_key_exists?(:assignments, :shifts)
    
    execute "ALTER TABLE shifts DROP CONSTRAINT IF EXISTS check_shift_times;"
    execute "ALTER TABLE events DROP CONSTRAINT IF EXISTS check_event_status;"
    
    remove_column :events, :lock_version, if_exists: true
  end
end
