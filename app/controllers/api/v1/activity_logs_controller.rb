module Api
  module V1
    class ActivityLogsController < BaseController
      before_action :require_admin!

      # GET /api/v1/activity_logs
      def index
        page = [ params[:page].to_i, 1 ].max
        per_page = get_per_page

        scoped = ActivityLog.order(created_at_utc: :desc)

        # Apply filters
        scoped = scoped.where(entity_type: params[:entity_type]) if params[:entity_type].present?
        scoped = scoped.where(action: params[:log_action]) if params[:log_action].present?
        scoped = scoped.where(actor_user_id: params[:actor_user_id]) if params[:actor_user_id].present?
        
        # Date filtering
        if params[:date_from].present?
          begin
            date_from = Time.parse(params[:date_from]).beginning_of_day
            scoped = scoped.where('created_at_utc >= ?', date_from)
          rescue ArgumentError
            # Invalid date format, ignore
          end
        end
        
        if params[:date_to].present?
          begin
            date_to = Time.parse(params[:date_to]).end_of_day
            scoped = scoped.where('created_at_utc <= ?', date_to)
          rescue ArgumentError
            # Invalid date format, ignore
          end
        end

        total_count = scoped.count
        logs = scoped.limit(per_page).offset((page - 1) * per_page)

        render_success({
          activity_logs: serialize_logs(logs),
          pagination: {
            current_page: page,
            per_page: per_page,
            total_count: total_count,
            total_pages: (total_count.to_f / per_page).ceil,
            has_next_page: page < (total_count.to_f / per_page).ceil,
            has_prev_page: page > 1
          }
        })
      rescue => e
        Rails.logger.error("ActivityLogsController Error: #{e.message}")
        Rails.logger.error(e.backtrace.first(5).join("\n"))
        render_error("Failed to retrieve activity logs", status: :internal_server_error)
      end

      private

      def require_admin!
        render_error("Unauthorized - Admin access required", status: :forbidden) unless current_user&.admin?
      end

      def get_per_page
        per_page = params[:per_page].to_i
        per_page = 50 if per_page <= 0
        [ per_page, 100 ].min
      end

      def serialize_logs(logs)
        logs.map do |log|
          actor_email = log.actor_user&.email || 'System'
          actor_name = extract_first_name(actor_email)
          
          {
            id: log.id,
            when: log.created_at_utc&.iso8601,
            actor: actor_name,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            entity_name: extract_entity_name(log),
            action: log.action,
            summary: log.summary || build_action_description(log, actor_name),
            details: log.details_json || {}
          }
        end
      end

      def extract_first_name(email)
        return 'Admin' if email.blank?
        
        # Extract name from email (e.g., "natalie@socialcatering.com" → "Natalie")
        name = email.split('@').first
        name.split('.').map(&:capitalize).join(' ')
      end

      def build_action_description(log, actor_name)
        case log.action
        when 'assigned_worker'
          after = log.after_json || {}
          worker = after['worker_name'] || "worker"
          shift = after['shift_name'] || "shift"
          role = after['role'] || "role"
          "#{actor_name} assigned #{worker} to #{shift} as #{role}"
          
        when 'unassigned_worker'
          before = log.before_json || {}
          worker = before['worker_name'] || "worker"
          shift = before['shift_name'] || "shift"
          "#{actor_name} unassigned #{worker} from #{shift}"
          
        when 'created'
          entity_name = extract_entity_name(log)
          entity_type = format_entity_type(log.entity_type)
          if entity_name
            "#{actor_name} added #{entity_name} to the system"
          else
            "#{actor_name} created #{entity_type}"
          end
          
        when 'updated'
          entity_name = extract_entity_name(log)
          entity_type = format_entity_type(log.entity_type)
          if entity_name
            "#{actor_name} updated #{entity_name}"
          else
            "#{actor_name} updated #{entity_type}"
          end
          
        when 'deleted'
          entity_name = extract_entity_name(log)
          entity_type = format_entity_type(log.entity_type)
          if entity_name
            "#{actor_name} removed #{entity_name}"
          else
            "#{actor_name} deleted #{entity_type}"
          end
          
        else
          "#{actor_name} performed #{log.action} on #{log.entity_type}"
        end
      end

      def extract_entity_name(log)
        data = log.after_json || log.before_json || {}
        
        # First, check for entity_name (added by Auditable concern)
        return data['entity_name'] if data['entity_name'].present?
        
        # For assignments, build a descriptive name
        if log.entity_type == 'Assignment'
          worker_name = data['worker_name'] || 'worker'
          shift_name = data['shift_name'] || 'shift'
          role = data['role'] || ''
          return "#{worker_name} → #{shift_name}" + (role.present? ? " (#{role})" : "")
        end
        
        # Try multiple fields in order of preference
        return data['title'] if data['title'].present?
        return data['name'] if data['name'].present?
        return data['client_name'] if data['client_name'].present?
        
        # For workers, combine first and last name
        if data['first_name'] || data['last_name']
          name_parts = [data['first_name'], data['last_name']].compact
          return name_parts.join(' ') if name_parts.any?
        end
        
        # For shifts, use shift_name
        return data['shift_name'] if data['shift_name'].present?
        
        nil
      end

      def format_entity_type(entity_type)
        case entity_type.downcase
        when 'assignment' then 'an assignment'
        when 'event' then 'an event'
        when 'shift' then 'a shift'
        when 'worker' then 'a worker'
        else entity_type
        end
      end
    end
  end
end
