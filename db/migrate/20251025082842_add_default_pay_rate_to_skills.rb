class AddDefaultPayRateToSkills < ActiveRecord::Migration[7.2]
  def change
    add_column :skills, :default_pay_rate, :decimal, precision: 10, scale: 2
    add_column :skills, :last_used_pay_rate, :decimal, precision: 10, scale: 2
  end
end
