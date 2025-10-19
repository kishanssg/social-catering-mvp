class AddHourlyRateToAssignments < ActiveRecord::Migration[7.2]
  def change
    add_column :assignments, :hourly_rate, :decimal, precision: 8, scale: 2
    add_index :assignments, :hourly_rate
  end
end
