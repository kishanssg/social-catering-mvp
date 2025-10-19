# 📋 IMPLEMENTATION CONTEXT - SOCIAL CATERING MVP

**Last Updated:** January 2025  
**Phase:** Phase 0 - Cleanup & Restructure  
**Status:** Active Development - Local Testing  
**Next Milestone:** Push to Heroku Staging

---

## 🎯 PROJECT OVERVIEW

### **Purpose**
Social Catering MVP is a workforce management system for catering companies to manage events, assign staff, track hours, and generate payroll reports.

### **Core Business Model**
1. Admin creates events with skill requirements
2. System generates shifts based on requirements
3. Workers with matching skills get assigned to shifts
4. Workers complete shifts and hours are tracked
5. System exports timesheets/payroll for processing

### **Key Differentiators**
- **Skills-based matching**: Workers assigned based on skills
- **Conflict detection**: Prevents double-booking workers
- **Bulk scheduling**: Assign one worker to multiple shifts at once
- **Venue caching**: Google Places API with local database cache
- **Realistic data**: Seeded with Tallahassee, FL venues and realistic scenarios

---

## 🏗️ CURRENT ARCHITECTURE

### **Tech Stack**

#### **Backend**
- **Framework:** Ruby on Rails 7.2.0
- **Database:** PostgreSQL 16+ (with full-text search)
- **Authentication:** Devise 4.9.3
- **Background Jobs:** SolidQueue (not Sidekiq)
- **API Format:** JSON REST API
- **CORS:** Rack-CORS enabled

#### **Frontend**
- **Framework:** React 19.1.1 (latest)
- **Language:** TypeScript 5.9.3
- **Build Tool:** Vite 7.1.7
- **Router:** React Router 7.9.3 (latest)
- **Styling:** Tailwind CSS 3.4.18
- **Icons:** Lucide React 0.545.0
- **Date Handling:** date-fns 4.1.0
- **HTTP Client:** Axios 1.12.2

#### **Deployment**
- **Platform:** Heroku (staging + production planned)
- **Current Stage:** Local development → Staging → Production
- **CI/CD:** Manual deployment (GitHub Actions planned)

---

## 📊 DATABASE SCHEMA OVERVIEW

### **Core Tables (13 Total)**

#### **1. USERS** (Admin Authentication)
```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  encrypted_password VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'admin',
  first_name VARCHAR,
  last_name VARCHAR,
  reset_password_token VARCHAR,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)
```
**Purpose:** Admin users who manage the system  
**Key Fields:** `email`, `encrypted_password`, `role`  
**Relationships:** Creates assignments, creates shifts, logs activities

---

#### **2. WORKERS** (Staff Members)
```sql
workers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  phone VARCHAR,
  skills_json JSONB DEFAULT '[]',  -- Array of skill names
  skills_text TEXT,                 -- For full-text search
  skills_tsvector TSVECTOR,         -- PostgreSQL FTS index
  active BOOLEAN DEFAULT true,
  address_line1 VARCHAR,
  address_line2 VARCHAR,
  profile_photo_url VARCHAR,
  default_hourly_rate DECIMAL(10,2),
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_workers_active ON workers(active)
INDEX idx_workers_skills_tsvector ON workers USING GIN(skills_tsvector)
INDEX idx_workers_skills_json ON workers USING GIN(skills_json)
```
**Purpose:** Staff members who get assigned to shifts  
**Key Fields:** `skills_json` (JSONB array), `active` (boolean)  
**Relationships:** Has many assignments, has many skills (via worker_skills)

---

#### **3. EVENTS** (Job/Event Management)
```sql
events (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'draft',  -- draft, published, completed
  venue_id INTEGER REFERENCES venues(id),
  check_in_instructions TEXT,
  supervisor_name VARCHAR,
  supervisor_phone VARCHAR,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_events_status_created ON events(status, created_at_utc)
INDEX idx_events_venue ON events(venue_id)
```
**Purpose:** Main event/job entity  
**Key Fields:** `status` (draft/published/completed), `venue_id`  
**Relationships:** Belongs to venue, has one schedule, has many skill requirements, has many shifts

---

#### **4. EVENT_SCHEDULES** (Event Timing)
```sql
event_schedules (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_time_utc TIMESTAMPTZ NOT NULL,
  end_time_utc TIMESTAMPTZ NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_event_schedules_event ON event_schedules(event_id)
INDEX idx_event_schedules_start_time ON event_schedules(start_time_utc)
```
**Purpose:** Defines when events occur  
**Key Fields:** `start_time_utc`, `end_time_utc`, `break_minutes`  
**Cascade:** Deleted when event is deleted

---

#### **5. EVENT_SKILL_REQUIREMENTS** (Event Needs)
```sql
event_skill_requirements (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  skill_name VARCHAR NOT NULL,
  needed_workers INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  uniform_name VARCHAR,
  certification_name VARCHAR,
  pay_rate DECIMAL(10,2),
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_esr_event ON event_skill_requirements(event_id)
```
**Purpose:** Defines what skills/workers each event needs  
**Key Fields:** `skill_name`, `needed_workers`, `pay_rate`  
**Cascade:** Deleted when event is deleted

