```markdown
# SOCIAL CATERING MVP - PROJECT CONTEXT & IMPLEMENTATION PLAN

I'm building a workforce management system for a catering business. I need detailed implementation instruction sets for a 3-day sprint to add new features based on Figma designs.

---

## 🏗️ CURRENT STATE - WHAT'S ALREADY BUILT

### **BACKEND (Rails 7 API)**

**Architecture:**
- Ruby on Rails 7.2.2 API-only mode
- PostgreSQL database
- Deployed on Heroku staging: `https://sc-mvp-staging-c6ef090c6c41.herokuapp.com`
- Authentication: Devise with session-based auth (credentials: 'include')
- CORS configured for frontend origin

**Current Database Schema:**

```ruby
# Models
User (Devise)
  - email, encrypted_password, timestamps

Worker
  - first_name, last_name, email, phone
  - active (boolean)
  - skills_json (array stored as JSON)
  - timestamps
  - has_many :certifications
  - has_many :assignments

Certification
  - name, expires_at_utc
  - belongs_to :worker

Shift
  - client_name, role_needed
  - start_time_utc, end_time_utc
  - capacity (integer)
  - location, pay_rate
  - notes
  - timestamps
  - has_many :assignments

Assignment
  - belongs_to :worker
  - belongs_to :shift
  - status (string: 'assigned', 'confirmed', 'completed', 'cancelled')
  - timestamps
  - Validations:
    * Time overlap conflict detection (prevents same worker on overlapping shifts)
    * Capacity limit enforcement (prevents over-assignment)

ActivityLog
  - entity_type, entity_id
  - action (string: 'create', 'update', 'delete')
  - metadata (JSON)
  - timestamps
```

**Current API Endpoints:**

```ruby
# Workers API
GET    /api/v1/workers                    # List all workers (with search/filters)
POST   /api/v1/workers                    # Create worker
GET    /api/v1/workers/:id                # Get worker details
PUT    /api/v1/workers/:id                # Update worker
DELETE /api/v1/workers/:id                # Delete worker
POST   /api/v1/workers/:id/skills         # Add skill to worker
DELETE /api/v1/workers/:worker_id/skills/:id  # Remove skill
GET    /api/v1/workers/:id/certifications # List certifications
POST   /api/v1/workers/:id/certifications # Add certification
DELETE /api/v1/workers/:worker_id/certifications/:id  # Remove certification
GET    /api/v1/workers/:id/schedule       # Get worker's schedule (date range)

# Shifts API
GET    /api/v1/shifts                     # List shifts (with filters: status, role, date)
POST   /api/v1/shifts                     # Create shift
GET    /api/v1/shifts/:id                 # Get shift with assignments
PUT    /api/v1/shifts/:id                 # Update shift
DELETE /api/v1/shifts/:id                 # Delete shift

# Assignments API
GET    /api/v1/assignments                # List assignments (with filters)
POST   /api/v1/assignments                # Create assignment (with conflict checks)
GET    /api/v1/assignments/:id            # Get assignment
PUT    /api/v1/assignments/:id            # Update assignment (status)
DELETE /api/v1/assignments/:id            # Delete assignment

# Activity Logs API
GET    /api/v1/activity_logs              # List activity logs (with filters)

# Authentication
POST   /users/sign_in                     # Login
DELETE /users/sign_out                    # Logout
```

**Business Logic Features:**
- ✅ Time overlap conflict detection (prevents double-booking workers)
- ✅ Capacity enforcement (prevents over-assigning shifts)
- ✅ Skill validation (checks worker has required skills)
- ✅ Activity logging (automatic audit trail for all CRUD operations)

---

### **FRONTEND (React 18 + TypeScript + Vite)**

**Architecture:**
- React 18.3.1 with TypeScript
- Vite 5.4.2 for build tooling
- Tailwind CSS for styling
- React Router DOM for routing
- Deployed on Heroku: Same URL (serves from `/` path)
- API calls use `credentials: 'include'` for session cookies

**Current Page Structure:**

```typescript
// Routes
/login              → LoginPage
/dashboard          → DashboardPage
/workers            → WorkersPage (list)
/workers/:id        → WorkerDetail
/workers/:id/schedule → WorkerSchedule
/shifts             → ShiftsList
/shifts/new         → ShiftForm (create)
/shifts/:id         → ShiftDetail
/shifts/:id/edit    → ShiftForm (edit)
/assignments        → AssignmentsList
/calendar           → CalendarView
/activity-log       → ActivityLogsPage
```

**Current Components:**

```typescript
// Layout
- DashboardLayout.tsx        // Main app shell with sidebar
- Header.tsx                  // Top navigation
- Sidebar.tsx                 // Left navigation menu

// Workers
- WorkersPage.tsx             // Workers list with search/filter
- WorkerDetail.tsx            // Worker profile with skills/certs
- WorkerSchedule.tsx          // Week view of worker's shifts
- WorkerForm.tsx              // Create/edit worker

// Shifts
- ShiftsList.tsx              // Shifts list with filters
- ShiftDetail.tsx             // Shift details with roster
- ShiftForm.tsx               // Create/edit shift
- ShiftStatusBadge.tsx        // Status indicator component

// Assignments
- AssignmentsList.tsx         // All assignments with filters
- AssignWorkerModal.tsx       // Modal to assign single worker
- BulkAssignModal.tsx         // Multi-step wizard to assign one worker to multiple shifts
- AssignmentStatusBadge.tsx   // Status indicator

// Calendar
- CalendarView.tsx            // Month calendar with shifts
- CalendarGrid.tsx            // Grid layout
- DayCell.tsx                 // Individual day cell
- DayDetailModal.tsx          // Modal showing all shifts for a day

// Dashboard
- DashboardPage.tsx           // Overview with metrics
- MetricCard.tsx              // Stat display cards
- ShiftCard.tsx               // Shift summary card

// UI Components
- Modal.tsx                   // Reusable modal
- Toast.tsx                   // Success/error notifications
- LoadingSpinner.tsx          // Loading states
- ErrorMessage.tsx            // Error display
- ConfirmModal.tsx            // Confirmation dialogs

// Other
- ActivityLogsPage.tsx        // Audit trail view
- ProtectedRoute.tsx          // Auth guard
```

