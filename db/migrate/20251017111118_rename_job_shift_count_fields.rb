class RenameJobShiftCountFields < ActiveRecord::Migration[7.2]
  def change
    # Rename shifts_count to total_shifts_count for clarity
    rename_column :jobs, :shifts_count, :total_shifts_count
    
    # Rename filled_shifts_count to assigned_shifts_count for clarity
    rename_column :jobs, :filled_shifts_count, :assigned_shifts_count
  end
end
