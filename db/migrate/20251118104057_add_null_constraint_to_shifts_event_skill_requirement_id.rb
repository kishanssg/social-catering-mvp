class AddNullConstraintToShiftsEventSkillRequirementId < ActiveRecord::Migration[7.2]
  def change
    # First, ensure any remaining NULL values are cleaned up
    execute <<-SQL
      DELETE FROM shifts WHERE event_skill_requirement_id IS NULL;
    SQL
    
    # Then add the NOT NULL constraint to prevent future NULLs
    change_column_null :shifts, :event_skill_requirement_id, false
    
    # Add a helpful comment
    reversible do |dir|
      dir.up do
        execute <<-SQL
          COMMENT ON COLUMN shifts.event_skill_requirement_id IS 
          'Foreign key to event_skill_requirements. Cannot be NULL - every shift must belong to a specific skill requirement.';
        SQL
      end
    end
  end
end
