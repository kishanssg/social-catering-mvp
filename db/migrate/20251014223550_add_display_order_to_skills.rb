class AddDisplayOrderToSkills < ActiveRecord::Migration[7.2]
  def change
    add_column :skills, :display_order, :integer, default: 0
    add_index :skills, :display_order
  end
end