---

#### **6. SHIFTS** (Individual Work Shifts)
```sql
shifts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  event_skill_requirement_id INTEGER REFERENCES event_skill_requirements(id),
  client_name VARCHAR,
  role_needed VARCHAR NOT NULL,
  location VARCHAR,
  location_id INTEGER REFERENCES locations(id),
  start_time_utc TIMESTAMPTZ NOT NULL,
  end_time_utc TIMESTAMPTZ NOT NULL,
  pay_rate DECIMAL(10,2),
  capacity INTEGER DEFAULT 1,
  status VARCHAR DEFAULT 'draft',
  required_cert_id INTEGER REFERENCES certifications(id),
  created_by_id INTEGER REFERENCES users(id),
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_shifts_event_status ON shifts(event_id, status, start_time_utc)
INDEX idx_shifts_start_end ON shifts(start_time_utc, end_time_utc)
```
**Purpose:** Individual work shifts that workers get assigned to  
**Key Fields:** `role_needed`, `start_time_utc`, `end_time_utc`, `capacity`  
**Cascade:** Deleted when event is deleted

---

#### **7. ASSIGNMENTS** (Worker-Shift Assignments)
```sql
assignments (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
  assigned_by_id INTEGER REFERENCES users(id),
  assigned_at_utc TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR DEFAULT 'assigned',  -- assigned, confirmed, completed, cancelled
  hours_worked DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  notes TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL,
  
  CONSTRAINT unique_worker_shift UNIQUE(worker_id, shift_id)
)

-- Indexes
INDEX idx_assignments_worker_status ON assignments(worker_id, status, created_at_utc)
INDEX idx_assignments_shift ON assignments(shift_id)
```
**Purpose:** Links workers to shifts with work details  
**Key Fields:** `status`, `hours_worked`, `hourly_rate`  
**Constraints:** One worker per shift (unique constraint)  
**Cascade:** Deleted when shift is deleted, RESTRICT when worker deleted

---

#### **8. VENUES** (Cached Google Places Locations)
```sql
venues (
  id SERIAL PRIMARY KEY,
  place_id VARCHAR NOT NULL UNIQUE,      -- Google Place ID
  name VARCHAR NOT NULL,
  formatted_address TEXT NOT NULL,
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  arrival_instructions TEXT,             -- Custom instructions
  parking_info TEXT,                     -- Custom parking info
  phone VARCHAR,
  website VARCHAR,
  last_synced_at_utc TIMESTAMPTZ,        -- Staleness tracking
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_venues_place_id ON venues(place_id)
```
**Purpose:** Cached venue locations from Google Places API  
**Key Fields:** `place_id`, `formatted_address`, `arrival_instructions`  
**Hybrid Strategy:** First check cache, fallback to Google API if not found

---

#### **9. SKILLS** (Master Skills List)
```sql
skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)
```
**Purpose:** Master list of available skills  
**Key Fields:** `name` (unique), `active`, `display_order`  
**Preset List:**
- Server
- Bartender
- Chef
- Line Cook
- Sous Chef
- Captain
- Busser
- Host/Hostess
- Banquet Server/Runner
- Dishwasher
- Prep Cook
- Event Helper

---

#### **10. CERTIFICATIONS** (Master Certifications List)
```sql
certifications (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)
```
**Purpose:** Master list of required certifications  
**Preset List:**
- Food Handler Certificate
- ServSafe Manager
- TIPS Certification
- Alcohol Service License
- SafeStaff
- CPR Certified
- First Aid Certified

---

#### **11. WORKER_SKILLS** (Junction Table)
```sql
worker_skills (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL,
  
  CONSTRAINT unique_worker_skill UNIQUE(worker_id, skill_id)
)
```
**Purpose:** Many-to-many relationship between workers and skills

---

#### **12. WORKER_CERTIFICATIONS** (Junction Table with Expiry)
```sql
worker_certifications (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  certification_id INTEGER NOT NULL REFERENCES certifications(id) ON DELETE RESTRICT,
  expires_at_utc TIMESTAMPTZ,
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL
)
```
**Purpose:** Links workers to certifications with expiry tracking  
**Key Fields:** `expires_at_utc` (nullable)

---

#### **13. ACTIVITY_LOGS** (Audit Trail)
```sql
activity_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at_utc TIMESTAMPTZ NOT NULL
)

-- Indexes
INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id)
INDEX idx_activity_logs_actor ON activity_logs(actor_user_id)
```
**Purpose:** Tracks all changes to the system for audit trail  
**Key Fields:** `entity_type`, `entity_id`, `action`, `before_json`, `after_json`

---

## 🔗 FOREIGN KEY RELATIONSHIPS

### **CASCADE DELETE** (Child deleted when parent deleted)
```
assignments → shifts
event_schedules → events
event_skill_requirements → events
shifts → events
worker_certifications → workers
worker_skills → workers
worker_skills → skills
```

### **RESTRICT DELETE** (Prevents parent deletion if children exist)
```
assignments → workers
events → venues
worker_certifications → certifications
```

