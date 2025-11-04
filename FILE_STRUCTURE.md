# Social Catering MVP - Professional File Structure

**Last Updated:** November 2025  
**Purpose:** Clean, professional structure optimized for client handoff

---

## 📁 Root Directory

### Essential Documentation (Client Entry Points)
- `README.md` - **⭐ Main project overview (CLIENT READS THIS FIRST)**
- `LICENSE` - License file (if applicable)
- `.gitignore` - Git ignore rules
- `Gemfile` / `Gemfile.lock` - Ruby dependencies
- `package.json` / `package-lock.json` - Node.js dependencies
- `Rakefile` - Ruby tasks
- `config.ru` - Rack application
- `Procfile` - Heroku production processes
- `Procfile.dev` - Development processes
- `deploy.sh` - **🚀 MAIN DEPLOYMENT SCRIPT (Important for client!)**

### Favicon & Assets (Root - Served by Rails)
- `favicon.ico`, `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`, `android-chrome-512x512.png`

---

## 📁 `/.ai` - AI Configuration & Migration Plans

**PURPOSE**: Separate AI-specific files so they don't confuse the client

```
/.ai
├── README.md                          # "AI Configuration - For Development Only"
├── .cursorrules                       # Cursor AI rules
├── migrate.md                         # Migration plan (development artifact)
├── CURSOR_INSTRUCTIONS.md             # Cursor execution instructions
└── prompts/                           # AI prompt templates (optional)
```

**Note for Client/Operations Team**: You can safely ignore this directory. These files were used during development with AI coding assistants.

---

## 📁 `/docs` - All Documentation (Client Reference)

### Primary Handoff Documents (⭐ CRITICAL)
```
/docs
├── README.md                          # Documentation index/overview
├── RUNBOOK.md                         # ⭐ Operations manual (CRITICAL)
├── ENV_CONFIG.md                      # ⭐ Environment variables (CRITICAL)
├── API_DOCUMENTATION.md               # ⭐ API reference (CRITICAL)
├── USER_GUIDE.md                      # ⭐ End-user instructions (CRITICAL)
├── DEPLOYMENT.md                      # Deployment procedures
├── TROUBLESHOOTING.md                 # Common issues & solutions
├── ARCHITECTURE.md                    # System architecture
└── CHANGELOG.md                       # Version history
```

### Technical Documentation (Subdirectory)
```
/docs/technical
├── API.md                             # Additional API documentation
├── Heroku_Deployment.md               # Heroku-specific deployment
├── upgrade.md                         # Upgrade guide
├── database-schema.md                 # Database documentation
├── production_architecture.md         # Architecture details
├── project_config.md                  # Project configuration
├── workflow_state.md                  # Workflow documentation
├── frontend_integration_strategy.md   # Frontend integration
├── google_places_setup.md            # Google Places setup
├── implementation_context.md         # Implementation context
└── tests.md                          # Testing documentation
```

### Archive (Keep History, Not in Main View)
```
/docs/archive
├── staging-handout.md
├── API_README_staging-handout.md
└── [23+ archived markdown files]      # Old documentation versions
```

---

## 📁 `/scripts` - Utility Scripts

### Production Scripts (⭐ CLIENT USES THESE)
```
/scripts
├── README.md                          # Script documentation
├── deploy-heroku.sh                   # 🚀 Heroku deployment automation
├── backup-database.sh                 # Database backup script (if exists)
├── restore-database.sh                 # Database restore script (if exists)
├── verify-production.sh               # Production verification (if exists)
└── seed-staging.sh                    # Staging data seeding (if exists)
```

### Development Scripts (Subdirectory)
```
/scripts/dev
├── audit-api-paths.ts                 # API path auditing
├── smoke-endpoints.ts                 # Endpoint testing
├── generate-routes.ts                 # Route generation
├── probe-session.ts                   # Session testing
├── audit_schedule.sh                  # Schedule auditing
├── conflicts.sh                       # Conflict checking
├── conflict_proof.sh                  # Conflict verification
├── m1_smoke.sh                        # M1 smoke tests
├── perf.sh                            # Performance tests
├── proof_m1.sh                        # M1 proof
├── proof_m1_verbose.sh                # M1 verbose proof
├── simple_proof.sh                    # Simple proof
├── secops.sh                          # Security operations
└── verify_m1_complete.sh              # M1 verification
```

### Database Scripts
```
/scripts/database
├── test_certification_flow.rb         # Certification flow testing
└── verify_certifications.rb          # Certification verification
```

---

## 📁 Backend (Rails 7.2)

### `app/` - Application Code

