# frozen_string_literal: true

class AddPerformanceIndexes < ActiveRecord::Migration[7.0]
  def change
    # Events table - status and date filtering
    add_index :events, :status unless index_exists?(:events, :status)
    add_index :events, :completed_at_utc unless index_exists?(:events, :completed_at_utc)
    add_index :events, [:status, :created_at] unless index_exists?(:events, [:status, :created_at])
    
    # EventSchedules - date range queries
    add_index :event_schedules, :start_time_utc unless index_exists?(:event_schedules, :start_time_utc)
    add_index :event_schedules, :end_time_utc unless index_exists?(:event_schedules, :end_time_utc)
    add_index :event_schedules, :event_id unless index_exists?(:event_schedules, :event_id)
    
    # Shifts - event lookup and time filtering
    add_index :shifts, :event_id unless index_exists?(:shifts, :event_id)
    add_index :shifts, :start_time_utc unless index_exists?(:shifts, :start_time_utc)
    add_index :shifts, :end_time_utc unless index_exists?(:shifts, :end_time_utc)
    add_index :shifts, :status unless index_exists?(:shifts, :status)
    
    # Assignments - worker and shift lookups, status filtering
    add_index :assignments, :shift_id unless index_exists?(:assignments, :shift_id)
    add_index :assignments, :worker_id unless index_exists?(:assignments, :worker_id)
    add_index :assignments, :status unless index_exists?(:assignments, :status)
    add_index :assignments, [:shift_id, :status] unless index_exists?(:assignments, [:shift_id, :status])
    add_index :assignments, :approved unless index_exists?(:assignments, :approved)
    
    # Workers - active status filtering
    add_index :workers, :active unless index_exists?(:workers, :active)
    add_index :workers, [:active, :last_name] unless index_exists?(:workers, [:active, :last_name])
    
    # ActivityLog - filtering by resource
    add_index :activity_logs, [:resource_type, :resource_id] unless index_exists?(:activity_logs, [:resource_type, :resource_id])
    add_index :activity_logs, :created_at unless index_exists?(:activity_logs, :created_at)
  end
end