### **SET NULL** (Sets foreign key to NULL when parent deleted)
```
activity_logs → users
assignments → users (assigned_by)
shifts → certifications (required_cert_id)
shifts → event_skill_requirements
shifts → locations
shifts → users (created_by)
```

---

## 🎯 KEY BUSINESS LOGIC

### **Event Lifecycle**
```
1. DRAFT → Admin creates event with venue, schedule, skill requirements
2. PUBLISHED → System generates shifts based on requirements
3. ASSIGNED → Workers are assigned to shifts
4. COMPLETED → Event finishes, hours are entered
5. EXPORTED → Timesheet/payroll generated for billing
```

### **Shift Generation Algorithm**
```ruby
# When event is published:
# app/models/event.rb

def generate_shifts!
  shifts = []
  
  event_skill_requirements.each do |skill_req|
    skill_req.needed_workers.times do
      shift = shifts.create!(
        role_needed: skill_req.skill_name,
        start_time_utc: event_schedule.start_time_utc,
        end_time_utc: event_schedule.end_time_utc,
        pay_rate: skill_req.pay_rate,
        location: venue.formatted_address,
        client_name: title,
        status: 'published'
      )
      shifts << shift
    end
  end
  
  shifts
end
```

### **Conflict Detection Logic**
```ruby
# app/services/assign_worker_to_shift.rb

def check_conflicts
  # Find overlapping shifts for this worker
  overlapping = worker.assignments
    .joins(:shift)
    .where(status: ['confirmed', 'completed'])
    .where('shifts.start_time_utc < ? AND shifts.end_time_utc > ?',
           new_shift.end_time_utc, new_shift.start_time_utc)
  
  # Two shifts overlap if:
  # (StartA < EndB) AND (EndA > StartB)
  
  return { conflict: true, shifts: overlapping } if overlapping.any?
  return { conflict: false }
end
```

### **Hours Calculation**
```ruby
# For timesheet export:
# app/controllers/api/v1/reports_controller.rb

def calculate_hours(assignment, shift, event)
  if assignment.hours_worked.present?
    # Use manually entered hours (already net of break)
    assignment.hours_worked
  else
    # Calculate from shift times minus break
    shift_duration = (shift.end_time_utc - shift.start_time_utc) / 1.hour
    break_hours = (event.event_schedule&.break_minutes || 0) / 60.0
    
    [shift_duration - break_hours, 0].max.round(2)
  end
end
```

### **Skills Matching**
```sql
-- Find workers with required skill
SELECT * FROM workers 
WHERE skills_json @> '["Bartender"]'::jsonb
AND active = true;

-- Full-text search on skills
SELECT * FROM workers 
WHERE skills_tsvector @@ to_tsquery('bartender | server');
```

---

## 📡 API ENDPOINTS

### **Authentication**
```
POST   /api/v1/sessions/login       - Login with email/password
DELETE /api/v1/sessions/logout      - Logout current user
GET    /api/v1/sessions/current     - Get current user info
```

### **Events**
```
GET    /api/v1/events                - List events (?tab=draft|active|past)
GET    /api/v1/events/:id            - Get event details
POST   /api/v1/events                - Create event
PATCH  /api/v1/events/:id            - Update event
DELETE /api/v1/events/:id            - Delete event
POST   /api/v1/events/:id/publish    - Publish event (generates shifts)
POST   /api/v1/events/:id/complete   - Mark event as completed
```

### **Workers**
```
GET    /api/v1/workers               - List workers (?active=true)
GET    /api/v1/workers/:id           - Get worker details
POST   /api/v1/workers               - Create worker
PATCH  /api/v1/workers/:id           - Update worker
DELETE /api/v1/workers/:id           - Delete worker
```

### **Assignments (Staffing)**
```
POST   /api/v1/staffing              - Assign single worker to shift
POST   /api/v1/staffing/bulk_create  - Assign one worker to multiple shifts
PATCH  /api/v1/staffing/:id          - Update assignment
DELETE /api/v1/staffing/:id          - Remove assignment
```

### **Shifts**
```
GET    /api/v1/shifts/:id            - Get shift details (for assignment modal)
```

### **Reports**
```
GET    /api/v1/reports/timesheet     - Export timesheet CSV
       ?start_date=YYYY-MM-DD
       &end_date=YYYY-MM-DD
       &worker_id=123
       &event_id=456
       
GET    /api/v1/reports/payroll       - Export payroll CSV
       ?start_date=YYYY-MM-DD
       &end_date=YYYY-MM-DD
```

### **Venues**
```
GET    /api/v1/venues/search         - Search venues (?query=tallahassee)
POST   /api/v1/venues/select         - Get/create venue by place_id
```

### **Health Check**
```
GET    /healthz                      - Health check endpoint
```

---

## ✅ IMPLEMENTED FEATURES

### **Events Management** ✅
- [x] Create draft events with wizard
- [x] Edit draft events
- [x] Delete draft events (with warnings)
- [x] Publish events (generates shifts)
- [x] Three tabs: Draft / Active / Past
- [x] Filter active events (All/Needs Workers/Partial/Ready)
- [x] Expand/collapse event details
- [x] Inline worker assignment in Active tab
- [x] View past events with hours worked
- [x] Search events by title or venue
- [x] Sort events by date/name/staffing

