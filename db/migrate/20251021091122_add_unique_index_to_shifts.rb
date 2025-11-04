class AddUniqueIndexToShifts < ActiveRecord::Migration[7.2]
  def change
    # Add unique index to prevent duplicate shifts for the same event, role, and time
    add_index :shifts, [:event_id, :role_needed, :start_time_utc, :end_time_utc], 
              unique: true, 
              name: 'index_shifts_on_event_role_time_unique',
              where: "event_id IS NOT NULL"
  end
end