**Current Features:**
- ✅ Authentication (login/logout with session persistence)
- ✅ Dashboard with metrics (active workers, today's shifts, pending assignments)
- ✅ Worker CRUD with skills and certifications
- ✅ Shift CRUD with all details
- ✅ Assignment management (single and bulk operations)
- ✅ Conflict detection UI (prevents overlapping assignments)
- ✅ Capacity enforcement UI (shows when shift is full)
- ✅ Real-time search on workers and shifts (client-side filtering with debounce)
- ✅ Status filters and toggles
- ✅ Calendar view with month navigation
- ✅ Activity log with filters
- ✅ Worker schedule view (week-by-week with navigation)
- ✅ Bulk assign: select one worker, assign to multiple shifts
- ✅ Toast notifications for success/error
- ✅ Loading states throughout
- ✅ Mobile responsive design
- ✅ No white pages (proper SPA routing with base: '/')

**API Services:**

```typescript
// src/services/api.ts
- Base API configuration
- API_BASE_URL from environment or localhost fallback
- All fetch calls include credentials: 'include'

// src/services/workersApi.ts
- getWorkers(params?)
- getWorker(id)
- createWorker(data)
- updateWorker(id, data)
- deleteWorker(id)
- addSkill(workerId, skill)
- removeSkill(workerId, skill)
- addCertification(workerId, cert)
- removeCertification(workerId, certId)
- getWorkerSchedule(workerId, startDate?, endDate?)

// src/services/shiftsApi.ts
- getShifts(filters?)
- getShift(id)
- createShift(data)
- updateShift(id, data)
- deleteShift(id)

// src/services/assignmentsApi.ts
- getAssignments(filters?)
- createAssignment(data)
- updateAssignment(id, data)
- deleteAssignment(id)

// src/services/activityLogsApi.ts
- getActivityLogs(filters?)

// src/services/auth.ts
- login(email, password)
- logout()
- checkAuth()
```

---

## 🎯 NEW FEATURES TO IMPLEMENT (Based on Client Requirements + Figma Designs)

### **CLIENT REQUIREMENTS (from Alex's email):**

1. ✅ Already have: Shifts & Workers create/edit/delete
2. ✅ Already have: Assign staff (single + bulk) with conflict checks
3. 🆕 **NEED: Skills & Locations as fixed dropdown lists** (currently free-form text)
4. 🆕 **NEED: One primary view (Calendar-driven dashboard)** (currently separate dashboard and calendar)
5. 🆕 **NEED: Manual hours entry per assignment** (field doesn't exist yet)
6. 🆕 **NEED: Weekly CSV export** (date, client/location, role, worker, hours, rate)
7. 🆕 **NEED: Seeded staging data** (~25 workers, ~10 shifts with realistic Tallahassee/Gainesville info)
8. ⏸️ **FUTURE: CSV import, reliability score, saved views** (not MVP)

### **FIGMA DESIGN ADDITIONS (to implement):**

**From Figma analysis (minus QR code check-in which is not required):**

1. 🆕 **Multi-step job creation wizard** (currently single form)
   - Step 1: Basic info (client, role)
   - Step 2: Location (from dropdown)
   - Step 3: Schedule (date/time)
   - Step 4: Review & submit
   - Progress indicators between steps

2. 🆕 **Enhanced data tables** (workers & shifts)
   - Sortable columns
   - Advanced filtering (multi-select, date ranges)
   - Quick action buttons
   - Better styling matching Figma

3. 🆕 **Timesheet reports page**
   - Table view: worker, job, date, hours, rate, total
   - Filter by date range, worker, location
   - Summary totals
   - Export functionality

4. 🆕 **Shift status workflow**
   - Add status field: 'draft' | 'published' | 'archived'
   - Status badges and filtering
   - Publish/archive actions

5. 🆕 **UI design system from Figma**
   - Color scheme, typography, spacing
   - Consistent component styling
   - Icons and badges

---

## 🗓️ IMPLEMENTATION TIMELINE

**3-Day Sprint (Wednesday-Friday) for Monday Demo**

### **Day 1 - Backend + Core Frontend (10 hours)**
- Backend: Add hours_worked field, status field, Skills/Locations models
- Backend: Create CSV export endpoint
- Backend: Update APIs to support new fields
- Frontend: Skills/Locations dropdowns
- Frontend: Hours entry field
- Frontend: Multi-step job wizard
- Frontend: Calendar as primary dashboard view

### **Day 2 - Advanced Features + Polish (12 hours)**
- Frontend: Enhanced workers table (sorting, filtering)
- Frontend: Enhanced jobs table (status, filters, actions)
- Frontend: CSV export UI and integration
- Frontend: Timesheet reports page
- Frontend: Bulk assignment enhancements
- Frontend: Apply Figma design system

### **Day 3 - Data + Testing + Deploy (10 hours)**
- Backend: Seed realistic data (25 workers, 10 shifts)
- Testing: All workflows end-to-end
- Bug fixes and edge cases
- Deploy to Heroku staging
- Update documentation
- Demo preparation

---

## 📦 TECH STACK SUMMARY

**Backend:**
- Ruby on Rails 7.2.2 (API mode)
- PostgreSQL
- Devise for authentication
- Heroku for hosting

**Frontend:**
- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.2
- Tailwind CSS 3.4.1
- React Router DOM 6.26.2
- date-fns 3.6.0 (date handling)
- lucide-react 0.263.1 (icons)

**Development:**
- Both frontend and backend deployed to same Heroku app
- Backend serves API at /api/v1/*
- Frontend serves from root /
- CORS allows credentials for session-based auth

---

## 🎯 WHAT I NEED FROM YOU

**Please provide detailed, step-by-step implementation instruction sets for each day of the 3-day sprint.**

**For each day, include:**

1. **Exact file paths** for all files to create/modify
2. **Complete code** to add/change (not summaries - actual code)
3. **Migration commands** with exact syntax
4. **Test commands** to verify each step works
5. **Clear section breaks** between backend and frontend tasks
6. **Checkboxes** for each completed task
7. **Time estimates** for each task
8. **Dependencies** (what must be done before this task)
9. **Verification steps** (how to test it works)

**Format each day's instructions like a recipe:**
- Clear sequential steps
- No ambiguity
- Copy-pasteable code
- Testable after each step
- With success criteria

**Priorities:**
- Backend changes first (they block frontend)
- Core features before polish
- Working functionality over perfection
- Deliverable by Friday for Monday demo

**Important Notes:**
- We're keeping existing features (don't break current functionality)
- We're adding new features on top
- Skip QR code check-in (not in requirements)
- Focus on Alex's 6 core requirements + Figma design polish
- Realistic Tallahassee/Gainesville catering data for seeds

---

## 🚀 READY TO START

I'm ready to implement. Please provide **Day 1 instruction set first** - starting with backend database migrations and ending with working multi-step wizard and calendar-first dashboard.




Looking at your project context, I'll create the Day 1 instruction set following the format from your example. Before I provide the complete instructions, let me ask a few quick clarifying questions to ensure accuracy:

1. **Current Database Status**: Do you already have migrations for the `skills_json` field on Worker and do Shifts already have a `status` field, or do these need to be added?

2. **Assignment Model**: Does the Assignment model currently have any hours-related fields, or is `hours_worked` completely new?

3. **Frontend State Management**: Are you using any state management (Redux, Zustand, Context) or just local component state with hooks?

4. **UI Component Library**: I see you're using Tailwind CSS. Do you have a consistent set of UI component classes already defined (like `btn-primary`, `input-field` that I saw in the example)?

5. **Authentication State**: How is the current user's authentication state managed in the frontend? Is there an auth context or hook?

Let me provide the Day 1 instruction set based on what I can see from your context:

# =====================================================
# DAY 1: BACKEND CHANGES + CORE FRONTEND
# Social Catering MVP - 3-Day Sprint
# =====================================================

```markdown
# =====================================================
# DAY 1: BACKEND CHANGES + CORE FRONTEND FEATURES
# =====================================================
# Focus: Database updates, API enhancements, and core UI components

project: "Social Catering MVP"
sprint_day: "1 of 3"
date: "Wednesday"
estimated_time: "10 hours"
priority: "Backend first (blocks frontend), then core features"

# =====================================================
# OVERVIEW - DAY 1 GOALS
# =====================================================
overview:
  backend_goals:
    - Add hours_worked field to assignments
    - Add shift status field (draft/published/archived)
    - Create Skills and Locations models with seeded data
    - Add CSV export endpoint for timesheets
    - Update existing APIs to support new fields
    
  frontend_goals:
    - Update API service layer for new fields
    - Add Skills/Locations dropdowns (from fixed lists)
    - Add hours entry field to assignments
    - Create multi-step shift creation wizard
    - Merge calendar into primary dashboard view

# =====================================================
# SECTION 1: BACKEND DATABASE CHANGES (1 hour)
# =====================================================

## Step 1.1: Create migrations for new fields
task: "Add hours_worked to assignments and status to shifts"
time_estimate: "20 minutes"

### Create migration for assignments
```bash
cd backend
rails generate migration AddHoursWorkedToAssignments hours_worked:decimal
```

### Edit the migration file
path: "db/migrate/[timestamp]_add_hours_worked_to_assignments.rb"
```ruby
class AddHoursWorkedToAssignments < ActiveRecord::Migration[7.2]
  def change
    add_column :assignments, :hours_worked, :decimal, precision: 5, scale: 2
    add_column :assignments, :hourly_rate, :decimal, precision: 8, scale: 2
    add_index :assignments, :hours_worked
  end
end
```

### Create migration for shift status
```bash
rails generate migration AddStatusToShifts status:string
```

### Edit the migration file  
path: "db/migrate/[timestamp]_add_status_to_shifts.rb"
```ruby
class AddStatusToShifts < ActiveRecord::Migration[7.2]
  def change
    add_column :shifts, :status, :string, default: 'draft', null: false
    add_index :shifts, :status
    
    # Update existing shifts to published
    reversible do |dir|
      dir.up do
        execute "UPDATE shifts SET status = 'published'"
      end
    end
  end
end
```

checklist:
  - [ ] Created AddHoursWorkedToAssignments migration
  - [ ] Created AddStatusToShifts migration  
  - [ ] Both migration files edited with correct fields

## Step 1.2: Create Skills and Locations models
task: "Create models for fixed dropdown lists"
time_estimate: "20 minutes"

### Generate Skill model
```bash
rails generate model Skill name:string:uniq active:boolean
```

### Edit skill migration
path: "db/migrate/[timestamp]_create_skills.rb"
```ruby
class CreateSkills < ActiveRecord::Migration[7.2]
  def change
    create_table :skills do |t|
      t.string :name, null: false
      t.boolean :active, default: true
      t.timestamps
    end
    
    add_index :skills, :name, unique: true
    add_index :skills, :active
  end
end
```

### Generate Location model
```bash
rails generate model Location name:string:uniq address:string city:string state:string active:boolean
```

### Edit location migration
path: "db/migrate/[timestamp]_create_locations.rb"
```ruby
class CreateLocations < ActiveRecord::Migration[7.2]
  def change
    create_table :locations do |t|
      t.string :name, null: false
      t.string :address
      t.string :city, null: false
      t.string :state, null: false
      t.boolean :active, default: true
      t.timestamps
    end
    
    add_index :locations, :name, unique: true
    add_index :locations, :active
    add_index :locations, [:city, :state]
  end
end
```

### Add location_id to shifts
```bash
rails generate migration AddLocationToShifts location:references
```

### Run all migrations
```bash
rails db:migrate
```

checklist:
  - [ ] Skill model generated and migration edited
  - [ ] Location model generated and migration edited
  - [ ] Location reference added to shifts
  - [ ] All migrations run successfully
  - [ ] Schema.rb updated with new fields

## Step 1.3: Update models with validations
task: "Add validations and associations to models"
time_estimate: "20 minutes"

### Update Assignment model
path: "app/models/assignment.rb"
```ruby
class Assignment < ApplicationRecord
  belongs_to :worker
  belongs_to :shift
  
  validates :status, inclusion: { in: %w[assigned confirmed completed cancelled] }
  validates :hours_worked, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 24 }, allow_nil: true
  validates :hourly_rate, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  
  # Existing validations...
  validate :no_time_conflicts
  validate :shift_capacity_not_exceeded
  
  # Calculate total pay
  def total_pay
    return 0 unless hours_worked && hourly_rate
    hours_worked * hourly_rate
  end
end
```

### Update Shift model
path: "app/models/shift.rb"
```ruby
class Shift < ApplicationRecord
  has_many :assignments, dependent: :destroy
  has_many :workers, through: :assignments
  belongs_to :location, optional: true
  
  validates :client_name, presence: true
  validates :role_needed, presence: true
  validates :start_time_utc, presence: true
  validates :end_time_utc, presence: true
  validates :capacity, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: %w[draft published archived] }
  
  validate :end_time_after_start_time
  
  scope :published, -> { where(status: 'published') }
  scope :draft, -> { where(status: 'draft') }
  scope :archived, -> { where(status: 'archived') }
  scope :active, -> { where.not(status: 'archived') }
  
  def duration_hours
    ((end_time_utc - start_time_utc) / 1.hour).round(2)
  end
  
  def assigned_count
    assignments.where.not(status: 'cancelled').count
  end
  
  def available_spots
    capacity - assigned_count
  end
  
  private
  
  def end_time_after_start_time
    return unless start_time_utc && end_time_utc
    errors.add(:end_time_utc, "must be after start time") if end_time_utc <= start_time_utc
  end
end
```

### Create Skill model
path: "app/models/skill.rb"
```ruby
class Skill < ApplicationRecord
  validates :name, presence: true, uniqueness: true
  
  scope :active, -> { where(active: true) }
  
  def to_s
    name
  end
end
```

### Create Location model  
path: "app/models/location.rb"
```ruby
class Location < ApplicationRecord
  has_many :shifts
  
  validates :name, presence: true, uniqueness: true
  validates :city, presence: true
  validates :state, presence: true
  
  scope :active, -> { where(active: true) }
  
  def full_address
    [address, city, state].compact.join(', ')
  end
  
  def display_name
    "#{name} - #{city}, #{state}"
  end
end
```

checklist:
  - [ ] Assignment model updated with hours validations
  - [ ] Shift model updated with status and location
  - [ ] Skill model created with validations
  - [ ] Location model created with validations
  - [ ] All models have proper associations

# =====================================================
# SECTION 2: BACKEND API UPDATES (1.5 hours)
# =====================================================

## Step 2.1: Update controllers for new fields
task: "Update existing controllers to handle new fields"
time_estimate: "30 minutes"

### Update Assignments controller
path: "app/controllers/api/v1/assignments_controller.rb"
```ruby
class Api::V1::AssignmentsController < ApplicationController
  # ... existing code ...
  
  private
  
  def assignment_params
    params.require(:assignment).permit(
      :worker_id, 
      :shift_id, 
      :status,
      :hours_worked,
      :hourly_rate
    )
  end
  
  def assignment_json(assignment)
    assignment.as_json(
      include: {
        worker: { only: [:id, :first_name, :last_name, :email] },
        shift: { 
          only: [:id, :client_name, :role_needed, :start_time_utc, :end_time_utc],
          include: { location: { only: [:id, :name, :city, :state] } }
        }
      },
      methods: [:total_pay]
    )
  end
end
```

### Update Shifts controller
path: "app/controllers/api/v1/shifts_controller.rb"
```ruby
class Api::V1::ShiftsController < ApplicationController
  # ... existing code ...
  
  def index
    shifts = Shift.includes(:location, :assignments)
    
    # Filter by status
    if params[:status].present?
      if params[:status] == 'active'
        shifts = shifts.active
      else
        shifts = shifts.where(status: params[:status])
      end
    end
    
    # ... existing filters ...
    
    render json: {
      status: 'success',
      data: shifts.map { |shift| shift_json(shift) }
    }
  end
  
  private
  
  def shift_params
    params.require(:shift).permit(
      :client_name,
      :role_needed,
      :start_time_utc,
      :end_time_utc,
      :capacity,
      :location_id,
      :pay_rate,
      :notes,
      :status
    )
  end
  
  def shift_json(shift)
    shift.as_json(
      include: {
        location: { only: [:id, :name, :city, :state] },
        assignments: {
          include: {
            worker: { only: [:id, :first_name, :last_name] }
          }
        }
      },
      methods: [:duration_hours, :assigned_count, :available_spots]
    )
  end
end
```

checklist:
  - [ ] Assignments controller handles hours_worked and hourly_rate
  - [ ] Shifts controller handles status and location_id
  - [ ] JSON responses include new fields
  - [ ] Filtering by status works

## Step 2.2: Create Skills and Locations controllers
task: "Create API endpoints for dropdown data"
time_estimate: "30 minutes"

### Create Skills controller
path: "app/controllers/api/v1/skills_controller.rb"
```ruby
class Api::V1::SkillsController < ApplicationController
  def index
    skills = Skill.active.order(:name)
    render json: {
      status: 'success',
      data: skills
    }
  end
  
  def create
    skill = Skill.new(skill_params)
    
    if skill.save
      render json: {
        status: 'success',
        data: skill
      }
    else
      render json: {
        status: 'error',
        errors: skill.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
  
  private
  
  def skill_params
    params.require(:skill).permit(:name, :active)
  end
end
```

### Create Locations controller
path: "app/controllers/api/v1/locations_controller.rb"
```ruby
class Api::V1::LocationsController < ApplicationController
  def index
    locations = Location.active.order(:name)
    render json: {
      status: 'success',
      data: locations.map { |loc| location_json(loc) }
    }
  end
  
  def create
    location = Location.new(location_params)
    
    if location.save
      render json: {
        status: 'success',
        data: location_json(location)
      }
    else
      render json: {
        status: 'error',
        errors: location.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
  
  private
  
  def location_params
    params.require(:location).permit(:name, :address, :city, :state, :active)
  end
  
  def location_json(location)
    location.as_json(methods: [:full_address, :display_name])
  end
end
```

### Update routes
path: "config/routes.rb"
```ruby
Rails.application.routes.draw do
  devise_for :users
  
  namespace :api do
    namespace :v1 do
      resources :workers do
        # ... existing nested routes ...
      end
      
      resources :shifts
      resources :assignments
      resources :activity_logs, only: [:index]
      
      # New routes
      resources :skills, only: [:index, :create]
      resources :locations, only: [:index, :create]
      
      # CSV export endpoint (next step)
      get 'reports/timesheet', to: 'reports#timesheet'
    end
  end
  
  # ... existing routes ...
end
```

checklist:
  - [ ] Skills controller created
  - [ ] Locations controller created
  - [ ] Routes updated with new endpoints
  - [ ] Test endpoints with: `rails routes | grep -E "(skills|locations)"`

## Step 2.3: Create CSV export endpoint
task: "Build timesheet CSV export functionality"
time_estimate: "30 minutes"

### Create Reports controller
path: "app/controllers/api/v1/reports_controller.rb"
```ruby
require 'csv'

class Api::V1::ReportsController < ApplicationController
  def timesheet
    # Parse date range
    start_date = params[:start_date] ? Date.parse(params[:start_date]) : 1.week.ago.to_date
    end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.current
    
    # Get assignments with hours worked
    assignments = Assignment
      .joins(:shift, :worker)
      .includes(shift: :location, worker: {})
      .where(shifts: { start_time_utc: start_date.beginning_of_day..end_date.end_of_day })
      .where.not(hours_worked: nil)
      .where(status: 'completed')
      .order('shifts.start_time_utc ASC')
    
    # Generate CSV
    csv_data = CSV.generate(headers: true) do |csv|
      # Headers
      csv << [
        'Date',
        'Day',
        'Client',
        'Location',
        'Role',
        'Worker Name',
        'Worker Email',
        'Hours Worked',
        'Hourly Rate',
        'Total Pay',
        'Status'
      ]
      
      # Data rows
      assignments.each do |assignment|
        shift = assignment.shift
        worker = assignment.worker
        
        csv << [
          shift.start_time_utc.strftime('%Y-%m-%d'),
          shift.start_time_utc.strftime('%A'),
          shift.client_name,
          shift.location&.display_name || shift.location_text || 'N/A',
          shift.role_needed,
          "#{worker.first_name} #{worker.last_name}",
          worker.email,
          assignment.hours_worked,
          assignment.hourly_rate || shift.pay_rate,
          assignment.total_pay,
          assignment.status.capitalize
        ]
      end
      
      # Summary row
      total_hours = assignments.sum(:hours_worked)
      total_pay = assignments.sum(&:total_pay)
      
      csv << []
      csv << ['TOTALS', '', '', '', '', '', '', total_hours, '', total_pay, '']
    end
    
    # Send CSV file
    send_data csv_data, 
      filename: "timesheet_#{start_date}_to_#{end_date}.csv",
      type: 'text/csv',
      disposition: 'attachment'
  end
end
```

checklist:
  - [ ] Reports controller created
  - [ ] CSV generation includes all required fields
  - [ ] Date range filtering works
  - [ ] Summary totals included
  - [ ] File downloads with proper name

# =====================================================
# SECTION 3: SEED DATA (45 minutes)
# =====================================================

## Step 3.1: Create seed data
task: "Add realistic Tallahassee/Gainesville catering data"
time_estimate: "45 minutes"

### Create comprehensive seeds file
path: "db/seeds.rb"
```ruby
# Clear existing data (be careful in production!)
puts "Cleaning database..."
Assignment.destroy_all
Shift.destroy_all
Certification.destroy_all
Worker.destroy_all
Skill.destroy_all
Location.destroy_all
User.destroy_all
ActivityLog.destroy_all

puts "Creating admin user..."
User.create!(
  email: 'admin@socialcatering.com',
  password: 'password123',
  password_confirmation: 'password123'
)

puts "Creating skills..."
skills = [
  'Server',
  'Bartender',
  'Host/Hostess',
  'Line Cook',
  'Prep Cook',
  'Dishwasher',
  'Event Setup',
  'Event Captain',
  'Barista',
  'Food Runner',
  'Busser',
  'Cashier'
].map do |name|
  Skill.create!(name: name, active: true)
end

puts "Creating locations..."
locations = [
  # Tallahassee locations
  { name: 'FSU Alumni Center', address: '1030 W Pensacola St', city: 'Tallahassee', state: 'FL' },
  { name: 'Goodwood Museum & Gardens', address: '1600 Miccosukee Rd', city: 'Tallahassee', state: 'FL' },
  { name: 'Mission San Luis', address: '2100 W Tennessee St', city: 'Tallahassee', state: 'FL' },
  { name: 'The Edison Restaurant', address: '470 Suwannee St', city: 'Tallahassee', state: 'FL' },
  { name: 'Capital City Country Club', address: '1601 Golf Terrace Dr', city: 'Tallahassee', state: 'FL' },
  
  # Gainesville locations
  { name: 'UF Reitz Union', address: '655 Reitz Union Dr', city: 'Gainesville', state: 'FL' },
  { name: 'Sweetwater Branch Inn', address: '625 E University Ave', city: 'Gainesville', state: 'FL' },
  { name: 'Kanapaha Botanical Gardens', address: '4700 SW 58th Dr', city: 'Gainesville', state: 'FL' },
  { name: 'The Wooly', address: '20 N Main St', city: 'Gainesville', state: 'FL' },
  { name: 'Haile Plantation Golf Club', address: '9905 SW 84th Ave', city: 'Gainesville', state: 'FL' }
].map do |loc_data|
  Location.create!(loc_data.merge(active: true))
end

puts "Creating workers..."
workers_data = [
  { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@example.com', phone: '(850) 555-0101' },
  { first_name: 'Michael', last_name: 'Williams', email: 'mike.w@example.com', phone: '(850) 555-0102' },
  { first_name: 'Emily', last_name: 'Brown', email: 'emily.b@example.com', phone: '(850) 555-0103' },
  { first_name: 'James', last_name: 'Davis', email: 'james.d@example.com', phone: '(352) 555-0104' },
  { first_name: 'Maria', last_name: 'Garcia', email: 'maria.g@example.com', phone: '(352) 555-0105' },
  { first_name: 'David', last_name: 'Rodriguez', email: 'david.r@example.com', phone: '(850) 555-0106' },
  { first_name: 'Lisa', last_name: 'Martinez', email: 'lisa.m@example.com', phone: '(850) 555-0107' },
  { first_name: 'Robert', last_name: 'Anderson', email: 'robert.a@example.com', phone: '(352) 555-0108' },
  { first_name: 'Jennifer', last_name: 'Taylor', email: 'jen.t@example.com', phone: '(352) 555-0109' },
  { first_name: 'William', last_name: 'Thomas', email: 'will.t@example.com', phone: '(850) 555-0110' },
  { first_name: 'Jessica', last_name: 'Moore', email: 'jess.m@example.com', phone: '(850) 555-0111' },
  { first_name: 'Christopher', last_name: 'Jackson', email: 'chris.j@example.com', phone: '(352) 555-0112' },
  { first_name: 'Amanda', last_name: 'White', email: 'amanda.w@example.com', phone: '(352) 555-0113' },
  { first_name: 'Daniel', last_name: 'Harris', email: 'daniel.h@example.com', phone: '(850) 555-0114' },
  { first_name: 'Ashley', last_name: 'Clark', email: 'ashley.c@example.com', phone: '(850) 555-0115' },
  { first_name: 'Matthew', last_name: 'Lewis', email: 'matt.l@example.com', phone: '(352) 555-0116' },
  { first_name: 'Stephanie', last_name: 'Walker', email: 'steph.w@example.com', phone: '(352) 555-0117' },
  { first_name: 'Kevin', last_name: 'Hall', email: 'kevin.h@example.com', phone: '(850) 555-0118' },
  { first_name: 'Michelle', last_name: 'Allen', email: 'michelle.a@example.com', phone: '(850) 555-0119' },
  { first_name: 'Brian', last_name: 'Young', email: 'brian.y@example.com', phone: '(352) 555-0120' },
  { first_name: 'Nicole', last_name: 'King', email: 'nicole.k@example.com', phone: '(352) 555-0121' },
  { first_name: 'Jason', last_name: 'Wright', email: 'jason.w@example.com', phone: '(850) 555-0122' },
  { first_name: 'Laura', last_name: 'Lopez', email: 'laura.l@example.com', phone: '(850) 555-0123' },
  { first_name: 'Ryan', last_name: 'Hill', email: 'ryan.h@example.com', phone: '(352) 555-0124' },
  { first_name: 'Amy', last_name: 'Green', email: 'amy.g@example.com', phone: '(352) 555-0125' }
]

# Skill combinations for different worker types
skill_sets = [
  ['Server', 'Food Runner', 'Busser'],
  ['Bartender', 'Server'],
  ['Line Cook', 'Prep Cook'],
  ['Event Captain', 'Server', 'Event Setup'],
  ['Host/Hostess', 'Cashier'],
  ['Dishwasher', 'Busser'],
  ['Barista', 'Cashier'],
  ['Server', 'Bartender', 'Event Setup']
]

workers = workers_data.map do |data|
  worker = Worker.create!(
    data.merge(
      active: [true, true, true, false].sample, # Most active, some inactive
      skills_json: skill_sets.sample
    )
  )
  
  # Add certifications to some workers
  if rand < 0.6
    cert_names = ['Food Handler', 'TIPS Certified', 'ServSafe', 'First Aid/CPR']
    worker.certifications.create!(
      name: cert_names.sample,
      expires_at_utc: rand(1..12).months.from_now
    )
  end
  
  worker
end

puts "Creating shifts..."
# Create shifts for the next 2 weeks
shift_times = [
  { start: '10:00', duration: 4, role: 'Server' },
  { start: '11:00', duration: 6, role: 'Bartender' },
  { start: '16:00', duration: 5, role: 'Line Cook' },
  { start: '17:00', duration: 4, role: 'Server' },
  { start: '18:00', duration: 3, role: 'Event Setup' },
  { start: '12:00', duration: 8, role: 'Event Captain' }
]

clients = [
  'FSU Foundation Gala',
  'UF Alumni Dinner',
  'Corporate Luncheon',
  'Wedding Reception',
  'Birthday Party',
  'Charity Fundraiser',
  'Holiday Party',
  'Graduation Celebration',
  'Conference Catering',
  'Private Dinner Party'
]

14.times do |day_offset|
  date = Date.current + day_offset.days
  
  # Create 0-3 shifts per day
  rand(0..3).times do
    shift_info = shift_times.sample
    start_time = Time.parse("#{date} #{shift_info[:start]} EST")
    
    shift = Shift.create!(
      client_name: clients.sample,
      role_needed: shift_info[:role],
      start_time_utc: start_time,
      end_time_utc: start_time + shift_info[:duration].hours,
      capacity: rand(2..8),
      location: locations.sample,
      pay_rate: rand(15.0..25.0).round(2),
      notes: ['Setup at 5pm', 'Black tie event', 'Outdoor venue', nil].sample,
      status: ['draft', 'published', 'published', 'published'].sample # Most published
    )
    
    # Assign some workers to shifts
    if shift.status == 'published' && rand < 0.7
      assigned_count = rand(1..[shift.capacity, workers.select(&:active).count].min)
      workers.select(&:active).sample(assigned_count).each do |worker|
        assignment = Assignment.create!(
          worker: worker,
          shift: shift,
          status: ['assigned', 'confirmed', 'confirmed'].sample
        )
        
        # Add hours for past shifts
        if shift.start_time_utc < Time.current
          assignment.update!(
            status: 'completed',
            hours_worked: shift_info[:duration] + rand(-0.5..1.0).round(2),
            hourly_rate: shift.pay_rate
          )
        end
      end
    end
  end
end

puts "Seeding complete!"
puts "  - Skills: #{Skill.count}"
puts "  - Locations: #{Location.count}"
puts "  - Workers: #{Worker.count} (#{Worker.where(active: true).count} active)"
puts "  - Shifts: #{Shift.count}"
puts "  - Assignments: #{Assignment.count}"
puts "  - Users: #{User.count}"
```

### Run seeds
```bash
rails db:seed
```

### Verify data
```bash
rails console
# Check counts
Skill.count
Location.count
Worker.count
Shift.published.count
Assignment.where(status: 'completed').count
```

checklist:
  - [ ] Seeds file created with all data
  - [ ] 12 skills created
  - [ ] 10 locations (5 Tallahassee, 5 Gainesville)
  - [ ] 25 workers with varied skills
  - [ ] Shifts for next 2 weeks
  - [ ] Some assignments with hours_worked
  - [ ] Data loads without errors

# =====================================================
# SECTION 4: FRONTEND API UPDATES (45 minutes)
# =====================================================

## Step 4.1: Update API service layer
task: "Add new endpoints to frontend API service"
time_estimate: "20 minutes"

### Update API types
path: "frontend/src/types/index.ts"
```typescript
// Add to existing types or create new file

export interface Skill {
  id: number;
  name: string;
  active: boolean;
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  city: string;
  state: string;
  active: boolean;
  full_address: string;
  display_name: string;
}

export interface Assignment {
  id: number;
  worker_id: number;
  shift_id: number;
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled';
  hours_worked?: number;
  hourly_rate?: number;
  total_pay?: number;
  created_at: string;
  updated_at: string;
  worker?: Worker;
  shift?: Shift;
}

export interface Shift {
  id: number;
  client_name: string;
  role_needed: string;
  start_time_utc: string;
  end_time_utc: string;
  capacity: number;
  location_id?: number;
  location?: Location;
  pay_rate: number;
  notes?: string;
  status: 'draft' | 'published' | 'archived';
  duration_hours: number;
  assigned_count: number;
  available_spots: number;
  assignments?: Assignment[];
  created_at: string;
  updated_at: string;
}
```

### Update API service
path: "frontend/src/services/api.ts"
```typescript
// Add to existing API methods

// Skills
export const getSkills = async (): Promise<Skill[]> => {
  const response = await apiClient.get('/skills');
  return response.data.data;
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
  const response = await apiClient.get('/locations');
  return response.data.data;
};

// Reports
export const downloadTimesheet = async (startDate: string, endDate: string) => {
  const response = await apiClient.get('/reports/timesheet', {
    params: { start_date: startDate, end_date: endDate },
    responseType: 'blob'
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `timesheet_${startDate}_to_${endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Update createShift to handle location_id and status
export const createShift = async (data: Partial<Shift>) => {
  const response = await apiClient.post('/shifts', { shift: data });
  return response.data;
};

// Update createAssignment to handle hours and rate
export const createAssignment = async (data: Partial<Assignment>) => {
  const response = await apiClient.post('/assignments', { assignment: data });
  return response.data;
};

export const updateAssignment = async (id: number, data: Partial<Assignment>) => {
  const response = await apiClient.put(`/assignments/${id}`, { assignment: data });
  return response.data;
};
```

checklist:
  - [ ] Type definitions updated
  - [ ] Skills endpoint added
  - [ ] Locations endpoint added
  - [ ] Timesheet download function added
  - [ ] Shift and Assignment methods updated

## Step 4.2: Create data fetching hooks
task: "Create React hooks for skills and locations"
time_estimate: "25 minutes"

### Create useSkills hook
path: "frontend/src/hooks/useSkills.ts"
```typescript
import { useState, useEffect } from 'react';
import { getSkills } from '../services/api';
import { Skill } from '../types';

export const useSkills = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const data = await getSkills();
        setSkills(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch skills:', err);
        setError('Failed to load skills');
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  return { skills, loading, error };
};
```

### Create useLocations hook
path: "frontend/src/hooks/useLocations.ts"
```typescript
import { useState, useEffect } from 'react';
import { getLocations } from '../services/api';
import { Location } from '../types';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
        setError('Failed to load locations');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return { locations, loading, error };
};
```

checklist:
  - [ ] useSkills hook created
  - [ ] useLocations hook created
  - [ ] Both hooks handle loading and error states
  - [ ] Data fetched on mount

# =====================================================
# SECTION 5: MULTI-STEP SHIFT WIZARD (2 hours)
# =====================================================

## Step 5.1: Create wizard component structure
task: "Build multi-step form wizard for shift creation"
time_estimate: "45 minutes"

### Create wizard container
path: "frontend/src/components/Shifts/ShiftWizard.tsx"
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShift } from '../../services/api';
import { useLocations } from '../../hooks/useLocations';
import { useSkills } from '../../hooks/useSkills';
import StepIndicator from './StepIndicator';
import BasicInfoStep from './wizard/BasicInfoStep';
import LocationStep from './wizard/LocationStep';
import ScheduleStep from './wizard/ScheduleStep';
import ReviewStep from './wizard/ReviewStep';

interface ShiftFormData {
  client_name: string;
  role_needed: string;
  location_id: number | null;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  capacity: number;
  pay_rate: number;
  notes: string;
  status: 'draft' | 'published';
}

const ShiftWizard: React.FC = () => {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { skills } = useSkills();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ShiftFormData>({
    client_name: '',
    role_needed: '',
    location_id: null,
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    capacity: 1,
    pay_rate: 15.00,
    notes: '',
    status: 'draft'
  });

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Location' },
    { number: 3, title: 'Schedule' },
    { number: 4, title: 'Review' }
  ];

  const updateFormData = (data: Partial<ShiftFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Combine date and time into UTC datetime
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      
      const shiftData = {
        client_name: formData.client_name,
        role_needed: formData.role_needed,
        location_id: formData.location_id,
        start_time_utc: startDateTime.toISOString(),
        end_time_utc: endDateTime.toISOString(),
        capacity: formData.capacity,
        pay_rate: formData.pay_rate,
        notes: formData.notes,
        status: formData.status
      };
      
      await createShift(shiftData);
      navigate('/shifts');
    } catch (error) {
      console.error('Failed to create shift:', error);
      alert('Failed to create shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Shift</h1>
      
      <StepIndicator steps={steps} currentStep={currentStep} />
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        {currentStep === 1 && (
          <BasicInfoStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            skills={skills.map(s => s.name)}
          />
        )}
        
        {currentStep === 2 && (
          <LocationStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            locations={locations}
          />
        )}
        
        {currentStep === 3 && (
          <ScheduleStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )}
        
        {currentStep === 4 && (
          <ReviewStep
            formData={formData}
            updateFormData={updateFormData}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            locations={locations}
          />
        )}
      </div>
    </div>
  );
};

export default ShiftWizard;
```

### Create step indicator
path: "frontend/src/components/Shifts/StepIndicator.tsx"
```typescript
import React from 'react';

interface Step {
  number: number;
  title: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${currentStep === step.number 
                  ? 'bg-blue-600 text-white' 
                  : currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'}
              `}
            >
              {currentStep > step.number ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span className={`ml-2 ${currentStep === step.number ? 'font-semibold' : ''}`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div 
              className={`flex-1 h-1 mx-4 ${
                currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
```

checklist:
  - [ ] Wizard container component created
  - [ ] Step indicator shows progress
  - [ ] Form data state management
  - [ ] Navigation between steps works

## Step 5.2: Create individual step components
task: "Build each wizard step component"
time_estimate: "75 minutes"

### Step 1: Basic Info
path: "frontend/src/components/Shifts/wizard/BasicInfoStep.tsx"
```typescript
import React from 'react';

interface BasicInfoStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  skills: string[];
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  updateFormData,
  onNext,
  skills
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.client_name && formData.role_needed) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name *
          </label>
          <input
            type="text"
            required
            value={formData.client_name}
            onChange={(e) => updateFormData({ client_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., FSU Foundation Gala"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role Needed *
          </label>
          <select
            required
            value={formData.role_needed}
            onChange={(e) => updateFormData({ role_needed: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a role...</option>
            {skills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.capacity}
              onChange={(e) => updateFormData({ capacity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.pay_rate}
              onChange={(e) => updateFormData({ pay_rate: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any special instructions or requirements..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default BasicInfoStep;
```

### Step 2: Location
path: "frontend/src/components/Shifts/wizard/LocationStep.tsx"
```typescript
import React from 'react';
import { Location } from '../../../types';

interface LocationStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  locations: Location[];
}

const LocationStep: React.FC<LocationStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  locations
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.location_id) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-4">Select Location</h2>
      
      <div className="space-y-3">
        {locations.map(location => (
          <label
            key={location.id}
            className={`
              block p-4 border-2 rounded-lg cursor-pointer transition-all
              ${formData.location_id === location.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <input
              type="radio"
              name="location"
              value={location.id}
              checked={formData.location_id === location.id}
              onChange={() => updateFormData({ location_id: location.id })}
              className="sr-only"
            />
            <div className="flex items-start">
              <div className="flex-1">
                <p className="font-semibold">{location.name}</p>
                <p className="text-sm text-gray-600">{location.full_address}</p>
              </div>
              {formData.location_id === location.id && (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default LocationStep;
```

### Step 3: Schedule
path: "frontend/src/components/Shifts/wizard/ScheduleStep.tsx"
```typescript
import React from 'react';

interface ScheduleStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const ScheduleStep: React.FC<ScheduleStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrevious
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.start_date && formData.start_time && formData.end_date && formData.end_time) {
      onNext();
    }
  };

  // Set end date to match start date when start date changes
  const handleStartDateChange = (date: string) => {
    updateFormData({ 
      start_date: date,
      end_date: formData.end_date || date // Set end date if not already set
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-4">Schedule</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Start Date & Time</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => updateFormData({ start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">End Date & Time</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                min={formData.start_date}
                onChange={(e) => updateFormData({ end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => updateFormData({ end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            💡 Tip: For same-day shifts, the end date will match the start date automatically.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default ScheduleStep;
```

### Step 4: Review
path: "frontend/src/components/Shifts/wizard/ReviewStep.tsx"
```typescript
import React from 'react';
import { Location } from '../../../types';

interface ReviewStepProps {
  formData: any;
  updateFormData: (data: any) => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  locations: Location[];
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  updateFormData,
  onPrevious,
  onSubmit,
  isSubmitting,
  locations
}) => {
  const selectedLocation = locations.find(l => l.id === formData.location_id);
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Review & Submit</h2>
      
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div>
          <span className="text-sm text-gray-600">Client:</span>
          <p className="font-semibold">{formData.client_name}</p>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">Role:</span>
          <p className="font-semibold">{formData.role_needed}</p>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">Location:</span>
          <p className="font-semibold">{selectedLocation?.display_name}</p>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">Schedule:</span>
          <p className="font-semibold">
            {formData.start_date} {formData.start_time} - {formData.end_date} {formData.end_time}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Capacity:</span>
            <p className="font-semibold">{formData.capacity} workers</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Hourly Rate:</span>
            <p className="font-semibold">${formData.pay_rate}/hr</p>
          </div>
        </div>
        
        {formData.notes && (
          <div>
            <span className="text-sm text-gray-600">Notes:</span>
            <p className="font-semibold">{formData.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.status === 'published'}
            onChange={(e) => updateFormData({ 
              status: e.target.checked ? 'published' : 'draft' 
            })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm">Publish shift immediately (workers can see and sign up)</span>
        </label>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Shift'}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
```

checklist:
  - [ ] Basic info step collects client and role
  - [ ] Location step shows radio button selection
  - [ ] Schedule step handles date/time inputs
  - [ ] Review step shows summary
  - [ ] Publish checkbox on review step
  - [ ] All steps have Previous/Next navigation

# =====================================================
# SECTION 6: TESTING & VERIFICATION (30 minutes)
# =====================================================

## Step 6.1: Test backend endpoints
task: "Verify all backend changes work"
time_estimate: "15 minutes"

### Test with curl or Postman
```bash
# Test skills endpoint
curl http://localhost:3000/api/v1/skills \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Test locations endpoint  
curl http://localhost:3000/api/v1/locations \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Test shift creation with new fields
curl -X POST http://localhost:3000/api/v1/shifts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "shift": {
      "client_name": "Test Event",
      "role_needed": "Server",
      "location_id": 1,
      "start_time_utc": "2024-12-20T10:00:00Z",
      "end_time_utc": "2024-12-20T14:00:00Z",
      "capacity": 5,
      "pay_rate": 20,
      "status": "published"
    }
  }'

# Test CSV export
curl "http://localhost:3000/api/v1/reports/timesheet?start_date=2024-12-01&end_date=2024-12-31" \
  -b cookies.txt \
  --output timesheet.csv
```

checklist:
  - [ ] Skills endpoint returns list
  - [ ] Locations endpoint returns list
  - [ ] Shift creates with location_id and status
  - [ ] CSV downloads successfully
  - [ ] Assignment accepts hours_worked

## Step 6.2: Test frontend components
task: "Verify wizard and new features work"
time_estimate: "15 minutes"

### Manual testing checklist
```markdown
Frontend Testing:
1. [ ] Navigate to /shifts/new - wizard loads
2. [ ] Step 1: Fill basic info, skills dropdown works
3. [ ] Step 2: Select location from list
4. [ ] Step 3: Set dates and times
5. [ ] Step 4: Review shows all data correctly
6. [ ] Submit creates shift successfully
7. [ ] Check shift list shows new status badges
8. [ ] Edit assignment, add hours worked
9. [ ] CSV export downloads file
10. [ ] All forms validate required fields
```

### Verify in browser console
```javascript
// Check API calls are working
fetch('/api/v1/skills').then(r => r.json()).then(console.log)
fetch('/api/v1/locations').then(r => r.json()).then(console.log)
```

checklist:
  - [ ] Wizard navigates through all steps
  - [ ] Form validation prevents invalid submissions
  - [ ] Dropdowns populated with skills/locations
  - [ ] Shift creates and redirects to list
  - [ ] Hours can be entered on assignments

# =====================================================
# END OF DAY 1 CHECKLIST
# =====================================================

## Day 1 Complete Checklist:

### Backend (must complete first):
- [ ] Database migrations created and run
- [ ] Skills model and seeds (12 skills)
- [ ] Locations model and seeds (10 locations)
- [ ] Assignment hours_worked field
- [ ] Shift status field (draft/published/archived)
- [ ] Controllers updated for new fields
- [ ] CSV export endpoint working
- [ ] 25 workers seeded with skills
- [ ] 10+ shifts seeded with assignments

### Frontend:
- [ ] API service layer updated
- [ ] Skills and locations hooks created
- [ ] Multi-step wizard complete (4 steps)
- [ ] Step indicator shows progress
- [ ] All wizard steps functional
- [ ] Form creates shifts with new fields
- [ ] Hours entry field on assignments

### Verification:
- [ ] Backend API endpoints tested
- [ ] Frontend wizard tested end-to-end
- [ ] Data persists correctly
- [ ] No console errors
- [ ] Ready for Day 2 features

## Next Steps (Day 2 Preview):
- Enhanced data tables with sorting/filtering
- Timesheet reports page
- Calendar as primary dashboard
- UI polish with Figma design system
- Bulk operations improvements

Total estimated time: 10 hours
```

This is your complete Day 1 instruction set. Each section has:
- Clear file paths
- Complete code (not summaries)
- Step-by-step instructions
- Checklists for verification
- Time estimates

Start with Section 1 (Backend Database Changes) and work through sequentially. The backend must be done first as the frontend depends on it.
