class AddHourlyRateToWorkers < ActiveRecord::Migration[7.2]
  def change
    add_column :workers, :hourly_rate, :decimal, precision: 8, scale: 2
  end
end
