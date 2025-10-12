class CreateActivityLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :activity_logs do |t|
      t.bigint :actor_user_id
      t.string :entity_type, null: false
      t.bigint :entity_id, null: false
      t.string :action, null: false
      t.jsonb :before_json
      t.jsonb :after_json
      t.datetime :created_at_utc, null: false

      t.timestamps
    end

    add_index :activity_logs, [ :entity_type, :entity_id ]
    add_index :activity_logs, :created_at_utc
    add_index :activity_logs, :actor_user_id

    add_foreign_key :activity_logs, :users, column: :actor_user_id, on_delete: :nullify
  end
end
