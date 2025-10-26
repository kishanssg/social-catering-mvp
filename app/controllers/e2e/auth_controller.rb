class E2E::AuthController < ApplicationController
  skip_before_action :verify_authenticity_token

  def login
    secret = ENV["E2E_SECRET"]
    return render(json: { error: "forbidden" }, status: :forbidden) unless secret.present? && params[:secret] == secret

    user = User.find_by(email: params[:email])
    return render(json: { error: "user_not_found" }, status: :not_found) unless user

    sign_in(user) # Devise sets session cookie
    render json: { status: "ok", user: { id: user.id, email: user.email } }
  end

  def logout
    sign_out(current_user) if current_user
    render json: { status: "ok" }
  end
end
