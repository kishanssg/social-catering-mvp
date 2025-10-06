class CreateShifts < ActiveRecord::Migration[8.0]
  def change
    create_table :shifts do |t|
      t.string :client_name, null: false
      t.string :role_needed, null: false
      t.string :location
      t.datetime :start_time_utc, null: false
      t.datetime :end_time_utc, null: false
      t.decimal :pay_rate
      t.integer :capacity, null: false, default: 1
      t.string :status, default: 'draft'
      t.text :notes
      t.bigint :created_by_id

      t.timestamps
    end

    add_index :shifts, [:start_time_utc, :status]
    add_index :shifts, [:start_time_utc, :end_time_utc]
    add_index :shifts, :status

    add_check_constraint :shifts, 'end_time_utc > start_time_utc', name: 'shifts_valid_time_range'
    add_check_constraint :shifts, 'capacity > 0', name: 'shifts_positive_capacity'
    add_check_constraint :shifts, "status IN ('draft', 'published', 'assigned', 'completed')", name: 'shifts_valid_status'

    add_foreign_key :shifts, :users, column: :created_by_id
  end
end
