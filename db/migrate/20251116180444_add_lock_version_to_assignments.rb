class AddLockVersionToAssignments < ActiveRecord::Migration[7.2]
  def change
    add_column :assignments, :lock_version, :integer, null: false, default: 0
  end
end
