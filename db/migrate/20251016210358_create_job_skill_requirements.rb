class CreateJobSkillRequirements < ActiveRecord::Migration[7.2]
  def change
    create_table :job_skill_requirements do |t|
      t.references :job, null: false, foreign_key: { on_delete: :cascade }
      t.string :skill_name, null: false
      t.integer :needed_workers, null: false, default: 1
      t.text :description
      t.string :uniform_name
      t.string :certification_name
      t.timestamptz :created_at_utc, null: false
      t.timestamptz :updated_at_utc, null: false
    end

    add_index :job_skill_requirements, [ :job_id, :skill_name ], unique: true
  end
end