#### `app/controllers/`
- `application_controller.rb` - Base controller
- `health_controller.rb` - Health check endpoint
- `home_controller.rb` - Home page controller
- `api/v1/base_controller.rb` - API base controller
- `api/v1/activity_logs_controller.rb` - Activity logs API
- `api/v1/assignments_controller.rb` - Assignments API
- `api/v1/certifications_controller.rb` - Certifications API
- `api/v1/dashboard_controller.rb` - Dashboard API
- `api/v1/event_skill_requirements_controller.rb` - Event skill requirements API
- `api/v1/events_controller.rb` - Events API
- `api/v1/exports_controller.rb` - Export API
- `api/v1/locations_controller.rb` - Locations API
- `api/v1/reports/timesheets_controller.rb` - Timesheet reports API
- `api/v1/reports_controller.rb` - Reports API
- `api/v1/sessions_controller.rb` - Authentication API
- `api/v1/shifts_controller.rb` - Shifts API
- `api/v1/skills_controller.rb` - Skills API
- `api/v1/staffing_controller.rb` - Staffing API
- `api/v1/venues_controller.rb` - Venues API
- `api/v1/workers_controller.rb` - Workers API

#### `app/models/`
- `application_record.rb` - Base model
- `activity_log.rb` - Activity logging model
- `assignment.rb` - Worker-shift assignments
- `certification.rb` - Certification types
- `current.rb` - Current user context
- `event.rb` - Events (jobs)
- `event_schedule.rb` - Event schedules
- `event_skill_requirement.rb` - Event skill requirements
- `location.rb` - Locations
- `shift.rb` - Shifts
- `skill.rb` - Skills
- `user.rb` - Users (Devise)
- `venue.rb` - Venues
- `worker.rb` - Workers
- `worker_certification.rb` - Worker certifications
- `concerns/auditable.rb` - Audit logging concern

#### `app/services/`
- `application_service.rb` - Base service
- `assign_worker_to_shift.rb` - Assign worker to shift
- `check_conflicts.rb` - Conflict checking
- `check_shift_conflicts.rb` - Shift conflict checking
- `create_shift.rb` - Shift creation
- `create_worker.rb` - Worker creation
- `event_creation_service.rb` - Event creation
- `event_publishing_service.rb` - Event publishing
- `events/apply_role_diff.rb` - Event role diff application
- `google_places_service.rb` - Google Places API integration
- `publish_shift.rb` - Shift publishing
- `search_workers.rb` - Worker search
- `shift_assignment_service.rb` - Shift assignment service
- `unassign_worker_from_shift.rb` - Unassign worker
- `update_shift.rb` - Shift updates
- `update_worker.rb` - Worker updates

#### `app/presenters/`
- `activity_log_presenter.rb` - Activity log presentation

#### `app/views/`
- `home/index.html.erb` - Home page view
- `layouts/application.html.erb` - Main layout
- `layouts/mailer.html.erb` / `mailer.text.erb` - Email layouts
- `pwa/manifest.json.erb` - PWA manifest
- `pwa/service-worker.js` - Service worker

#### `app/assets/`
- `stylesheets/application.css`
- `tailwind/application.css`
- `images/` - Image assets

#### `app/helpers/`
- `application_helper.rb` - Application helpers
- `home_helper.rb` - Home page helpers

#### `app/jobs/`
- `application_job.rb` - Base job class

#### `app/mailers/`
- `application_mailer.rb` - Base mailer

### `config/` - Configuration

#### Core Config
- `application.rb` - Application configuration
- `boot.rb` - Boot configuration
- `environment.rb` - Environment setup
- `routes.rb` - **⭐ Route definitions (important!)**
- `database.yml` - Database configuration
- `puma.rb` - Puma server configuration
- `credentials.yml.enc` - **⭐ Encrypted credentials**
- `master.key` - Credentials key (gitignored)

#### Environment Configs
- `environments/development.rb`
- `environments/production.rb`
- `environments/test.rb`

#### Initializers
- `initializers/assets.rb` - Asset pipeline
- `initializers/content_security_policy.rb` - CSP
- `initializers/cors.rb` - CORS configuration
- `initializers/devise.rb` - Devise authentication
- `initializers/filter_parameter_logging.rb` - Log filtering
- `initializers/inflections.rb` - Inflections
- `initializers/session_store.rb` - Session store

#### Other Config
- `cable.yml` - Action Cable
- `cache.yml` - Cache configuration
- `storage.yml` - Active Storage
- `queue.yml` - Job queue
- `recurring.yml` - Recurring jobs
- `deploy.yml` - Kamal deployment (if using)
- `locales/en.yml` - English translations
- `locales/devise.en.yml` - Devise translations

### `db/` - Database

