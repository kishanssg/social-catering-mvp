# ⚙️ PROJECT CONFIGURATION - SOCIAL CATERING MVP

**Last Updated:** January 2025  
**Project Name:** Social Catering MVP  
**Repository:** [GitHub URL]  
**Tech Stack:** Rails 7.2 + React 19 + PostgreSQL 16

---

## 📁 PROJECT STRUCTURE

```
social-catering-mvp/
├── app/                              # Rails backend
│   ├── controllers/
│   │   └── api/v1/                   # API v1 endpoints
│   │       ├── base_controller.rb    # Base API controller
│   │       ├── sessions_controller.rb
│   │       ├── events_controller.rb
│   │       ├── workers_controller.rb
│   │       ├── staffing_controller.rb
│   │       ├── shifts_controller.rb
│   │       ├── reports_controller.rb
│   │       └── venues_controller.rb
│   ├── models/
│   │   ├── user.rb
│   │   ├── worker.rb
│   │   ├── event.rb
│   │   ├── event_schedule.rb
│   │   ├── event_skill_requirement.rb
│   │   ├── shift.rb
│   │   ├── assignment.rb
│   │   ├── venue.rb
│   │   ├── skill.rb
│   │   ├── certification.rb
│   │   ├── worker_skill.rb
│   │   ├── worker_certification.rb
│   │   └── activity_log.rb
│   ├── services/
│   │   ├── assign_worker_to_shift.rb
│   │   └── google_places_service.rb
│   └── concerns/
│       └── auditable.rb
├── config/
│   ├── routes.rb                     # API routes
│   ├── database.yml                  # Database config
│   ├── credentials.yml.enc           # Encrypted secrets
│   ├── master.key                    # Encryption key (gitignored)
│   └── initializers/
│       ├── cors.rb                   # CORS configuration
│       └── devise.rb                 # Authentication config
├── db/
│   ├── schema.rb                     # Database schema
│   ├── seeds.rb                      # Seed data
│   └── migrate/                      # Migrations
├── social-catering-ui/               # React frontend
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EventsPage.tsx
│   │   │   ├── EventCreatePage.tsx
│   │   │   ├── EventDetailPage.tsx
│   │   │   ├── WorkersPage.tsx
│   │   │   ├── WorkerCreatePage.tsx
│   │   │   ├── WorkerDetailPage.tsx
│   │   │   └── ReportsPage.tsx
│   │   ├── components/               # Reusable components
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.tsx
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── EmptyState.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── lib/
│   │   │   └── api.ts                # Axios client
│   │   ├── App.tsx                   # Router setup
│   │   └── main.tsx                  # Entry point
│   ├── public/                       # Static assets
│   ├── package.json                  # Frontend dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── vite.config.ts                # Vite build config
│   └── tailwind.config.js            # Tailwind CSS config
├── public/                           # Built frontend (deployed)
├── docs/
│   ├── implementation_context.md
│   ├── workflow_state.md
│   └── project_config.md
├── Gemfile                           # Ruby dependencies
├── Gemfile.lock
├── package.json                      # Root package.json
├── Procfile                          # Heroku process file
├── .env.example                      # Environment variables template
├── .gitignore
└── README.md
```

---

## 🔧 TECHNOLOGY STACK

### **Backend**

#### **Core Framework**
```ruby
# Gemfile
ruby "3.3.0"
gem "rails", "~> 7.2.0"
```

**Version:** Rails 7.2.0  
**API Mode:** Yes (API-only application)  
**Documentation:** https://guides.rubyonrails.org/

#### **Database**
```ruby
gem "pg", "~> 1.1"
```

**Database:** PostgreSQL 16+  
**Extensions Used:**
- `pgcrypto` (for UUID generation)
- `pg_trgm` (for fuzzy text search)
- Full-text search (tsvector/tsquery)

#### **Authentication**
```ruby
gem "devise", "~> 4.9"
```

**Strategy:** Session-based authentication  
**Features:**
- Secure password hashing (bcrypt)
- Remember me functionality
- Session timeout
- CSRF protection

#### **Background Jobs**
```ruby
gem "solid_queue"
```

**Note:** Using SolidQueue (not Sidekiq)  
**Why:** Simpler setup, no Redis dependency

#### **CORS**
```ruby
gem "rack-cors"
```

**Configuration:** Allow frontend domain with credentials

