```markdown
# Implementation Context

**Last Updated:** Day 1 - COMPLETED ✅
**Current Phase:** Day 2 - Service Objects & API Development
**Next Milestone:** Milestone 1 (End of Day 9) - Backend + Basic UI

---

## Project Status

### ✅ Completed

**Day 1 - COMPLETE:**
- [x] Rails 7 app created (`social-catering-mvp`)
- [x] PostgreSQL configured as database
- [x] Tailwind CSS v4 installed and working
- [x] Git repository initialized
- [x] `.cursorrules` documented
- [x] Heroku account access granted (GravyWork's account)
- [x] Two Heroku apps created:
  - `sc-mvp-staging` (staging environment)
  - `sc-mvp-prod` (production environment)
- [x] Postgres add-on provisioned on both Heroku apps (Mini plan)
- [x] **Database configured for UTC timezone**
- [x] **Required gems added** (devise, sentry, bullet, pry-rails)
- [x] **Devise installed with User model** (role column added)
- [x] **All 7 models generated** with proper constraints and indexes:
  - User (Devise + role)
  - Worker (with tsvector for search)
  - Certification
  - WorkerCertification
  - Shift (with CHECK constraints)
  - Assignment (with unique constraints)
  - ActivityLog (audit trail)
- [x] **All migrations run successfully**
- [x] **Model associations and validations added**
- [x] **Seed data loaded** (3 admins, 5 workers, 3 certifications)
- [x] **Health check endpoint created** (`/healthz`)
- [x] **Deployed to Heroku staging** - LIVE and working!

### 🚧 In Progress

**Current Task:** Day 2 - Service Objects & API Development

**What's being worked on:**
- Service objects for business logic
- API controllers and endpoints
- Conflict detection implementation

### ⏳ Not Started

- React frontend
- Activity logging implementation
- Search implementation
- Advanced conflict detection

---

## Database State

### Migrations Status
```bash
# All migrations completed successfully:
rails db:migrate:status
# All 7 migrations show 'up' status
```

### Current Schema
**✅ All 7 tables created and working:**
- users (Devise + role column)
- workers (with tsvector for search)
- certifications
- worker_certifications
- shifts
- assignments
- activity_logs

### Seed Data Status
**✅ Seeded successfully:**
- 3 admin users (Natalie, Madison, Sarah)
- 5 sample workers
- 3 certifications (ServSafe, TIPS, Food Handler)
- 3 worker certifications (linking workers to certs)

**Verification:**
- User.count == 3 ✅
- Worker.count == 5 ✅
- Certification.count == 3 ✅
- WorkerCertification.count == 3 ✅

---

## Key Decisions Made

### Architecture Decisions
1. **Database:** PostgreSQL (NOT MySQL - switched from original proposal)
2. **Hosting:** Heroku with GravyWork's account
3. **Search:** PostgreSQL tsvector for full-text search (≥3 chars), ILIKE fallback (<3 chars)
4. **Concurrency:** PostgreSQL advisory locks for race condition prevention
5. **Soft deletes:** Workers use `active: false`, not hard delete
6. **Timestamps:** All datetime columns named `*_utc`, stored as TIMESTAMPTZ

### Technical Decisions
1. **Auth:** Devise (email/password only, no SSO)
2. **API:** RESTful JSON API
3. **Frontend:** React 18 + TypeScript (separate from Rails views)
4. **CSS:** Tailwind CSS v4 (CSS-based config, not JS config file)
5. **Testing:** Minitest (Rails default)
6. **Monitoring:** Sentry for errors, /healthz for health checks

### Business Rules Locked In
1. **3 hard conflict rules:**
   - Time overlap per worker
   - Capacity not exceeded
   - Certification valid through shift end
2. **Admin-only access** (no worker-facing UI in MVP)
3. **Status workflows:**
   - Shifts: draft → published → assigned → completed
   - Assignments: assigned → completed | no_show | cancelled
4. **Audit logging:** All data changes must create ActivityLog entry

---

## Pending Requirements

### From Client (Alex/GravyWork)
- [ ] Sample spreadsheet showing current worker/shift structure
- [ ] SMTP credentials for password reset emails
- [ ] Logo and brand colors (optional)
- [ ] HR contact for offer letter

### Technical Setup Needed
- [ ] Sentry DSN for error tracking
- [ ] Configure Devise mailer settings
- [ ] Set up staging seed data (30 workers, 100 shifts)

---

## Environment Configuration

### Local Development
```bash
# Database
DATABASE_URL=postgresql://localhost/social_catering_mvp_development

# Not needed locally (development mode handles these)
# SECRET_KEY_BASE - auto-generated in dev
# RAILS_MASTER_KEY - from config/master.key
```

### Heroku Staging (sc-mvp-staging)
```bash
# Set these:
heroku config:set RAILS_ENV=production -a sc-mvp-staging
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key) -a sc-mvp-staging
heroku config:set SECRET_KEY_BASE=$(rails secret) -a sc-mvp-staging

