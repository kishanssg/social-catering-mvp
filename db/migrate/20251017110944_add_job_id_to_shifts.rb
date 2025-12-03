class AddJobIdToShifts < ActiveRecord::Migration[7.2]
  def change
    # Link shifts to jobs (optional - standalone shifts still allowed)
    add_reference :shifts, :job, foreign_key: { on_delete: :cascade }, index: true, null: true

    # Link to specific skill requirement from job (optional but useful for tracking)
    add_column :shifts, :job_skill_requirement_id, :bigint
    add_index :shifts, :job_skill_requirement_id
    add_foreign_key :shifts, :job_skill_requirements,
                    column: :job_skill_requirement_id,
                    on_delete: :nullify

    # Add flag to indicate if shift was auto-generated from job
    add_column :shifts, :auto_generated, :boolean, default: false, null: false
    add_index :shifts, :auto_generated

    # Add required skill name (copied from job_skill_requirement)
    add_column :shifts, :required_skill, :string
    add_index :shifts, :required_skill

    # Add uniform requirement (copied from job_skill_requirement)
    add_column :shifts, :uniform_name, :string
  end
end
