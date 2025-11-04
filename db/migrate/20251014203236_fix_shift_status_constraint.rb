class FixShiftStatusConstraint < ActiveRecord::Migration[7.2]
  def change
    # Remove old constraint first
    remove_check_constraint :shifts, name: "shifts_valid_status"
    
    # Update existing data to use correct status values
    reversible do |dir|
      dir.up do
        # Update 'completed' to 'archived' to match new constraint
        execute "UPDATE shifts SET status = 'archived' WHERE status = 'completed'"
      end
      dir.down do
        # Revert 'archived' back to 'completed' if rolling back
        execute "UPDATE shifts SET status = 'completed' WHERE status = 'archived'"
      end
    end
    
    # Add new constraint with correct status values
    add_check_constraint :shifts, 
      "status IN ('draft', 'published', 'archived')", 
      name: "shifts_valid_status"
  end
end
