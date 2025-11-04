class CreateSkills < ActiveRecord::Migration[7.2]
  def change
    create_table :skills do |t|
      t.string :name, null: false
      t.boolean :active, default: true
      t.timestamps
    end
    
    add_index :skills, :name, unique: true
    add_index :skills, :active
  end
end
