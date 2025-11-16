class AddHoursRangeCheckToAssignments < ActiveRecord::Migration[7.2]
  def change
    add_check_constraint :assignments,
      "hours_worked IS NULL OR (hours_worked >= 0 AND hours_worked <= 24)",
      name: "assignments_valid_hours_range"
  end
end
