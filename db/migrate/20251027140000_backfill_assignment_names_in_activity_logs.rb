class BackfillAssignmentNamesInActivityLogs < ActiveRecord::Migration[7.0]
  def up
    # Backfill activity logs for assignments that don't have names
    ActivityLog.where(action: [ 'assigned_worker', 'unassigned_worker' ]).find_each do |log|
      updated = false
      new_after_json = log.after_json || {}
      new_before_json = log.before_json || {}

      # For assigned_worker, backfill shift_name and worker_name if missing
      if log.action == 'assigned_worker' && (!new_after_json['shift_name'] || !new_after_json['worker_name'])
        assignment = Assignment.find_by(id: log.entity_id)
        if assignment
          new_after_json['shift_name'] ||= assignment.shift&.client_name || "Shift ##{assignment.shift_id}"
          new_after_json['worker_name'] ||= "#{assignment.worker&.first_name} #{assignment.worker&.last_name}".strip || "Worker ##{assignment.worker_id}"
          new_after_json['role'] ||= assignment.shift&.role_needed || "Unknown"
          new_after_json['hourly_rate'] ||= assignment.hourly_rate if assignment.hourly_rate
          updated = true
        end
      end

      # For unassigned_worker, backfill from before_json
      if log.action == 'unassigned_worker' && (!new_before_json['shift_name'] || !new_before_json['worker_name'])
        assignment = Assignment.find_by(id: log.entity_id)
        if assignment
          new_before_json['shift_name'] ||= assignment.shift&.client_name || "Shift ##{assignment.shift_id}"
          new_before_json['worker_name'] ||= "#{assignment.worker&.first_name} #{assignment.worker&.last_name}".strip || "Worker ##{assignment.worker_id}"
          new_before_json['role'] ||= assignment.shift&.role_needed || "Unknown"
          new_before_json['hourly_rate'] ||= assignment.hourly_rate if assignment.hourly_rate
          updated = true
        end
      end

      # Also backfill for Worker create/update actions
      if log.entity_type == 'Worker' && (!new_after_json['first_name'] && !new_before_json['first_name'])
        worker = Worker.find_by(id: log.entity_id)
        if worker
          if log.action == 'created' && log.after_json.present?
            new_after_json['first_name'] ||= worker.first_name
            new_after_json['last_name'] ||= worker.last_name
            new_after_json['email'] ||= worker.email
            new_after_json['phone'] ||= worker.phone
            updated = true
          elsif log.action == 'updated' && log.before_json.present?
            new_before_json['first_name'] ||= worker.first_name
            new_before_json['last_name'] ||= worker.last_name
            new_before_json['email'] ||= worker.email
            new_before_json['phone'] ||= worker.phone
            updated = true
          end
        end
      end

      if updated
        log.update_columns(
          after_json: new_after_json.presence,
          before_json: new_before_json.presence
        )
      end
    end
  end

  def down
    # No rollback needed for this backfill
  end
end
