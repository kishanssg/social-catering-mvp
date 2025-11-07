class AddPartialUniqueIndexForActiveAssignments < ActiveRecord::Migration[7.2]
  def up
    # Remove the old unique index that doesn't account for status
    remove_index :assignments, [:shift_id, :worker_id], if_exists: true
    
    # Add a partial unique index that only applies to active assignments
    # This prevents duplicate active assignments but allows cancelled/no_show duplicates
    execute <<-SQL
      CREATE UNIQUE INDEX index_assignments_on_shift_id_and_worker_id_active
      ON assignments (shift_id, worker_id)
      WHERE status NOT IN ('cancelled', 'no_show')
    SQL
  end

  def down
    execute "DROP INDEX IF EXISTS index_assignments_on_shift_id_and_worker_id_active"
    add_index :assignments, [:shift_id, :worker_id], unique: true
  end
end
