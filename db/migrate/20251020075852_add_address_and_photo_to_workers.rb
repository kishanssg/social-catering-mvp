class AddAddressAndPhotoToWorkers < ActiveRecord::Migration[7.2]
  def change
    add_column :workers, :address_line1, :string
    add_column :workers, :address_line2, :string
    add_column :workers, :profile_photo_url, :string
  end
end
