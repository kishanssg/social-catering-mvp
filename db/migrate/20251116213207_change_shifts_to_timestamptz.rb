class ChangeShiftsToTimestamptz < ActiveRecord::Migration[7.1]
  def up
    # Change datetime to timestamptz for timezone-aware storage
    # Existing UTC data will be preserved, just with explicit timezone metadata
    change_column :shifts, :start_time_utc, :timestamptz
    change_column :shifts, :end_time_utc, :timestamptz
  end

  def down
    # Rollback: timestamptz back to datetime
    change_column :shifts, :start_time_utc, :datetime
    change_column :shifts, :end_time_utc, :datetime
  end
end