#### **Other Key Gems**
```ruby
gem "bootsnap", require: false      # Faster boot times
gem "tzinfo-data"                   # Timezone data
gem "puma", ">= 5.0"               # Web server
```

---

### **Frontend**

#### **Core Framework**
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1"
}
```

**Version:** React 19 (latest)  
**Language:** TypeScript 5.9.3  
**Documentation:** https://react.dev/

#### **Build Tool**
```json
{
  "vite": "^7.1.7"
}
```

**Features:**
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- Built-in TypeScript support

#### **Routing**
```json
{
  "react-router-dom": "^7.9.3"
}
```

**Version:** React Router v7 (latest)  
**Features:**
- File-based routing
- Nested routes
- Data loaders

#### **Styling**
```json
{
  "tailwindcss": "^3.4.18",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.5.1"
}
```

**CSS Framework:** Tailwind CSS 3.4  
**Approach:** Utility-first CSS  
**Config:** `tailwind.config.js`

#### **Icons**
```json
{
  "lucide-react": "^0.545.0"
}
```

**Icon Library:** Lucide React  
**Usage:** Tree-shakeable, modern icons

#### **HTTP Client**
```json
{
  "axios": "^1.12.2"
}
```

**Features:**
- Interceptors for auth
- Request/response transformation
- Automatic JSON handling

#### **Date Handling**
```json
{
  "date-fns": "^4.1.0"
}
```

**Why date-fns:** Lightweight, tree-shakeable, immutable

#### **TypeScript**
```json
{
  "typescript": "~5.9.3",
  "@types/react": "^19.1.0",
  "@types/react-dom": "^19.1.0"
}
```

**Configuration:** `tsconfig.json`  
**Strict Mode:** Enabled

---

## 🌐 API CONFIGURATION

### **Base URL**
```typescript
// Development
const API_URL = 'http://localhost:3000'

// Production
const API_URL = 'https://sc-mvp-production.herokuapp.com'
```

### **API Client Setup**
```typescript
// src/lib/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for auth
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### **API Endpoints Structure**
```
Base: /api/v1

Authentication:
POST   /sessions/login
DELETE /sessions/logout
GET    /sessions/current

Events:
GET    /events?tab=draft|active|past&filter=needs_workers
GET    /events/:id
POST   /events
PATCH  /events/:id
DELETE /events/:id
POST   /events/:id/publish
POST   /events/:id/complete

Workers:
GET    /workers?active=true
GET    /workers/:id
POST   /workers
PATCH  /workers/:id
DELETE /workers/:id

Assignments:
POST   /staffing
POST   /staffing/bulk_create
PATCH  /staffing/:id
DELETE /staffing/:id

Reports:
GET    /reports/timesheet?start_date=&end_date=&worker_id=&event_id=
GET    /reports/payroll?start_date=&end_date=

Venues:
GET    /venues/search?query=
POST   /venues/select

Health:
GET    /healthz
```

---

## 🗄️ DATABASE CONFIGURATION

### **Development**
```yaml
# config/database.yml
development:
  adapter: postgresql
  encoding: unicode
  database: social_catering_development
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: <%= ENV['DATABASE_USERNAME'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: localhost
  port: 5432
```

### **Test**
```yaml
test:
  adapter: postgresql
  encoding: unicode
  database: social_catering_test
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: <%= ENV['DATABASE_USERNAME'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: localhost
  port: 5432
```

### **Production (Heroku)**
```yaml
production:
  url: <%= ENV['DATABASE_URL'] %>
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
```

### **Connection Pooling**
```ruby
# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY") { 2 }
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

preload_app!

on_worker_boot do
  ActiveRecord::Base.establish_connection
end
```

---

## 🔐 AUTHENTICATION FLOW

### **Login Flow**
```typescript
// 1. User submits login form
POST /api/v1/sessions/login
{
  "email": "admin@socialcatering.com",
  "password": "password123"
}

// 2. Server validates credentials
// 3. Server creates session and returns user
Response:
{
  "status": "success",
  "data": {
    "id": 1,
    "email": "admin@socialcatering.com",
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User"
  }
}

// 4. Session cookie stored automatically
Set-Cookie: _social_catering_session=...

// 5. All subsequent requests include cookie
GET /api/v1/events
Cookie: _social_catering_session=...
```

### **Authentication Check**
```typescript
// App.tsx - Check auth on mount
useEffect(() => {
  async function checkAuth() {
    try {
      const response = await apiClient.get('/sessions/current');
      setUser(response.data.data);
    } catch (error) {
      setUser(null);
    }
  }
  checkAuth();
}, []);
```

