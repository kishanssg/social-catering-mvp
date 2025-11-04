class AddLocationIdToShifts < ActiveRecord::Migration[7.2]
  def change
    add_column :shifts, :location_id, :bigint
    add_foreign_key :shifts, :locations, on_delete: :restrict
  end
end
