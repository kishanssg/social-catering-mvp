Rails.application.routes.draw do
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Custom health check endpoint for monitoring
  get "/healthz", to: "health#check"

  # API routes
  namespace :api do
    namespace :v1 do
      # Authentication routes
      post "login", to: "sessions#create"
      delete "logout", to: "sessions#destroy"

      resources :workers, only: [ :index, :show, :create, :update, :destroy ] do
        member do
          post "certifications", to: "workers#add_certification"
          delete "certifications/:certification_id", to: "workers#remove_certification"
        end
      end
      resources :shifts, only: [ :index, :show, :create, :update, :destroy ]
      resources :assignments, only: [ :index, :create, :update, :destroy ] do
        collection do
          post :bulk_create
          get :export
        end
        member do
          post :clock_in
          post :clock_out
          patch :update_break
        end
      end
      resources :certifications, only: [ :index ]
      resources :activity_logs, only: [ :index ]
      resources :skills, only: [ :index, :create ]
      resources :locations, only: [ :index, :create ]
      
      # Venues with Google Places integration
      resources :venues, only: [ :index, :show, :create, :update ] do
        collection do
          get :search
          post :select
        end
      end
      
      # Reports
      namespace :reports do
        get 'timesheet', to: 'timesheets#export'
        get 'timesheet/preview', to: 'timesheets#preview'
      end
      
      # Legacy exports (keep for backward compatibility)
      get "exports/timesheet", to: "exports#timesheet"
      
      # Dashboard
      get "dashboard", to: "dashboard#index"
      
      # Events
      resources :events do
        member do
          patch :update_status
          post :publish
          post :complete
        end
        resources :event_skill_requirements, only: [:create, :update, :destroy]
      end
      
      # Keep jobs as alias for backward compatibility
      resources :jobs, controller: 'events'
      
      # Staffing endpoints (keep for modal operations only)
      resources :staffing, only: [:create, :update, :destroy] do
        collection do
          post :bulk_create
        end
      end
      
      # Keep assignments as alias for backward compatibility
      resources :assignments, controller: 'staffing', only: [:create, :update, :destroy] do
        collection do
          post :bulk_create
          get :export
        end
        member do
          post :clock_in
          post :clock_out
          patch :update_break
        end
      end
      
      # Reports
      namespace :reports do
        get :timesheet
        get :payroll
        get :worker_hours
        get :event_summary
      end
    end
  end

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Serve React app for all non-API routes (public, no auth)
  get "*path", to: "home#index", constraints: lambda { |req| 
    !req.path.start_with?("/api") && 
    !req.path.start_with?("/assets") &&
    !req.path.start_with?("/favicon") &&
    !req.path.start_with?("/robots") &&
    !req.path.start_with?("/manifest")
  }

  # Defines the root path route ("/")
  root "home#index"
end