### **Workers Management** ✅
- [x] CRUD operations
- [x] Skills management with preset dropdown
- [x] Certifications with expiry dates
- [x] Worker detail page with assignment history
- [x] Active/Inactive status toggle
- [x] Search workers by name/email/phone
- [x] Filter workers by status
- [x] Worker avatar with initials

### **Bulk Scheduling** ✅
- [x] "Schedule Worker" button on Workers page
- [x] Modal shows available shifts
- [x] Filter shifts by worker skills
- [x] Multi-select shifts with checkboxes
- [x] Select all functionality
- [x] Search and filter shifts
- [x] Conflict detection (time overlaps)
- [x] Bulk assignment API endpoint

### **Dashboard** ✅
- [x] Stats cards (Draft/Published/Completed/Gaps)
- [x] Calendar view with events
- [x] Urgent events list (needs workers)
- [x] Quick navigation to filtered views
- [x] Real-time stats updates

### **Reports** ✅
- [x] Timesheet CSV export
- [x] Payroll CSV export
- [x] Date range presets (Today/Last 7 days/etc)
- [x] Custom date range picker
- [x] Worker and event filters
- [x] Quick export cards

### **Venues (Hybrid Cache)** ✅
- [x] Google Places API integration
- [x] Local database caching
- [x] 30-day staleness detection
- [x] Custom arrival instructions
- [x] Custom parking info
- [x] Session token cost optimization

### **Authentication** ✅
- [x] Login/Logout with Devise
- [x] Session persistence
- [x] Protected API routes
- [x] Role-based access (admin only for now)

---

## ⚠️ KNOWN ISSUES

### **🔴 HIGH PRIORITY**

#### **1. CSV Export Format** 🔴
**Issue:** Headers might not match sample exactly  
**Expected:**
```csv
JOB_ID,SKILL_NAME,WORKER_FIRSTNAME,WORKER_LASTNAME,SHIFT_DATE,SHIFT_START_TIME,SHIFT_END_TIME,UNPAID_BREAK,TOTAL_HOURS,SHIFT_SUPERVISOR,REMARKS
```
**Action Required:**
- Verify header names use underscores (not spaces)
- Verify date format: MM/DD/YYYY
- Verify time format: HH:MM AM/PM
- Verify break format: 0.5 (decimal hours)
- Test with sample data

#### **2. Bulk Assignment Terminology** 🔴
**Issue:** Button says "Assign" but should say "Schedule"  
**Files to Update:**
- `social-catering-ui/src/pages/WorkersPage.tsx` (button text)
- `social-catering-ui/src/pages/WorkersPage.tsx` (modal title)
**Status:** Ready to fix

#### **3. Events Tab Filtering** 🟡
**Issue:** Backend tab filtering needs verification  
**Test Required:**
```bash
curl "http://localhost:3000/api/v1/events?tab=draft"
curl "http://localhost:3000/api/v1/events?tab=active"
curl "http://localhost:3000/api/v1/events?tab=past"
```
**Expected Behavior:**
- Draft: status='draft'
- Active: status='published' AND start_time > now
- Past: status='completed' AND end_time < now

#### **4. Conflict Detection** 🟡
**Issue:** Need to verify overlapping shift detection works  
**Test Cases:**
- Worker A: Shift 2-6pm
- Try assign Worker A: Shift 4-8pm (should conflict)
- Try assign Worker A: Shift 7-10pm (should succeed)
**Status:** Implemented but needs testing

### **🟡 MEDIUM PRIORITY**

#### **5. Hours Calculation**
**Issue:** Verify break deduction logic is correct  
**Formula:** `(end_time - start_time) - break_minutes/60`  
**Edge Cases:**
- Manual hours entry (already net of break)
- Missing break_minutes (default to 0)
- Overnight shifts (crossing midnight)

#### **6. Venue Google API Integration**
**Issue:** Google Places API ready but not active in search  
**Current:** Only searches cached venues  
**Planned:** Fallback to Google API if not in cache  
**Status:** Backend ready, needs frontend integration

#### **7. Password Reset**
**Issue:** No password reset functionality  
**Status:** Devise supports it, just need to enable routes

### **🟢 LOW PRIORITY**

#### **8. Real-time Updates**
**Issue:** Dashboard doesn't auto-refresh  
**Workaround:** Manual page refresh  
**Future:** WebSockets or polling

#### **9. File Uploads**
**Issue:** Active Storage commented out  
**Impact:** No profile photo uploads  
**Status:** Low priority for MVP

#### **10. Mobile Responsiveness**
**Issue:** Some pages need mobile optimization  
**Status:** Works but could be better

---

## 🗑️ DEPRECATED/REMOVED

### **Removed Features**
- ❌ Staffing Page (merged into Events page)
- ❌ Job model alias (use Event only)
- ❌ Staffing model alias (use Assignment only)
- ❌ Locations table (use Venues table)

### **Files Deleted**
```
src/pages/StaffingPage.tsx
src/services/staffingApi.ts
app/models/job.rb
app/models/staffing.rb
```

