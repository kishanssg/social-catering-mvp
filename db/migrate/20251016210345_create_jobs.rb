class CreateJobs < ActiveRecord::Migration[7.2]
  def change
    create_table :jobs do |t|
      t.string :title, null: false
      t.string :status, null: false, default: 'draft'
      t.references :venue, foreign_key: { on_delete: :restrict }
      t.text :check_in_instructions
      t.string :supervisor_name
      t.string :supervisor_phone
      t.timestamptz :created_at_utc, null: false
      t.timestamptz :updated_at_utc, null: false
    end

    add_index :jobs, :status
    add_check_constraint :jobs, "status IN ('draft', 'published', 'assigned', 'completed')", name: 'valid_job_status'
  end
end
