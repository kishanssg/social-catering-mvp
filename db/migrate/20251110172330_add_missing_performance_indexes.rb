class AddMissingPerformanceIndexes < ActiveRecord::Migration[7.2]
  def change
    # Single column indexes for common WHERE clauses
    add_index :assignments, :status, 
              if_not_exists: true,
              name: 'index_assignments_on_status'
    
    add_index :shifts, :start_time_utc, 
              if_not_exists: true,
              name: 'index_shifts_on_start_time_utc'
    
    add_index :activity_logs, :entity_type, 
              if_not_exists: true,
              name: 'index_activity_logs_on_entity_type'
  end
end