### **Redirects in Place**
```
/staffing → /events?tab=active
/assignments → /events?tab=active
/jobs → /events
```

---

## 🎨 FRONTEND FILE STRUCTURE

```
social-catering-ui/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.tsx           ✅ Main dashboard
│   │   ├── EventsPage.tsx              ✅ Unified events (3 tabs)
│   │   ├── EventCreatePage.tsx         ✅ Event wizard
│   │   ├── EventDetailPage.tsx         ✅ Event details
│   │   ├── WorkersPage.tsx             ✅ Workers list + bulk schedule
│   │   ├── WorkerCreatePage.tsx        ✅ Worker wizard
│   │   ├── WorkerDetailPage.tsx        ✅ Worker details
│   │   └── ReportsPage.tsx             ✅ CSV exports
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx           ✅ Main layout with sidebar
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx      ✅ Loading state
│   │   │   └── EmptyState.tsx          ✅ Empty states
│   │   └── [other components as needed]
│   ├── contexts/
│   │   └── AuthContext.tsx             ✅ Authentication state
│   ├── lib/
│   │   └── api.ts                      ✅ Axios client with auth
│   └── App.tsx                         ✅ Router configuration
├── public/                             ✅ Built frontend assets
└── package.json                        ✅ Dependencies
```

---

## 🔧 BACKEND FILE STRUCTURE

```
app/
├── controllers/
│   └── api/v1/
│       ├── base_controller.rb          ✅ Base API controller
│       ├── sessions_controller.rb      ✅ Auth endpoints
│       ├── events_controller.rb        ✅ Events CRUD + publish
│       ├── workers_controller.rb       ✅ Workers CRUD
│       ├── staffing_controller.rb      ✅ Assignments + bulk
│       ├── shifts_controller.rb        ✅ Shift details
│       ├── reports_controller.rb       ✅ CSV exports
│       └── venues_controller.rb        ✅ Venue search
├── models/
│   ├── user.rb                         ✅ Admin user
│   ├── worker.rb                       ✅ Staff member
│   ├── event.rb                        ✅ Event (no Job alias)
│   ├── event_schedule.rb               ✅ Event timing
│   ├── event_skill_requirement.rb      ✅ Event needs
│   ├── shift.rb                        ✅ Work shift
│   ├── assignment.rb                   ✅ Worker-shift link
│   ├── venue.rb                        ✅ Cached locations
│   ├── skill.rb                        ✅ Skills master list
│   ├── certification.rb                ✅ Certifications master
│   ├── worker_skill.rb                 ✅ Worker-skill junction
│   ├── worker_certification.rb         ✅ Worker-cert junction
│   └── activity_log.rb                 ✅ Audit trail
├── services/
│   ├── assign_worker_to_shift.rb       ✅ Conflict detection
│   └── google_places_service.rb        ✅ Google Places API
└── concerns/
    └── auditable.rb                    ✅ Activity logging
```

---

## 🌱 SEED DATA STRATEGY

### **Realistic Tallahassee Data**

#### **Venues (10 Real Locations)**
```ruby
1. FSU Alumni Center - 1030 W Tennessee St
2. Goodwood Museum & Gardens - 1600 Miccosukee Rd
3. The Moon - 1105 E Lafayette St
4. Tallahassee Automobile Museum - 6800 Mahan Dr
5. Hotel Duval - 415 N Monroe St
6. Maclay Gardens State Park - 3540 Thomasville Rd
7. Aloft Tallahassee Downtown - 200 N Monroe St
8. The Pavilion at Lake Ella - 580 N Gadsden St
9. Mission San Luis - 2100 W Tennessee St
10. Tallahassee Museum - 3945 Museum Dr
```

#### **Workers (25 with Realistic Names)**
```ruby
# Names: Emma, Liam, Olivia, Noah, Ava, Sophia, etc.
# Skills: 2-4 random skills per worker
# 75% active, 25% inactive
# 50% have certifications with expiry dates
# Realistic emails: first.last@socialcatering.com
# Phone numbers: 850-555-XXXX format
```

#### **Events (15 Total)**
```ruby
# 5 Past Events (completed with hours)
- Corporate Holiday Party
- Wedding Reception
- FSU Alumni Gala
- Business Conference Lunch
- Birthday Celebration

# 5 Active Events (partially staffed)
- Charity Fundraiser
- Company Meeting Catering
- Engagement Party
- Retirement Party
- Product Launch Event

# 5 Draft Events (not published)
- [Randomized event types]
```

#### **Shifts (~40-50 Total)**
- Generated automatically when events published
- Varied roles: Server, Bartender, Captain, Busser
- Realistic timing: 9am-6pm, 6pm-11pm, etc.
- Some assigned, some unfilled (for testing)

#### **Assignments (~60 Total)**
- Past events: All shifts assigned with hours
- Active events: 50-75% assigned
- Realistic hours: 4.0, 5.5, 7.5, 8.0

---

## 🧪 TESTING STRATEGY

### **Manual Testing (Primary)**
- Documented checklists for each page
- Step-by-step user flows
- Edge case scenarios
- Data verification in Rails console

