class CreateVenues < ActiveRecord::Migration[7.2]
  def change
    create_table :venues do |t|
      t.string :place_id, null: false
      t.string :name, null: false
      t.text :address
      t.decimal :latitude, precision: 10, scale: 6
      t.decimal :longitude, precision: 10, scale: 6
      t.text :arrival_instructions
      t.text :parking_info
      t.string :phone
      t.string :website
      t.text :formatted_address, null: false
      t.timestamptz :last_synced_at_utc

      t.timestamptz :created_at_utc, null: false
      t.timestamptz :updated_at_utc, null: false
    end
    
    add_index :venues, :place_id, unique: true
    add_index :venues, :name
    add_index :venues, :last_synced_at_utc
  end
end
