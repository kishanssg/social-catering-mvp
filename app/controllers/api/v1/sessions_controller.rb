module Api
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :verify_authenticity_token
      respond_to :json
      
      def create
        self.resource = warden.authenticate!(auth_options)
        set_flash_message!(:notice, :signed_in)
        sign_in(resource_name, resource)
        
        render json: {
          status: 'success',
          data: {
            user: {
              id: resource.id,
              email: resource.email,
              role: resource.role
            }
          }
        }
      end
      
      def destroy
        signed_out = (Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name))
        set_flash_message!(:notice, :signed_out) if signed_out
        
        render json: {
          status: 'success',
          message: 'Signed out successfully'
        }
      end
      
      private
      
      def auth_options
        { scope: resource_name, recall: "#{controller_path}#new" }
      end
    end
  end
end