#### Schema & Seeds
- `schema.rb` - **⭐ Current database schema**
- `seeds.rb` - Production seed data
- `seeds_staging.rb` - Staging seed data
- `cable_schema.rb` - Action Cable schema
- `cache_schema.rb` - Cache schema
- `queue_schema.rb` - Queue schema

#### Migrations (40 migrations)
- User authentication (Devise)
- Workers, Certifications, Worker Certifications
- Shifts, Assignments, Activity Logs
- Events (formerly Jobs), Event Schedules, Event Skill Requirements
- Skills, Locations, Venues
- Pay rates, performance indexes, constraints
- Active Storage tables

**Note**: Database scripts moved to `/scripts/database/`

### `lib/tasks/` - Rake Tasks
- `audit_schedule.rake` - Schedule audit task
- `backfill_activity_logs.rake` - Activity log backfill
- `export_routes.rake` - Route export
- `frontend.rake` - Frontend build tasks
- `normalize_certifications.rake` - Certification normalization
- `phone_normalize.rake` - Phone normalization
- `quick_fix.rake` - Quick fixes

### `test/` - Tests (Minitest)
- `test_helper.rb` - Test configuration
- `application_system_test_case.rb` - System test base
- `controllers/` - Controller tests
- `models/` - Model tests
- `services/` - Service tests
- `system/` - System tests
- `integration/` - Integration tests
- `fixtures/` - Test fixtures

### `spec/` - RSpec Tests
- `spec_helper.rb` / `rails_helper.rb` - RSpec configuration
- `models/` - Model specs
- `services/` - Service specs
- `requests/` - Request specs
- `system/` - System specs
- `factories/` - Factory definitions
- `performance/` - Performance tests
- `edge_cases/` - Edge case tests

### `bin/` - Executables
- `rails` - Rails CLI
- `rake` - Rake CLI
- `setup` - Setup script
- `dev` - Development server
- `brakeman` - Security scanner
- `rubocop` - Linter
- `kamal` - Deployment tool
- `docker-entrypoint` - Docker entrypoint

---

## 📁 Frontend (React 18 + TypeScript + Vite)

### `social-catering-ui/` - Frontend Application

