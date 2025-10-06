class CreateCertifications < ActiveRecord::Migration[8.0]
  def change
    create_table :certifications do |t|
      t.string :name, null: false

      t.timestamps
    end

    add_index :certifications, :name, unique: true
  end
end
