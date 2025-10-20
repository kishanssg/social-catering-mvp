module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :verify_authenticity_token
      skip_before_action :authenticate_user!, only: [:create]
      respond_to :json

      def create
        Rails.logger.info "=== LOGIN ATTEMPT DEBUG ==="
        Rails.logger.info "Params: #{params.inspect}"
        Rails.logger.info "Email: #{params[:user][:email]}"
        Rails.logger.info "Password received: #{params[:user][:password].present?}"
        
        user = User.find_by(email: params[:user][:email])
        Rails.logger.info "User found: #{user.present?}"
        
        if user
          Rails.logger.info "User ID: #{user.id}"
          Rails.logger.info "Encrypted password present: #{user.encrypted_password.present?}"
          is_valid = user.valid_password?(params[:user][:password])
          Rails.logger.info "Password valid: #{is_valid}"
        end

        if user && user.valid_password?(params[:user][:password])
          sign_in(user)
          Rails.logger.info "Sign in successful"
          render json: {
            status: "success",
            data: {
              user: {
                id: user.id,
                email: user.email,
                role: user.role
              }
            }
          }
        else
          Rails.logger.error "Login failed - User: #{user.present?}, Valid password: #{user&.valid_password?(params[:user][:password])}"
          render json: {
            status: "error",
            error: "Invalid email or password"
          }, status: :unauthorized
        end
      end

      def destroy
        sign_out(current_user) if current_user
        render json: {
          status: "success",
          message: "Signed out successfully"
        }
      end
    end
  end
end
