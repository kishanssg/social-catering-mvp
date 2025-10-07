module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :verify_authenticity_token
      respond_to :json
      
      def create
        user = User.find_by(email: params[:user][:email])
        
        if user && user.valid_password?(params[:user][:password])
          sign_in(user)
          render json: {
            status: 'success',
            data: {
              user: {
                id: user.id,
                email: user.email,
                role: user.role
              }
            }
          }
        else
          render json: {
            status: 'error',
            error: 'Invalid email or password'
          }, status: :unauthorized
        end
      end
      
      def destroy
        sign_out(current_user) if current_user
        render json: {
          status: 'success',
          message: 'Signed out successfully'
        }
      end
    end
  end
end
