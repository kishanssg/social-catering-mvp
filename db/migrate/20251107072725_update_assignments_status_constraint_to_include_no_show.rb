class UpdateAssignmentsStatusConstraintToIncludeNoShow < ActiveRecord::Migration[7.2]
  def up
    # Remove the old constraint
    remove_check_constraint :assignments, name: "assignments_valid_status"

    # Add new constraint that includes 'no_show'
    add_check_constraint :assignments,
      "status::text = ANY (ARRAY['assigned'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying]::text[])",
      name: "assignments_valid_status"
  end

  def down
    # Remove the new constraint
    remove_check_constraint :assignments, name: "assignments_valid_status"

    # Restore old constraint (without 'no_show')
    add_check_constraint :assignments,
      "status::text = ANY (ARRAY['assigned'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])",
      name: "assignments_valid_status"
  end
end