### **Automated Testing (Future)**
- **Backend:** RSpec for model/service tests
- **Frontend:** Jest + React Testing Library
- **E2E:** Cypress (planned)

### **Terminal/API Testing**
```bash
# Test database connectivity
rails console
ActiveRecord::Base.connection.execute('SELECT 1')
exit

# Test API endpoints
curl -X POST "http://localhost:3000/api/v1/sessions/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@socialcatering.com","password":"password123"}' \
  -c cookies.txt

# Test authenticated endpoint
curl -X GET "http://localhost:3000/api/v1/events" \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Verify database alignment
rails dbconsole
\dt  -- List all tables
\d events  -- Describe events table
\q  -- Quit
```

---

## 🔐 ENVIRONMENT VARIABLES

### **Backend (.env)**
```bash
# Required
DATABASE_URL=postgresql://localhost/social_catering_development
RAILS_ENV=development
SECRET_KEY_BASE=[run: rails secret]
RAILS_MASTER_KEY=[from config/master.key]

# Optional (for Google Places API)
GOOGLE_PLACES_API_KEY=your_api_key_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Production/Staging
RAILS_LOG_TO_STDOUT=true
RAILS_SERVE_STATIC_FILES=true
```

### **Frontend (.env)**
```bash
VITE_API_URL=http://localhost:3000
```

---

## 🚀 DEPLOYMENT CONFIGURATION

### **Heroku Setup**

#### **Staging App**
```bash
# Create Heroku app
heroku create sc-mvp-staging --region us

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini -a sc-mvp-staging

# Set environment variables
heroku config:set RAILS_ENV=production -a sc-mvp-staging
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key) -a sc-mvp-staging
heroku config:set SECRET_KEY_BASE=$(rails secret) -a sc-mvp-staging
heroku config:set FRONTEND_URL=https://sc-mvp-staging.herokuapp.com -a sc-mvp-staging
heroku config:set GOOGLE_PLACES_API_KEY=your_key -a sc-mvp-staging

# Deploy
git push heroku main

# Run migrations and seeds
heroku run rails db:migrate -a sc-mvp-staging
heroku run rails db:seed -a sc-mvp-staging

# Check logs
heroku logs --tail -a sc-mvp-staging
```

#### **Production App (Future)**
```bash
# Will be created after staging is stable
heroku create sc-mvp-production --region us
# Add daily backups addon
heroku addons:create heroku-postgresql:standard-0 -a sc-mvp-production
```

### **Health Check Endpoint**
```ruby
# config/routes.rb
get '/healthz', to: 'health#check'

# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :verify_authenticity_token
  skip_before_action :authenticate_user!

  def check
    ActiveRecord::Base.connection.execute('SELECT 1')
    render json: { 
      status: 'healthy', 
      database: 'connected',
      timestamp: Time.current,
      environment: Rails.env
    }
  rescue => e
    render json: { 
      status: 'unhealthy', 
      error: e.message 
    }, status: 503
  end
end
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### **Database Indexes**
```sql
-- Already implemented
CREATE INDEX idx_events_status_created ON events(status, created_at_utc);
CREATE INDEX idx_shifts_event_status ON shifts(event_id, status, start_time_utc);
CREATE INDEX idx_assignments_worker_status ON assignments(worker_id, status, created_at_utc);
CREATE INDEX idx_workers_skills_json ON workers USING GIN(skills_json);
CREATE INDEX idx_workers_skills_tsvector ON workers USING GIN(skills_tsvector);

-- Recommended for production
CREATE INDEX idx_shifts_start_end ON shifts(start_time_utc, end_time_utc);
CREATE INDEX idx_event_schedules_times ON event_schedules(start_time_utc, end_time_utc);
```

### **Query Optimization**
```ruby
# Use includes to avoid N+1 queries
Event.includes(:venue, :event_schedule, :event_skill_requirements, 
               shifts: { assignments: :worker })

# Use joins for filtering
Event.published
     .joins(:event_schedule)
     .where('event_schedules.start_time_utc > ?', Time.current)

# Use select to limit columns
Worker.select(:id, :first_name, :last_name, :email, :skills_json)
```

### **Caching Strategy**
```ruby
# Venue caching (30-day staleness)
class Venue < ApplicationRecord
  def stale?
    last_synced_at_utc.nil? || last_synced_at_utc < 30.days.ago
  end
end

# Fragment caching (future)
<% cache @event do %>
  <%= render @event %>
<% end %>
```

---

## 🔒 SECURITY CONSIDERATIONS

### **CORS Configuration**
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

### **Authentication Flow**
```ruby
# app/controllers/api/v1/base_controller.rb
class Api::V1::BaseController < ApplicationController
  before_action :authenticate_user!
  
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActionController::ParameterMissing, with: :bad_request
  
  private
  
  def authenticate_user!
    unless current_user
      render json: { error: 'Unauthorized' }, status: 401
    end
  end
end
```

### **SQL Injection Prevention**
```ruby
# ✅ SAFE - Parameterized queries
Worker.where("skills_json @> ?", [skill_name].to_json)
Event.where("status = ?", params[:status])

