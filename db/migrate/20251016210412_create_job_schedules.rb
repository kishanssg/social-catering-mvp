class CreateJobSchedules < ActiveRecord::Migration[7.2]
  def change
    create_table :job_schedules do |t|
      t.references :job, null: false, foreign_key: { on_delete: :cascade }
      t.timestamptz :start_time_utc, null: false
      t.timestamptz :end_time_utc, null: false
      t.integer :break_minutes, default: 0
      t.timestamptz :created_at_utc, null: false
      t.timestamptz :updated_at_utc, null: false
    end

    add_index :job_schedules, [ :start_time_utc, :end_time_utc ]
  end
end
