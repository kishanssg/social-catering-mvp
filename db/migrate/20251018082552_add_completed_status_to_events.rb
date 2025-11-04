class AddCompletedStatusToEvents < ActiveRecord::Migration[7.2]
  def change
    # Ensure status can include 'completed'
    # Check constraint might already exist from earlier migrations
    
    # Add index for filtering
    add_index :events, :status unless index_exists?(:events, :status)
    
    # Add scope helper fields
    add_column :events, :completed_at_utc, :timestamptz unless column_exists?(:events, :completed_at_utc)
    add_index :events, :completed_at_utc
    
    # Add additional tracking fields for better reporting
    add_column :events, :total_hours_worked, :decimal, precision: 8, scale: 2, default: 0 unless column_exists?(:events, :total_hours_worked)
    add_column :events, :total_pay_amount, :decimal, precision: 10, scale: 2, default: 0 unless column_exists?(:events, :total_pay_amount)
    add_column :events, :completion_notes, :text unless column_exists?(:events, :completion_notes)
  end
end
