class AddReportingFieldsForPayroll < ActiveRecord::Migration[7.2]
  def change
    # Add pay rate to event_skill_requirements (so each role can have different rate)
    add_column :event_skill_requirements, :pay_rate, :decimal, precision: 10, scale: 2 unless column_exists?(:event_skill_requirements, :pay_rate)

    # Add actual_hours and notes to assignments
    add_column :assignments, :notes, :text unless column_exists?(:assignments, :notes)
    add_column :assignments, :clock_in_time, :timestamptz unless column_exists?(:assignments, :clock_in_time)
    add_column :assignments, :clock_out_time, :timestamptz unless column_exists?(:assignments, :clock_out_time)

    # Indexes for reporting queries
    add_index :assignments, :created_at unless index_exists?(:assignments, :created_at)
    add_index :assignments, [ :worker_id, :created_at ] unless index_exists?(:assignments, [ :worker_id, :created_at ])

    # Add additional reporting fields for better analytics
    add_column :assignments, :break_duration_minutes, :integer, default: 0 unless column_exists?(:assignments, :break_duration_minutes)
    add_column :assignments, :overtime_hours, :decimal, precision: 5, scale: 2, default: 0 unless column_exists?(:assignments, :overtime_hours)
    add_column :assignments, :performance_rating, :integer unless column_exists?(:assignments, :performance_rating)
  end
end