# ❌ UNSAFE - Never use string interpolation
Worker.where("skills_json @> '#{params[:skill]}'")  # DON'T DO THIS
```

### **XSS Prevention**
- React automatically escapes output
- Use `dangerouslySetInnerHTML` only when absolutely necessary
- Sanitize user input on backend

---

## 🎯 FEATURE PRIORITY MATRIX

### **Phase 0: Cleanup & Restructure** (Current)
- [x] Delete irrelevant files
- [ ] Remove Job/Staffing aliases
- [ ] Consolidate database schema
- [ ] Verify all relationships
- [ ] Add missing indexes

### **Phase 1: Seed Realistic Data**
- [ ] Create comprehensive seed file
- [ ] Seed 25 workers with skills
- [ ] Seed 10 Tallahassee venues
- [ ] Seed 15 events (5 draft, 5 active, 5 past)
- [ ] Generate 40+ shifts
- [ ] Create 60+ assignments

### **Phase 2: Events Page Audit** (Priority 1)
- [ ] Test tab filtering (draft/active/past)
- [ ] Test event creation/editing
- [ ] Test publish workflow
- [ ] Test worker assignment
- [ ] Test conflict detection
- [ ] Verify hours display

### **Phase 3: Workers Page Audit** (Priority 1)
- [ ] Test CRUD operations
- [ ] Test skills management
- [ ] Fix "Schedule" button terminology
- [ ] Test bulk assignment modal
- [ ] Test conflict detection
- [ ] Verify skill filtering

### **Phase 4: Reports Audit** (Priority 1)
- [ ] Fix CSV headers (underscores)
- [ ] Verify date format (MM/DD/YYYY)
- [ ] Verify time format (HH:MM AM/PM)
- [ ] Verify break format (decimal)
- [ ] Verify hours calculation
- [ ] Test with sample data

### **Phase 5: Dashboard Audit** (Priority 2)
- [ ] Test stats accuracy
- [ ] Test calendar functionality
- [ ] Test urgent events list
- [ ] Test navigation links

### **Phase 6: Polish & Deploy** (Priority 3)
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Responsive design
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deploy to staging

---

## 🐛 DEBUGGING TIPS

### **Backend Issues**

#### **Database Connection**
```bash
# Check database exists
rails db:migrate:status

# Reset database
rails db:drop db:create db:migrate db:seed

# Check PostgreSQL is running
pg_isready
```

#### **Rails Console Debugging**
```ruby
# Check model relationships
event = Event.first
event.shifts.count
event.venue
event.event_schedule

# Check associations loaded
event.association(:shifts).loaded?

# Reload associations
event.reload
event.shifts.reload

# Enable SQL logging
ActiveRecord::Base.logger = Logger.new(STDOUT)

# Check queries
Event.published.to_sql
```

#### **API Response Debugging**
```bash
# Check response headers
curl -I "http://localhost:3000/api/v1/events"

# Pretty print JSON
curl "http://localhost:3000/api/v1/events" | jq

# Check cookies
curl -c cookies.txt -b cookies.txt "http://localhost:3000/api/v1/events"
```

### **Frontend Issues**

#### **Network Tab**
- Open Chrome DevTools → Network tab
- Filter by XHR to see API calls
- Check request/response headers
- Verify status codes (200, 401, 500)

#### **React DevTools**
- Install React DevTools extension
- Inspect component state/props
- Check context values (AuthContext)

#### **Console Logging**
```typescript
// Add debug logs
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Response:', response.data);
console.log('Current user:', user);
```

---

## 📚 CODING CONVENTIONS

### **Ruby/Rails**
```ruby
# Use snake_case for variables/methods
def calculate_total_hours
  # ...
end

# Use CamelCase for classes
class EventSkillRequirement < ApplicationRecord
  # ...
end

# Use _utc suffix for timestamps
created_at_utc: Time.current.utc

# Use descriptive method names
def generate_shifts!  # ! indicates mutation
  # ...
end

# Use query methods for readability
event.published?  # vs event.status == 'published'
worker.active?    # vs worker.active == true
```

### **TypeScript/React**
```typescript
// Use PascalCase for components
export function DashboardPage() {
  // ...
}

// Use camelCase for variables/functions
const handleSubmit = () => {
  // ...
};

// Use interfaces for props
interface WorkerCardProps {
  worker: Worker;
  onEdit: (id: number) => void;
}

// Use descriptive state names
const [isLoading, setIsLoading] = useState(false);
const [events, setEvents] = useState([]);

// Use optional chaining
worker?.skills_json?.includes('Bartender')
```

### **Database**
```sql
-- Use plural table names
CREATE TABLE events (...);

-- Use singular foreign keys
venue_id INTEGER REFERENCES venues(id)

-- Use _utc suffix for timestamps
created_at_utc TIMESTAMPTZ NOT NULL

-- Use descriptive column names
assigned_by_id  -- instead of user_id
```

---

## 🔄 DATA MIGRATION PATTERNS

### **Safe Schema Changes**
```ruby
# Adding columns (safe)
add_column :workers, :default_hourly_rate, :decimal, precision: 10, scale: 2

# Renaming columns (requires code changes)
rename_column :events, :job_id, :event_id