### **Protected Routes**
```typescript
// App.tsx
}>
  } />
  } />
  {/* ... other protected routes */}


// RequireAuth component
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return ;
  }
  
  return ;
}
```

---

## 🎨 STYLING CONFIGURATION

### **Tailwind Config**
```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // Main teal color
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### **Global Styles**
```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans antialiased text-gray-900 bg-gray-50;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors;
  }
  
  .input-field {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent;
  }
}
```

---

## 🌍 ENVIRONMENT VARIABLES

### **Backend (.env)**
```bash
# Required
DATABASE_URL=postgresql://localhost/social_catering_development
RAILS_ENV=development
SECRET_KEY_BASE=[run: rails secret]
RAILS_MASTER_KEY=[from config/master.key]

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173

# Optional
GOOGLE_PLACES_API_KEY=your_api_key_here

# Production only
RAILS_LOG_TO_STDOUT=true
RAILS_SERVE_STATIC_FILES=true
```

### **Frontend (.env)**
```bash
# Development
VITE_API_URL=http://localhost:3000

# Production
VITE_API_URL=https://sc-mvp-production.herokuapp.com
```

### **Setting Up .env Files**
```bash
# Backend
cp .env.example .env
# Edit .env with your values

# Frontend
cd social-catering-ui
cp .env.example .env
# Edit .env with your values
```

---

## 🚀 DEVELOPMENT WORKFLOW

### **Initial Setup**
```bash
# 1. Clone repository
git clone [repo-url]
cd social-catering-mvp

# 2. Install backend dependencies
bundle install

# 3. Install frontend dependencies
cd social-catering-ui
npm install
cd ..

# 4. Setup database
rails db:create
rails db:migrate
rails db:seed

# 5. Start servers
# Terminal 1: Backend
rails server

# Terminal 2: Frontend
cd social-catering-ui
npm run dev
```

### **Daily Development**
```bash
# Start backend (Terminal 1)
rails server

# Start frontend (Terminal 2)
cd social-catering-ui
npm run dev

# Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Database: postgresql://localhost:5432
```

### **Running Migrations**
```bash
# Create migration
rails g migration MigrationName

# Edit migration file
# db/migrate/YYYYMMDDHHMMSS_migration_name.rb

# Run migration
rails db:migrate

# Rollback if needed
rails db:rollback

# Check status
rails db:migrate:status
```

### **Database Operations**
```bash
# Reset database (WARNING: Deletes all data)
rails db:reset

# Seed database
rails db:seed

# Drop, create, migrate, seed
rails db:drop db:create db:migrate db:seed

# Enter database console
rails dbconsole
# or
psql social_catering_development
```

### **Rails Console**
```bash
# Start console
rails console

# Common commands
User.count
Worker.all
Event.draft.count
Assignment.where(status: 'completed').count

# Exit
exit
```

---

## 🧪 TESTING SETUP

### **Backend Testing (RSpec)**
```ruby
# Gemfile (test group)
group :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'shoulda-matchers'
  gem 'database_cleaner-active_record'
end
```

**Test Structure:**
```
spec/
├── models/
│   ├── user_spec.rb
│   ├── worker_spec.rb
│   ├── event_spec.rb
│   └── assignment_spec.rb
├── controllers/
│   └── api/v1/
│       ├── events_controller_spec.rb
│       └── workers_controller_spec.rb
├── services/
│   └── assign_worker_to_shift_spec.rb
└── factories/
    ├── users.rb
    ├── workers.rb
    ├── events.rb
    └── assignments.rb
```

**Running Tests:**
```bash
# Install RSpec
rails generate rspec:install

# Run all tests
bundle exec rspec

# Run specific file
bundle exec rspec spec/models/event_spec.rb

# Run with coverage
COVERAGE=true bundle exec rspec
```

---

### **Frontend Testing (Jest + React Testing Library)**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "vitest": "^1.0.0"
  }
}
```

**Test Structure:**
```
src/
├── pages/
│   ├── EventsPage.tsx
│   └── EventsPage.test.tsx
├── components/
│   ├── LoadingSpinner.tsx
│   └── LoadingSpinner.test.tsx
└── lib/
    ├── api.ts
    └── api.test.ts
```

