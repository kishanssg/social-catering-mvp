class AddPublishingFieldsToJobs < ActiveRecord::Migration[7.2]
  def change
    # Track when job was published (shifts generated)
    add_column :jobs, :published_at_utc, :timestamptz
    add_index :jobs, :published_at_utc

    # Track if shifts have been generated
    add_column :jobs, :shifts_generated, :boolean, default: false, null: false
    add_index :jobs, :shifts_generated

    # Cache count of generated shifts
    add_column :jobs, :shifts_count, :integer, default: 0, null: false

    # Track filled shifts count (updated when assignments made)
    add_column :jobs, :filled_shifts_count, :integer, default: 0, null: false
  end
end
