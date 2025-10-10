module Api
  module V1
    class ActivityLogsController < BaseController
      def index
        # Start with deterministic, indexed order for performance
        logs = ActivityLog.order(created_at_utc: :desc)
        
        # Filter by entity type if provided
        if params[:entity_type].present?
          logs = logs.where(entity_type: params[:entity_type])
        end
        
        # Filter by entity ID if provided
        if params[:entity_id].present?
          logs = logs.where(entity_id: params[:entity_id])
        end
        
        # Filter by actor (user who did the action)
        if params[:actor_user_id].present?
          logs = logs.where(actor_user_id: params[:actor_user_id])
        end
        
        # Filter by action type
        if params[:action].present?
          logs = logs.where(action: params[:action])
        end
        
        # Filter by date range (safe parsing)
        if params[:from_date].present?
          from_time = begin
            Time.iso8601(params[:from_date])
          rescue ArgumentError, TypeError
            nil
          end
          logs = logs.where('created_at_utc >= ?', from_time) if from_time
        end

        if params[:to_date].present?
          to_time = begin
            Time.iso8601(params[:to_date])
          rescue ArgumentError, TypeError
            nil
          end
          logs = logs.where('created_at_utc <= ?', to_time) if to_time
        end
        # Ensure final order (redundant if no date filters)
        logs = logs.reorder(created_at_utc: :desc)
        
        # Paginate results (limit 50 per page)
        page = params[:page].to_i
        page = 1 if page <= 0
        per_page = 50
        offset = (page - 1) * per_page
        
        total_count = logs.count
        logs = logs.limit(per_page).offset(offset)
        
        render_success({
          activity_logs: logs.as_json,
          pagination: {
            current_page: page,
            per_page: per_page,
            total_count: total_count,
            total_pages: (total_count.to_f / per_page).ceil
          }
        })
      end
    end
  end
end