**Running Tests:**
```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

---

## 🏗️ BUILD & DEPLOYMENT

### **Frontend Build**
```bash
# Development build
cd social-catering-ui
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Build Output:**
```
social-catering-ui/dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
└── index.html
```

**Deploy to Rails Public:**
```bash
# After building frontend
cp -r social-catering-ui/dist/* public/

# Rails will serve from public/ in production
```

---

### **Heroku Deployment**

#### **Procfile**
```
web: bundle exec puma -C config/puma.rb
release: bundle exec rails db:migrate
```

#### **Deploy Script**
```bash
#!/bin/bash
# deploy.sh

# Build frontend
cd social-catering-ui
npm run build
cd ..

# Copy to public
rm -rf public/assets public/index.html
cp -r social-catering-ui/dist/* public/

# Commit built files
git add public/
git commit -m "Build frontend for deployment"

# Deploy to Heroku
git push heroku main

# Run migrations
heroku run rails db:migrate -a sc-mvp-staging

# Check logs
heroku logs --tail -a sc-mvp-staging
```

#### **First-Time Heroku Setup**
```bash
# 1. Create app
heroku create sc-mvp-staging --region us

# 2. Add PostgreSQL
heroku addons:create heroku-postgresql:mini -a sc-mvp-staging

# 3. Set environment variables
heroku config:set RAILS_ENV=production -a sc-mvp-staging
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key) -a sc-mvp-staging
heroku config:set SECRET_KEY_BASE=$(rails secret) -a sc-mvp-staging
heroku config:set FRONTEND_URL=https://sc-mvp-staging.herokuapp.com -a sc-mvp-staging

# 4. Deploy
git push heroku main

# 5. Seed database
heroku run rails db:seed -a sc-mvp-staging

# 6. Open app
heroku open -a sc-mvp-staging
```

---

## 🔒 SECURITY CONFIGURATION

### **CORS Setup**
```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('FRONTEND_URL', 'http://localhost:5173')
    
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ['Content-Disposition']
  end
end
```

### **Content Security Policy**
```ruby
# config/initializers/content_security_policy.rb
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https
    policy.style_src   :self, :https, :unsafe_inline
  end
end
```

### **Rate Limiting (Rack::Attack)**
```ruby
# Gemfile
gem 'rack-attack'

# config/initializers/rack_attack.rb
class Rack::Attack
  # Throttle login attempts
  throttle('logins/email', limit: 5, period: 60.seconds) do |req|
    if req.path == '/api/v1/sessions/login' && req.post?
      req.params['email'].to_s.downcase.presence
    end
  end
  
  # Throttle API requests
  throttle('api/ip', limit: 300, period: 5.minutes) do |req|
    req.ip if req.path.start_with?('/api/')
  end
end
```

---

## 📊 MONITORING & LOGGING

### **Rails Logging**
```ruby
# config/environments/production.rb
config.log_level = :info
config.log_tags = [:request_id]

# Use stdout for Heroku
if ENV["RAILS_LOG_TO_STDOUT"].present?
  logger = ActiveSupport::Logger.new(STDOUT)
  logger.formatter = config.log_formatter
  config.logger = ActiveSupport::TaggedLogging.new(logger)
end
```

### **Heroku Logging**
```bash
# View logs
heroku logs --tail -a sc-mvp-staging

# View specific dyno logs
heroku logs --dyno web.1 -a sc-mvp-staging

# View last 200 lines
heroku logs -n 200 -a sc-mvp-staging

# Filter by severity
heroku logs --tail -a sc-mvp-staging | grep ERROR
```

### **Error Tracking (Future - Sentry)**
```ruby
# Gemfile
gem "sentry-ruby"
gem "sentry-rails"

# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
  config.traces_sample_rate = 0.1
end
```

---

## 🔄 GIT WORKFLOW

### **Branch Strategy**
```
main (production)
  └── staging (pre-production)
      └── feature/* (new features)
      └── bugfix/* (bug fixes)
      └── hotfix/* (urgent fixes)
```

### **Commit Convention**
```bash
# Format: type(scope): message

# Types:
feat(events): add bulk worker scheduling
fix(reports): correct CSV header format
docs(readme): update setup instructions
style(ui): improve mobile responsiveness
refactor(api): consolidate event endpoints
test(workers): add worker creation specs
chore(deps): update Rails to 7.2.1
```

### **Pull Request Template**
```markdown
## Description
[Describe what this PR does]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Automated tests added/updated
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

---

## 📦 DEPENDENCY MANAGEMENT

### **Backend (Bundler)**
```bash
# Update all gems
bundle update

