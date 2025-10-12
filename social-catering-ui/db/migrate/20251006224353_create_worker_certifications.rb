class CreateWorkerCertifications < ActiveRecord::Migration[8.0]
  def change
    create_table :worker_certifications do |t|
      t.references :worker, null: false, foreign_key: { on_delete: :cascade }
      t.references :certification, null: false, foreign_key: { on_delete: :restrict }
      t.datetime :expires_at_utc, null: false

      t.timestamps
    end

    add_index :worker_certifications, [ :worker_id, :certification_id ], unique: true
    add_index :worker_certifications, :expires_at_utc
  end
end
