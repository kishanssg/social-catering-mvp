class FixAssignmentStatusConstraint < ActiveRecord::Migration[7.2]
  def change
    # Update existing data to use correct status values
    reversible do |dir|
      dir.up do
        # Update 'no_show' to 'cancelled' to match new constraint
        execute "UPDATE assignments SET status = 'cancelled' WHERE status = 'no_show'"
      end
      dir.down do
        # Revert 'cancelled' back to 'no_show' if rolling back
        execute "UPDATE assignments SET status = 'no_show' WHERE status = 'cancelled'"
      end
    end
    
    # Remove old constraint
    remove_check_constraint :assignments, name: "assignments_valid_status"
    
    # Add new constraint with correct status values
    add_check_constraint :assignments, 
      "status IN ('assigned', 'confirmed', 'completed', 'cancelled')", 
      name: "assignments_valid_status"
  end
end
