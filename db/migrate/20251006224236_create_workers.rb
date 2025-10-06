class CreateWorkers < ActiveRecord::Migration[8.0]
  def change
    create_table :workers do |t|
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :email
      t.string :phone
      t.jsonb :skills_json
      t.text :skills_text
      t.text :notes
      t.boolean :active, default: true

      t.timestamps
    end

    add_index :workers, [:last_name, :first_name]
    add_index :workers, :active
    add_index :workers, :email, unique: true, where: "email IS NOT NULL"
    add_index :workers, :skills_json, using: :gin

    execute <<-SQL
      ALTER TABLE workers ADD COLUMN skills_tsvector tsvector;
      CREATE INDEX idx_workers_search ON workers USING gin(skills_tsvector);
    SQL
  end
end