#### Configuration
- `README.md` - Frontend-specific README
- `package.json` / `package-lock.json` - Dependencies
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` - TypeScript config
- `vite.config.ts` - Vite configuration
- `vite.config.rails.ts` - Rails-specific Vite config
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `eslint.config.js` - ESLint configuration
- `jest.config.js` - Jest configuration
- `playwright.config.ts` - Playwright E2E config
- `index.html` - Development HTML entry

#### Source Code `src/`

##### Core Files
- `main.tsx` - Application entry point
- `App.tsx` - Main App component
- `ErrorBoundary.tsx` - Error boundary
- `index.css` - Global styles
- `vite-env.d.ts` - Vite type definitions
- `setupTests.ts` - Test setup

##### `src/api/` - API Client
- `client.ts` - Axios client configuration
- `routes.ts` - API route definitions

##### `src/components/` - Reusable Components
- Common components (Modal, Toast, LoadingSpinner, Avatar, etc.)
- Form components
- UI components

##### `src/pages/` - Page Components
- `DashboardPage.tsx` - Dashboard
- `WorkersPage.tsx` - Workers list
- `WorkerCreatePage.tsx` - Worker create/edit
- `WorkerDetailPage.tsx` - Worker detail
- `EventsPage.tsx` - Events list
- `EventDetailPage.tsx` - Event detail
- `CreateEventWizard.tsx` - Event creation wizard
- `ReportsPage.tsx` - Reports
- `TimesheetPage.tsx` - Timesheet
- `ActivityLogPage.tsx` - Activity log
- `LoginPage.tsx` - Login

##### `src/contexts/` - React Contexts
- `AuthContext.tsx` - Authentication context

##### `src/layouts/` - Layout Components
- `AppLayout.tsx` - Main application layout

##### `src/lib/` - Libraries
- `api.ts` - API client exports

##### `src/types/` - TypeScript Types
- Type definitions for entities

##### `src/services/` - Services
- Business logic services

##### `src/utils/` - Utilities
- Helper functions

##### `src/hooks/` - Custom Hooks
- React hooks

##### `src/assets/` - Static Assets
- Images, icons, etc.

##### `src/config/` - Configuration
- App configuration

#### Build Output
- `dist/` - Vite build output (copied to `public/`)
- `public/` - Public assets

#### E2E Tests `e2e/`
- `auth.spec.ts` - Authentication tests
- `dashboard.spec.ts` - Dashboard tests
- `utils.ts` - Test utilities

---

## 📁 Public Assets

### `public/` - Served Assets
- `index.html` - Main HTML file
- `assets/` - Compiled frontend assets (JS, CSS, images)
- Favicon files
- `site.webmanifest` - PWA manifest

---

## 📁 Test Reports & Documentation

### `test-reports/` - Test Documentation & Reports
- `README.md` - Test documentation index
- `verification-reports/` - Verification documents
- `smoke-tests/` - Smoke test results
- `performance/` - Performance test results

**Note**: Renamed from `/tests/` for clarity

---

## 📁 Other Directories (Standard Rails/Node)

- `tmp/` - Temporary files (gitignored)
- `log/` - Application logs (gitignored)
- `storage/` - Active Storage files
- `vendor/` - Vendor dependencies
- `node_modules/` - Node.js dependencies (gitignored)

---

## 📊 File Organization Summary

### Key Improvements for Client Handoff

#### 1. **Clear Separation of Concerns**
- ✅ AI files isolated in `/.ai` (won't confuse client)
- ✅ All client docs in `/docs` with clear categorization
- ✅ All scripts in `/scripts` organized by purpose

#### 2. **Obvious Entry Points**
- ✅ `README.md` at root (first thing they see)
- ✅ `deploy.sh` at root (clear deployment entry point)
- ✅ `/docs/RUNBOOK.md` (operations manual)

#### 3. **Removed Clutter**
- ✅ Old test files deleted from `docs/old-tests/`
- ✅ Duplicate favicons removed from root (kept only in `/public`)
- ✅ Archived docs moved to `/docs/archive`

#### 4. **Professional Organization**
- ✅ Standard Rails structure maintained
- ✅ Scripts organized: production → dev → database
- ✅ Documentation indexed and categorized
- ✅ Test reports separated from source code

#### 5. **Deployment Clarity**
- ✅ `deploy.sh` in root (main script)
- ✅ `/scripts/deploy-heroku.sh` (automation)
- ✅ `/docs/DEPLOYMENT.md` (full guide)

---

## 🔑 Key Files to Know

### Most Important for Operations Team
1. **`README.md`** (root) - Project overview
2. **`deploy.sh`** (root) - Main deployment script
3. **`docs/RUNBOOK.md`** - Operations manual
4. **`docs/API_DOCUMENTATION.md`** - API reference
5. **`docs/ENV_CONFIG.md`** - Environment configuration
6. **`docs/USER_GUIDE.md`** - End-user instructions

### For Developers
1. `config/routes.rb` - API routes
2. `db/schema.rb` - Database structure
3. `app/models/` - Business logic models
4. `app/controllers/api/v1/` - API endpoints
5. `social-catering-ui/src/App.tsx` - Frontend entry

### For Deployment
- `Procfile` - Heroku processes
- `scripts/deploy-heroku.sh` - Deployment automation
- `config/deploy.yml` - Kamal deployment config (if using)

---

## 📋 Directory Quick Reference

```
social-catering-mvp/
│
├── README.md                          # ⭐ START HERE
├── deploy.sh                          # ⭐ MAIN DEPLOYMENT SCRIPT
├── Gemfile, package.json, etc.        # Dependencies
├── Procfile                           # Heroku config
│
├── .ai/                               # AI tools (ignore for operations)
│   ├── .cursorrules
│   ├── migrate.md
│   └── CURSOR_INSTRUCTIONS.md
│
├── docs/                              # ⭐ CLIENT DOCUMENTATION
│   ├── RUNBOOK.md                     # ⭐ Operations manual
│   ├── ENV_CONFIG.md                  # ⭐ Environment setup
│   ├── API_DOCUMENTATION.md           # ⭐ API reference
│   ├── USER_GUIDE.md                  # ⭐ User guide
│   ├── technical/                     # Technical docs
│   └── archive/                       # Old versions
│
├── scripts/                           # ⭐ OPERATIONAL SCRIPTS
│   ├── deploy-heroku.sh               # ⭐ Deployment
│   ├── dev/                           # Development scripts
│   └── database/                      # Database scripts
│
├── app/                               # Rails backend
├── config/                            # Configuration
├── db/                                # Database
├── lib/                               # Libraries
├── test/                              # Minitest tests
├── spec/                              # RSpec tests
│
├── social-catering-ui/                # React frontend
│   ├── src/                           # Source code
│   ├── e2e/                           # E2E tests
│   └── public/                        # Public assets
│
├── public/                            # Rails public assets
├── bin/                               # Executables
└── test-reports/                      # Test documentation
```

---

## 📝 File Count Summary

- **Backend Ruby Files**: ~80+ files
- **Frontend TypeScript/React Files**: ~100+ files
- **Database Migrations**: 40 migrations
- **Documentation Files**: 50+ markdown files
- **Configuration Files**: 30+ config files
- **Test Files**: 40+ test files
- **Scripts**: 15+ utility scripts

**Total Project Size**: ~473 source files (excluding dependencies)
