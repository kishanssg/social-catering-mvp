class AddIdxActivityLogsEntityTypeCreatedAt < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    add_index :activity_logs, [:entity_type, :created_at_utc],
      name: "idx_activity_logs_entity_type_created_at_utc",
      algorithm: :concurrently,
      if_not_exists: true
  end
end
