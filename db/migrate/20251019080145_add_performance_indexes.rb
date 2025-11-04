class AddPerformanceIndexes < ActiveRecord::Migration[7.2]
  def change
    # Composite indexes for common queries
    add_index :events, [:status, :created_at_utc], 
              if_not_exists: true, 
              name: 'index_events_on_status_and_created_at'
    
    add_index :shifts, [:event_id, :status, :start_time_utc], 
              if_not_exists: true,
              name: 'index_shifts_on_event_status_time'
    
    add_index :shifts, [:start_time_utc, :end_time_utc], 
              if_not_exists: true,
              name: 'index_shifts_on_time_range'
    
    add_index :assignments, [:worker_id, :status, :created_at], 
              if_not_exists: true,
              name: 'index_assignments_on_worker_status_time'
    
    add_index :assignments, [:shift_id], 
              if_not_exists: true,
              name: 'index_assignments_on_shift'
    
    add_index :workers, [:active, :created_at], 
              if_not_exists: true,
              name: 'index_workers_on_active_and_created'
    
    # Unique constraint for worker-shift assignments
    add_index :assignments, [:worker_id, :shift_id], 
              unique: true,
              if_not_exists: true,
              name: 'index_assignments_unique_worker_shift'
    
    # Full-text search indexes (if not already exist)
    add_index :workers, :skills_tsvector, 
              using: :gin,
              if_not_exists: true,
              name: 'index_workers_on_skills_tsvector'
    
    add_index :workers, :skills_json, 
              using: :gin,
              if_not_exists: true,
              name: 'index_workers_on_skills_json'
  end
end