# Optional (when available):
heroku config:set SENTRY_DSN=... -a sc-mvp-staging
heroku config:set SMTP_ADDRESS=... -a sc-mvp-staging
```

### Heroku Production (sc-mvp-prod)
**Status:** Not configured yet (will configure after QA phase)

---

## Known Issues & Blockers

### Current Blockers
1. **Sample spreadsheet pending** - Needed to understand exact field structure
2. **SMTP credentials pending** - Password reset won't work until configured

### Technical Debt
*None yet - clean slate*

### Things to Watch
- Heroku dyno limits set by GravyWork (Eco or Basic plan)
- Database connection pool sizing (DB_POOL=10, RAILS_MAX_THREADS=5)
- N+1 queries (use bullet gem to detect)

---

## Next Steps (Day 2)

### Day 2 Focus: Service Objects & API Development

### Step 1: Create Service Objects ⏭️
- `AssignWorkerToShift` - Core assignment logic with conflict detection
- `CheckShiftConflicts` - Validate all 3 conflict rules
- `SearchWorkers` - Full-text search implementation
- `CreateShift` - Shift creation with validation

### Step 2: Create API Controllers ⏭️
- `Api::V1::WorkersController` - CRUD for workers
- `Api::V1::ShiftsController` - CRUD for shifts
- `Api::V1::AssignmentsController` - Assignment management
- `Api::V1::SearchController` - Search endpoints

### Step 3: Implement Conflict Detection ⏭️
- Time overlap validation
- Capacity checking
- Certification expiration validation
- Advisory locks for concurrency

### Step 4: Add Activity Logging ⏭️
- `Auditable` concern for all models
- Automatic logging on create/update/delete
- `Current.user` context for actor tracking

---

## File Structure

### Created (Day 1 Complete)
```
social-catering-mvp/
├── .cursorrules                    ✅ Created
├── Procfile                        ✅ Created (Heroku deployment)
├── app/
│   ├── assets/stylesheets/
│   │   └── application.css         ✅ Created (Tailwind v4)
│   ├── controllers/
│   │   └── health_controller.rb    ✅ Created (/healthz endpoint)
│   ├── models/
│   │   ├── user.rb                 ✅ Created (Devise + role)
│   │   ├── worker.rb               ✅ Created (with tsvector)
│   │   ├── certification.rb        ✅ Created
│   │   ├── worker_certification.rb ✅ Created
│   │   ├── shift.rb                ✅ Created (with CHECK constraints)
│   │   ├── assignment.rb           ✅ Created (with unique constraints)
│   │   └── activity_log.rb         ✅ Created (audit trail)
│   └── views/
│       └── home/
│           └── index.html.erb      ✅ Created (test page)
├── config/
│   ├── database.yml                ✅ Updated (UTC timezone)
│   ├── routes.rb                   ✅ Updated (devise, healthz, root)
│   └── puma.rb                     ✅ Updated (Heroku config)
├── db/
│   ├── migrate/                    ✅ 7 migration files created
│   └── seeds.rb                    ✅ Created (3 admins, 5 workers, 3 certs)
└── Gemfile                         ✅ Updated (devise, sentry, bullet, pry)
```

### To Create (Day 2)
```
app/
├── controllers/
│   └── api/v1/                     ⏳ Not created
├── models/
│   └── concerns/
│       └── auditable.rb            ⏳ Not created
├── services/                       ⏳ Not created
└── validators/                     ⏳ Not created
```

---

## Testing Strategy

### Test Coverage Goals
- [ ] Model validations and associations
- [ ] Conflict detection (all 3 rules)
- [ ] Concurrent assignment scenarios
- [ ] Search with various query lengths
- [ ] Activity logging on CRUD operations
- [ ] Service objects (when created)

### Test Data Needs
- Factories for all models (or fixtures)
- Test scenarios for overlapping shifts
- Test scenarios for capacity limits
- Test scenarios for expired certifications

---

## Performance Considerations

### Indexes Added
*Will track as migrations are created*

### Queries to Optimize
*Will track slow queries as they're discovered*

### N+1 Prevention
- Use bullet gem in development
- Eager load with `includes()` where needed
- Document joins needed for common queries

---

## Deployment History

### Staging Deploys
**✅ Day 1 Deploy (Oct 6, 2025):**
- URL: https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/
- Status: LIVE and working
- Health check: `/healthz` returns 200 OK
- Database: All tables created, seed data loaded
- Environment: Production mode with proper env vars

### Production Deploys
*Production not set up yet (will configure after QA phase)*

---

## Communication Log

### Oct 6, 2025
- Alex approved Heroku + Postgres setup
- Rav confirmed sandbox approach with dyno limits
- Robert (Bobby) confirmed as point of contact for blockers
- Waiting on sample spreadsheet from client

---

## Notes for Cursor

### When Generating Code
- Check this file first to see what's already done
- Don't regenerate existing models/migrations
- Follow the step-by-step plan in "Next Steps"
- Update this file after completing each major task

### Current Context
- We're on Day 1 of 21-day timeline
- Foundation phase: setting up models and database
- No business logic implemented yet
- No API endpoints created yet
- Frontend not started yet

### Remember
- PostgreSQL NOT MySQL (advisory locks use `pg_advisory_lock`)
- All timestamps must be named `*_utc`
- Use CHECK constraints, not Rails enums
- Soft delete workers with history
- Activity logging on all data changes
```