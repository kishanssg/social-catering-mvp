module Api
  module V1
    class CertificationsController < BaseController
      def index
        certifications = Certification.order(:name)
        
        render_success({
          certifications: certifications.as_json(only: [:id, :name])
        })
      end
    end
  end
end
