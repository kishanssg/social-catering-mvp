class AddHoursWorkedToAssignments < ActiveRecord::Migration[7.2]
  def change
    add_column :assignments, :hours_worked, :decimal, precision: 5, scale: 2
    add_column :assignments, :hourly_rate, :decimal, precision: 8, scale: 2
    add_index :assignments, :hours_worked
  end
end
