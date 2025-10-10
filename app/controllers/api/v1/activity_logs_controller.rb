module Api
  module V1
    class ActivityLogsController < BaseController
      before_action :require_admin!

      # GET /api/v1/activity_logs
      def index
        page = [params[:page].to_i, 1].max
        per_page = get_per_page

        scoped = ActivityLog.order(created_at_utc: :desc)
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
        render_error('Failed to retrieve activity logs', status: :internal_server_error)
      end

      private

      def require_admin!
        render_error('Unauthorized - Admin access required', status: :forbidden) unless current_user&.admin?
      end

      def get_per_page
        per_page = params[:per_page].to_i
        per_page = 50 if per_page <= 0
        [per_page, 100].min
      end

      def serialize_logs(logs)
        logs.map do |log|
          {
            id: log.id,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            actor_user_id: log.actor_user_id,
            created_at: log.created_at_utc&.iso8601
          }
        end
      end
    end
  end
end
