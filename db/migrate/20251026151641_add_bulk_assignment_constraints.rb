class AddBulkAssignmentConstraints < ActiveRecord::Migration[7.2]
  def up
    # Add unique index to prevent duplicate assignments
    # This allows multiple assignments with same worker+shift if one is cancelled
    add_index :assignments, [:worker_id, :shift_id], 
              unique: true,
              where: "status NOT IN ('cancelled', 'no_show')",
              name: 'index_active_assignments_on_worker_and_shift',
              if_not_exists: true
    
    # Add check constraint for capacity at database level
    # This function will be called BEFORE insert to check capacity
    execute <<-SQL
      CREATE OR REPLACE FUNCTION check_shift_capacity()
      RETURNS TRIGGER AS $$
      DECLARE
        current_count INTEGER;
        max_capacity INTEGER;
      BEGIN
        -- Count active assignments for this shift (excluding the one being inserted)
        SELECT COUNT(*) INTO current_count
        FROM assignments
        WHERE shift_id = NEW.shift_id
          AND status NOT IN ('cancelled', 'no_show');
        
        -- Get the shift capacity
        SELECT capacity INTO max_capacity
        FROM shifts
        WHERE id = NEW.shift_id;
        
        -- Check if adding this assignment would exceed capacity
        IF current_count >= max_capacity THEN
          RAISE EXCEPTION 'Shift is at full capacity (%)', max_capacity;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    SQL
    
    # Create trigger to enforce capacity
    execute <<-SQL
      DROP TRIGGER IF EXISTS enforce_shift_capacity ON assignments;
      CREATE TRIGGER enforce_shift_capacity
        BEFORE INSERT ON assignments
        FOR EACH ROW
        EXECUTE FUNCTION check_shift_capacity();
    SQL
  end
  
  def down
    execute 'DROP TRIGGER IF EXISTS enforce_shift_capacity ON assignments;'
    execute 'DROP FUNCTION IF EXISTS check_shift_capacity();'
    remove_index :assignments, name: 'index_active_assignments_on_worker_and_shift', if_exists: true
  end
end
