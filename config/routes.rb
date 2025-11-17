Rails.application.routes.draw do
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Custom health check endpoint for monitoring
  get "/healthz", to: "health#check"
  get "/health/metrics", to: "health#metrics"

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
          post :restore
          # Approvals
          get :approvals, to: 'approvals#show'
          post :approve_all, to: 'approvals#approve_event'
          post :approve_selected, to: 'approvals#approve_selected'
        end
        resources :event_skill_requirements, only: [:create, :update, :destroy] do
          member do
            get :eligible_workers
          end
        end
      end
      
      # Keep jobs as alias for backward compatibility
      resources :jobs, controller: 'events'
      
      # Staffing endpoints (keep for modal operations only)
      resources :staffing, only: [:create, :update, :destroy] do
        collection do
          post :bulk_create
          post :validate_bulk
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
      # Preview endpoint (outside namespace to avoid routing conflicts)
      get 'reports/timesheet/preview', to: 'reports#timesheet_preview'
      
      namespace :reports do
        get :timesheet
        get :payroll
        get :worker_hours
        get :event_summary
      end

      # Approval actions on assignments
      resources :approvals, only: [] do
        collection do
          patch ':id/update_hours', to: 'approvals#update_hours', as: :update_hours
          post ':id/mark_no_show', to: 'approvals#mark_no_show', as: :mark_no_show
          delete ':id/remove', to: 'approvals#remove', as: :remove_assignment
        end
      end
    end
  end

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Serve SPA for HTML paths only, never for real files
  get '*path', to: 'home#index',
    constraints: ->(req) {
      req.format.html? &&
      !req.path.match?(/\.(?:js|css|map|png|jpe?g|gif|svg|ico|json|txt|woff2?|ttf)$/) &&
      !req.path.start_with?('/assets/')
    }

  # Defines the root path route ("/")
  root "home#index"
end
