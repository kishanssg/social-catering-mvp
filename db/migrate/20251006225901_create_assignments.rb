class CreateAssignments < ActiveRecord::Migration[8.0]
  def change
    create_table :assignments do |t|
      t.references :shift, null: false, foreign_key: { on_delete: :cascade }
      t.references :worker, null: false, foreign_key: { on_delete: :restrict }
      t.bigint :assigned_by_id
      t.datetime :assigned_at_utc, null: false
      t.string :status, null: false, default: 'assigned'

      t.timestamps
    end

    add_index :assignments, [ :shift_id, :worker_id ], unique: true
    add_index :assignments, [ :worker_id, :status ]

    add_check_constraint :assignments, "status IN ('assigned', 'completed', 'no_show', 'cancelled')", name: 'assignments_valid_status'

    add_foreign_key :assignments, :users, column: :assigned_by_id
  end
end
