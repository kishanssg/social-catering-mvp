class CreateLocations < ActiveRecord::Migration[7.2]
  def change
    create_table :locations do |t|
      t.string :name, null: false
      t.string :address
      t.string :city, null: false
      t.string :state, null: false
      t.boolean :active, default: true
      t.timestamps
    end

    add_index :locations, :name, unique: true
    add_index :locations, :active
    add_index :locations, [ :city, :state ]
  end
end