# Update specific gem
bundle update rails

# Check for outdated gems
bundle outdated

# Audit for security vulnerabilities
bundle audit
```

### **Frontend (npm)**
```bash
# Update all packages
npm update

# Update specific package
npm update react

# Check for outdated packages
npm outdated

# Audit for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## 🎯 CODE STYLE GUIDES

### **Ruby Style Guide**
```ruby
# Use 2-space indentation
def method_name
  # code here
end

# Use snake_case for variables and methods
user_name = "John"
def calculate_total_hours
end

# Use CamelCase for classes
class EventController < ApplicationController
end

# Use descriptive names
# Bad
def calc
end

# Good
def calculate_total_hours
end

# Use ! for mutating methods
def save!
  # raises exception on error
end

# Use ? for boolean methods
def active?
  status == 'active'
end

# Use guard clauses
def process_order(order)
  return if order.nil?
  return unless order.valid?
  
  # process order
end
```

### **TypeScript Style Guide**
```typescript
// Use 2-space indentation
function processData() {
  // code here
}

// Use camelCase for variables and functions
const userName = "John";
function calculateTotalHours() {}

// Use PascalCase for components and types
interface WorkerProps {
  worker: Worker;
}

function WorkerCard({ worker }: WorkerProps) {
  return ...;
}

// Use descriptive names
// Bad
const fn = () => {};

// Good
const handleSubmit = () => {};

// Use optional chaining
worker?.skills_json?.includes('Bartender')

// Use nullish coalescing
const hours = assignment.hours_worked ?? 0

// Prefer const over let
const apiUrl = import.meta.env.VITE_API_URL;

// Use arrow functions for callbacks
events.map(event => event.title)
```

---

## 🗂️ FILE NAMING CONVENTIONS

### **Backend (Rails)**
```
Models:        snake_case (user.rb, event_schedule.rb)
Controllers:   snake_case with controller suffix (events_controller.rb)
Services:      snake_case (assign_worker_to_shift.rb)
Migrations:    YYYYMMDDHHMMSS_descriptive_name.rb
```

### **Frontend (React)**
```
Components:    PascalCase.tsx (EventsPage.tsx, LoadingSpinner.tsx)
Utilities:     camelCase.ts (api.ts, formatDate.ts)
Contexts:      PascalCase.tsx (AuthContext.tsx)
Types:         types.ts or types/index.ts
```

---

## 🔧 TROUBLESHOOTING GUIDE

### **Common Development Issues**

#### **1. Database Connection Error**
```bash
# Symptom
PG::ConnectionBad: could not connect to server

# Solution
# Check PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Verify connection
psql -U postgres -d social_catering_development
```

#### **2. Port Already in Use**
```bash
# Symptom
Address already in use - bind(2) for "127.0.0.1" port 3000

# Solution - Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
rails server -p 3001
```

#### **3. Frontend Can't Connect to Backend**
```typescript
// Symptom
Network Error / CORS Error

// Solution 1 - Check API URL
console.log(import.meta.env.VITE_API_URL);

// Solution 2 - Check CORS config
// config/initializers/cors.rb
origins ENV.fetch('FRONTEND_URL', 'http://localhost:5173')

// Solution 3 - Check backend is running
curl http://localhost:3000/healthz
```

#### **4. Migrations Pending**
```bash
# Symptom
Migrations are pending. Run 'rails db:migrate'

# Solution
rails db:migrate

# If migration fails, rollback
rails db:rollback

# Check migration status
rails db:migrate:status
```

#### **5. Devise/Authentication Issues**
```bash
# Symptom
Devise.secret_key was not set

# Solution
# Generate new secret key
rails credentials:edit
# Add devise_secret_key

# Or regenerate credentials
rm config/credentials.yml.enc
rm config/master.key
rails credentials:edit
```

---

## 🎨 UI/UX PATTERNS

### **Color Palette**
```css
/* Primary (Teal) */
--teal-50:  #f0fdfa
--teal-100: #ccfbf1
--teal-500: #14b8a6  /* Primary action color */
--teal-600: #0d9488  /* Hover state */
--teal-700: #0f766e

/* Accent (Purple) */
--purple-600: #9333ea
--purple-700: #7e22ce

/* Semantic Colors */
--success: #10b981  /* Green */
--warning: #f59e0b  /* Yellow */
--error:   #ef4444  /* Red */
--info:    #3b82f6  /* Blue */

/* Neutrals */
--gray-50:  #f9fafb
--gray-100: #f3f4f6
--gray-500: #6b7280
--gray-900: #111827
```

