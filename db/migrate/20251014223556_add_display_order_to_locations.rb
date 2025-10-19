class AddDisplayOrderToLocations < ActiveRecord::Migration[7.2]
  def change
    add_column :locations, :display_order, :integer, default: 0
    add_index :locations, :display_order
  end
end
