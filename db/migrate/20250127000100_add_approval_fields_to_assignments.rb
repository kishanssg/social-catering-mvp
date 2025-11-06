class AddApprovalFieldsToAssignments < ActiveRecord::Migration[7.0]
  def change
    # Approval tracking
    add_column :assignments, :approved, :boolean, default: false, null: false
    add_column :assignments, :approved_by_id, :integer
    # *_utc per project rules (TIMESTAMPTZ)
    add_column :assignments, :approved_at_utc, :timestamptz

    # Actual work times (vs scheduled)
    add_column :assignments, :actual_start_time_utc, :timestamptz
    add_column :assignments, :actual_end_time_utc, :timestamptz

    # Audit trail
    add_column :assignments, :original_hours_worked, :decimal, precision: 8, scale: 2
    add_column :assignments, :edited_at_utc, :timestamptz
    add_column :assignments, :edited_by_id, :integer

    # Notes for adjustments
    add_column :assignments, :approval_notes, :text

    # Foreign keys
    add_foreign_key :assignments, :users, column: :approved_by_id, on_delete: :nullify
    add_foreign_key :assignments, :users, column: :edited_by_id, on_delete: :nullify

    # Indexes
    add_index :assignments, :approved
    add_index :assignments, :approved_by_id
    add_index :assignments, :edited_by_id
  end
end