### **Button Styles**
```typescript
// Primary Button

  Primary Action


// Secondary Button

  Secondary Action


// Danger Button

  Delete


// Ghost Button

  Cancel

```

### **Form Inputs**
```typescript
// Text Input


// Select Dropdown

  Option 1
  Option 2

```

### **Status Badges**
```typescript
// Active/Success

  
  Active


// Warning/Partial

  
  Partial


// Error/Needs Attention

  
  Needs Workers


// Inactive/Neutral

  
  Inactive

```

### **Loading States**
```typescript
// Spinner Component
export function LoadingSpinner() {
  return (
    
      
    
  );
}

// Button Loading State

  {loading ? (
    <>
      
      Loading...
    </>
  ) : (
    'Submit'
  )}

```

### **Empty States**
```typescript
// Empty State Component
export function EmptyState({ icon, title, description, action }) {
  return (
    
      {icon}
      {title}
      {description}
      {action}
    
  );
}
```

---

## 📚 USEFUL COMMANDS REFERENCE

### **Rails Commands**
```bash
# Server
rails server               # Start server
rails server -p 3001      # Start on different port

# Database
rails db:create           # Create database
rails db:migrate          # Run migrations
rails db:rollback         # Rollback last migration
rails db:seed             # Seed database
rails db:reset            # Drop, create, migrate, seed

# Console
rails console             # Start console
rails dbconsole          # Start database console

# Routes
rails routes              # Show all routes
rails routes | grep events # Filter routes

# Generators
rails g model User        # Generate model
rails g controller Api::V1::Events # Generate controller
rails g migration AddFieldToTable # Generate migration

# Testing
bundle exec rspec         # Run tests
```

### **npm Commands**
```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix issues

# Dependencies
npm install              # Install dependencies
npm install package-name # Add new package
npm update               # Update all packages
npm audit                # Security audit
```

### **Git Commands**
```bash
# Basic
git status               # Check status
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push                 # Push to remote

# Branching
git checkout -b feature/name # Create new branch
git checkout main        # Switch to main
git merge feature/name   # Merge branch

# Cleanup
git branch -d feature/name # Delete local branch
git push origin --delete feature/name # Delete remote branch

# Stashing
git stash                # Stash changes
git stash pop            # Apply stashed changes
```

### **Heroku Commands**
```bash
# App Management
heroku create app-name   # Create app
heroku apps:info         # App info
heroku ps                # Process status
heroku restart           # Restart app

# Deployment
git push heroku main     # Deploy

# Database
heroku pg:info           # Database info
heroku pg:psql           # Connect to database
heroku run rails db:migrate # Run migrations
heroku run rails db:seed # Seed database

# Logs
heroku logs --tail       # Stream logs
heroku logs -n 200       # Last 200 lines

# Console
heroku run rails console # Rails console

# Config
heroku config            # View all config vars
heroku config:set KEY=value # Set config var
heroku config:unset KEY  # Remove config var
```

---

## 🎓 LEARNING RESOURCES

### **Official Documentation**
- **Rails:** https://guides.rubyonrails.org/
- **React:** https://react.dev/
- **TypeScript:** https://www.typescriptlang.org/docs/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vite:** https://vitejs.dev/guide/

### **Recommended Reading**
- Rails API-only Applications: https://guides.rubyonrails.org/api_app.html
- Active Record Querying: https://guides.rubyonrails.org/active_record_querying.html
- React Hooks: https://react.dev/reference/react
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html

---

## 🆘 SUPPORT CONTACTS

### **Internal Team**
- **Tech Lead:** [Name]
- **Product Owner:** [Name]
- **DevOps:** [Name]

### **External Resources**
- **Heroku Support:** https://help.heroku.com/
- **GitHub Issues:** [Repository URL]/issues
- **Stack Overflow:** Tag questions with `ruby-on-rails` and `reactjs`

---

## 📝 CHANGELOG

### **v1.0.0 - MVP Launch** (Target: TBD)
- Initial release
- Event management (CRUD)
- Worker management (CRUD)
- Bulk worker scheduling
- CSV timesheet/payroll exports
- Dashboard with calendar
- Deployed to Heroku staging

---

**END OF PROJECT CONFIGURATION**