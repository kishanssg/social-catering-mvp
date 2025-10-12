Rails.application.routes.draw do
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Custom health check endpoint for monitoring
  get '/healthz', to: 'health#check'

  # API routes
  namespace :api do
    namespace :v1 do
      # Authentication routes
      post 'login', to: 'sessions#create'
      delete 'logout', to: 'sessions#destroy'
      
      resources :workers, only: [:index, :show, :create, :update] do
        member do
          post 'certifications', to: 'workers#add_certification'
          delete 'certifications/:certification_id', to: 'workers#remove_certification'
        end
      end
      resources :shifts, only: [:index, :show, :create, :update, :destroy]
      resources :assignments, only: [:index, :create, :update, :destroy]
      resources :certifications, only: [:index]
      resources :activity_logs, only: [:index]
      # Dashboard
      get 'dashboard', to: 'dashboard#index'
    end
  end

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Serve React app for all non-API routes (Rails will handle static files automatically)
  get '*path', to: 'home#index', constraints: lambda { |req| !req.path.start_with?('/api') }
  
  # Defines the root path route ("/")
  root "home#index"
end