# Removing columns (dangerous)
# 1. Deploy code that doesn't use column
# 2. Wait for deployment
# 3. Deploy migration that removes column
remove_column :shifts, :old_field_name

# Adding indexes (safe, but can be slow)
add_index :assignments, [:worker_id, :shift_id], unique: true, algorithm: :concurrently
```

### **Data Migrations**
```ruby
# Backfill data safely
class BackfillWorkerSkills < ActiveRecord::Migration[7.2]
  def up
    Worker.find_each do |worker|
      worker.update_column(:skills_text, worker.skills_json.join(' '))
    end
  end
  
  def down
    # No-op
  end
end
```

---

## 📖 USEFUL QUERIES

### **Event Statistics**
```ruby
# Dashboard stats
{
  draft_jobs: Event.draft.count,
  published_jobs: Event.published.count,
  completed_jobs: Event.completed.count,
  total_workers: Worker.active.count,
  gaps_to_fill: Event.published.sum { |e| e.unfilled_roles_count }
}
```

### **Worker Availability**
```ruby
# Find available workers for a time slot
available_workers = Worker.active
  .where("skills_json @> ?", ['Bartender'].to_json)
  .where.not(
    id: Assignment.joins(:shift)
      .where('shifts.start_time_utc < ? AND shifts.end_time_utc > ?',
             new_shift.end_time_utc, new_shift.start_time_utc)
      .select(:worker_id)
  )
```

### **Staffing Progress**
```ruby
# Event staffing percentage
event.shifts.count > 0 ? 
  (event.assignments.count.to_f / event.shifts.count * 100).round : 0
```

### **Timesheet Data**
```ruby
# Completed assignments in date range
Assignment.includes(shift: [:event], worker: [])
  .joins(:shift)
  .where(status: 'completed')
  .where('shifts.start_time_utc BETWEEN ? AND ?', start_date, end_date)
  .order('shifts.start_time_utc ASC')
```

---

## 🎓 LEARNING RESOURCES

### **Rails 7**
- [Rails Guides](https://guides.rubyonrails.org/)
- [API-only Applications](https://guides.rubyonrails.org/api_app.html)
- [Active Record Querying](https://guides.rubyonrails.org/active_record_querying.html)

### **React + TypeScript**
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router v6](https://reactrouter.com/)

### **PostgreSQL**
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JSONB Operators](https://www.postgresql.org/docs/current/functions-json.html)
- [Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

---

## 📞 SUPPORT & TROUBLESHOOTING

### **Common Errors**

#### **"Can't connect to database"**
```bash
# Check PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Check database exists
psql -l | grep social_catering

# Create database if missing
rails db:create
```

#### **"Unauthorized" API error**
```bash
# Check cookies are being sent
curl -c cookies.txt -b cookies.txt ...

# Check session is valid
rails console
Session.last  # Check if session exists
```

#### **"CORS error" in browser**
```ruby
# Check CORS configuration
# config/initializers/cors.rb
origins ENV.fetch('FRONTEND_URL', 'http://localhost:5173')
```

#### **"Migrations pending"**
```bash
# Run pending migrations
rails db:migrate

# Check migration status
rails db:migrate:status
```

---

## 🎉 SUCCESS METRICS

### **MVP Launch Criteria**
- [ ] All CRUD operations work
- [ ] Event lifecycle works (draft → published → completed)
- [ ] Worker assignment works (single + bulk)
- [ ] Conflict detection prevents double-booking
- [ ] CSV exports match sample format exactly
- [ ] Dashboard shows accurate stats
- [ ] Mobile responsive
- [ ] Deployed to Heroku staging
- [ ] Seeded with realistic data
- [ ] No critical bugs

### **Production Readiness**
- [ ] All MVP criteria met
- [ ] Automated tests passing
- [ ] Performance acceptable (< 500ms API response)
- [ ] Security audit passed
- [ ] Daily backups configured
- [ ] Monitoring/alerting set up
- [ ] Documentation complete
- [ ] User training completed

---

## 📝 CHANGE LOG

### **January 2025**
- ✅ Merged Staffing page into Events page
- ✅ Implemented bulk worker scheduling
- ✅ Added comprehensive seed data for Tallahassee
- ✅ Fixed CSV export headers
- ✅ Removed Job/Staffing aliases
- ✅ Updated all documentation
- 🔄 Testing CSV export format
- 🔄 Verifying conflict detection
- 🔄 Preparing for Heroku staging deployment

---

## 🚀 NEXT STEPS

### **Immediate (This Week)**
1. Complete Phase 0 cleanup
2. Run comprehensive seed data
3. Test all API endpoints via terminal
4. Verify database schema alignment
5. Fix CSV export format

### **Short Term (Next 2 Weeks)**
1. Complete page-by-page audit
2. Fix all high-priority issues
3. Polish UX (loading, errors, empty states)
4. Deploy to Heroku staging
5. User acceptance testing

### **Medium Term (Next Month)**
1. Set up daily backups
2. Create production environment
3. Add automated tests
4. Performance optimization
5. Mobile optimization

---

**END OF IMPLEMENTATION CONTEXT**