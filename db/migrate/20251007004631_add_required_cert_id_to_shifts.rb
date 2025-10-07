class AddRequiredCertIdToShifts < ActiveRecord::Migration[8.0]
  def change
    add_column :shifts, :required_cert_id, :bigint
    add_foreign_key :shifts, :certifications, column: :required_cert_id, on_delete: :nullify
    add_index :shifts, :required_cert_id
  end
end
