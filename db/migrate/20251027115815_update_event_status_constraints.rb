class UpdateEventStatusConstraints < ActiveRecord::Migration[7.2]
  def up
    # Drop old constraints that don't include 'deleted'
    execute "ALTER TABLE events DROP CONSTRAINT IF EXISTS check_event_status;"
    execute "ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_job_status;"

    # Add new constraint that includes 'deleted' status
    execute %{
      ALTER TABLE events
      ADD CONSTRAINT check_event_status
      CHECK (status IN ('draft', 'published', 'assigned', 'completed', 'archived', 'deleted'));
    }
  end

  def down
    execute "ALTER TABLE events DROP CONSTRAINT IF EXISTS check_event_status;"
    execute "ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_job_status;"

    # Restore original constraints
    execute %{
      ALTER TABLE events
      ADD CONSTRAINT check_event_status
      CHECK (status IN ('draft', 'published', 'assigned', 'completed', 'archived'));
    }
  end
end
