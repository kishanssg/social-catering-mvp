module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      before_action :set_current_user
      
      skip_before_action :verify_authenticity_token
      
      respond_to :json
      
      rescue_from ActiveRecord::RecordNotFound, with: :record_not_found
      rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
      
      private
      
      def set_current_user
        Current.user = current_user
      end
      
      def render_success(data = {}, status: :ok)
        render json: { data: data, status: 'success' }, status: status
      end
      
      def render_error(message, status: :unprocessable_entity)
        render json: { error: message, status: 'error' }, status: status
      end
      
      def render_validation_errors(errors)
        render json: {
          errors: errors,
          status: 'validation_error'
        }, status: :unprocessable_entity
      end
      
      def record_not_found(exception)
        render_error("Record not found: #{exception.message}", status: :not_found)
      end
      
      def record_invalid(exception)
        render_validation_errors(exception.record.errors.messages)
      end
    end
  end
end
