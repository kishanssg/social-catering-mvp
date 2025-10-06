```markdown
# Implementation Context

**Last Updated:** Day 1 - Initial Setup Phase
**Current Phase:** Foundation & Database Schema
**Next Milestone:** Milestone 1 (End of Day 9) - Backend + Basic UI

---

## Project Status

### ✅ Completed

**Day 1 Progress:**
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

### 🚧 In Progress

**Current Task:** Database schema creation and model setup

**What's being worked on:**
- Setting up core models (User, Worker, Shift, Assignment, etc.)
- Adding indexes and constraints
- Configuring Devise for authentication

### ⏳ Not Started

- Service objects for business logic
- Controllers and API endpoints
- React frontend
- Conflict detection logic
- Activity logging
- Search implementation
- Deployment to Heroku staging

---

## Database State

### Migrations Status
```bash
# Check current state:
rails db:migrate:status

# Expected after Step 9:
# - devise_create_users
# - create_workers
# - create_certifications
# - create_worker_certifications
# - create_shifts
# - create_assignments
# - create_activity_logs
```

### Current Schema
**Completed tables:** None yet (migrations pending)

**Expected tables after next steps:**
- users (Devise + role column)
- workers (with tsvector for search)
- certifications
- worker_certifications
- shifts
- assignments
- activity_logs

### Seed Data Status
**Seeded:** None yet

**Will seed:**
- 3 admin users (Natalie, Madison, Sarah)
- 5 sample workers
- 3 certifications (ServSafe, TIPS, Food Handler)

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

## Next Steps (Immediate)

### Step 2: Configure Database for UTC ⏭️
Update `config/database.yml` to set timezone to UTC

### Step 3: Add Required Gems ⏭️
Add devise, sentry-ruby, sentry-rails, bullet, pry-rails

### Step 4: Install Devise ⏭️
Generate User model with role column

### Steps 5-8: Generate All Models ⏭️
Create 6 models with proper indexes and constraints:
- Worker (with tsvector)
- Certification
- WorkerCertification
- Shift (with CHECK constraints)
- Assignment (with unique constraint)
- ActivityLog

### Step 9: Run Migrations ⏭️
Apply all migrations and verify schema

### Step 10: Add Model Associations ⏭️
Set up belongs_to, has_many, validations, callbacks

### Steps 11-13: Seeds, Health Check, Deploy ⏭️
Create seed data, health endpoint, deploy to Heroku staging

---

## File Structure

### Created
```
social-catering-mvp/
├── .cursorrules                    ✅ Created
├── app/
│   ├── assets/
│   │   └── tailwind/
│   │       └── application.css     ✅ Created (Tailwind v4)
│   └── ...
├── config/
│   ├── database.yml                ✅ Exists (needs UTC config)
│   └── ...
└── Gemfile                         ✅ Exists (needs gems)
```

### To Create
```
app/
├── controllers/
│   ├── api/v1/                     ⏳ Not created
│   └── health_controller.rb        ⏳ Not created
├── models/
│   ├── concerns/
│   │   └── auditable.rb            ⏳ Not created
│   ├── user.rb                     ⏳ Pending Devise install
│   ├── worker.rb                   ⏳ Not created
│   └── ...
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
*No deploys yet*

### Production Deploys
*Production not set up yet*

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