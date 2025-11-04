# Social Catering MVP

**Project:** Social Catering Workforce Management System  
**Repository:** kishanssg/social-catering-mvp  
**Status:** Production Ready (Milestones 1, 2, 3 Complete)  
**Production URL:** https://sc-mvp-production-6b7a268cc8ad.herokuapp.com  
**Staging URL:** https://sc-mvp-staging.herokuapp.com

---

## 📋 Project Overview

Social Catering MVP is a comprehensive workforce scheduling and management system designed for catering companies. The application enables administrators to manage events, assign workers to shifts based on skills and certifications, track hours, and generate payroll reports.

### Core Purpose
- **Event Management**: Create and manage catering events with specific skill requirements
- **Worker Assignment**: Assign workers to shifts with conflict detection (time overlap, capacity, certification expiry)
- **Scheduling**: Bulk scheduling capabilities for efficient workforce management
- **Reporting**: Generate timesheets, payroll summaries, and event reports
- **Activity Logging**: Complete audit trail of all system actions

### Milestone Status
- ✅ **Milestone 1**: Backend API with Workers, Shifts, Assignments CRUD + conflict checks
- ✅ **Milestone 2**: Frontend React SPA with dashboard, search, and assignment workflows
- ✅ **Milestone 3**: Production deployment with automated daily backups

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Ruby on Rails 7.2.2
- **Database:** PostgreSQL 14+ (Standard-0 on Heroku)
- **Authentication:** Devise (session-based)
- **API Format:** JSON REST API
- **Background Jobs:** SolidQueue
- **Web Server:** Puma

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 7.1.7
- **Router:** React Router 7.9.3
- **Styling:** Tailwind CSS v4
- **HTTP Client:** Axios
- **Form Validation:** React Hook Form + Zod
- **Date Handling:** date-fns

### Hosting
- **Platform:** Heroku
- **Database:** Heroku Postgres (Standard-0 for automated backups)
- **Static Assets:** Served from Rails `public/` directory

---

## 📁 Repository Structure

```
social-catering-mvp/
├── app/                              # Rails backend
│   ├── controllers/
│   │   └── api/v1/                   # API v1 endpoints
│   │       ├── base_controller.rb    # Base API controller with auth
│   │       ├── workers_controller.rb
│   │       ├── events_controller.rb
│   │       ├── shifts_controller.rb
│   │       ├── assignments_controller.rb
│   │       ├── staffing_controller.rb # Bulk assignment operations
│   │       ├── reports_controller.rb
│   │       ├── activity_logs_controller.rb
│   │       └── certifications_controller.rb
│   ├── models/                       # ActiveRecord models
│   │   ├── worker.rb
│   │   ├── event.rb
│   │   ├── shift.rb
│   │   ├── assignment.rb
│   │   ├── certification.rb
│   │   ├── worker_certification.rb
│   │   └── activity_log.rb
│   ├── services/                     # Business logic services
│   │   ├── assign_worker_to_shift.rb
│   │   └── events/apply_role_diff.rb
│   └── concerns/
│       └── auditable.rb              # Activity logging concern
├── config/
│   ├── routes.rb                     # API routes
│   ├── database.yml                  # Database configuration
│   └── initializers/
│       ├── cors.rb                   # CORS configuration
│       └── devise.rb                 # Authentication config
├── db/
│   ├── schema.rb                     # Database schema
│   └── migrate/                      # Database migrations
├── social-catering-ui/               # React frontend
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/                   # Page components
│   │   ├── lib/                     # API client and utilities
│   │   ├── contexts/                # React Context (Auth)
│   │   └── types/                   # TypeScript types
│   ├── vite.config.ts               # Vite configuration
│   └── package.json
├── scripts/
│   ├── deploy-heroku.sh             # Deployment script
│   ├── audit-api-paths.ts          # API path audit
│   └── smoke-endpoints.ts          # Endpoint smoke tests
├── docs/                            # Documentation
│   ├── README.md                    # This file
│   ├── RUNBOOK.md                   # Operations manual
│   ├── ENV_CONFIG.md                # Environment variables
│   ├── API_DOCUMENTATION.md         # API reference
│   └── USER_GUIDE.md                # End-user instructions
└── Procfile                         # Heroku process definition
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Ruby:** 3.4.5+ (check with `ruby -v`)
- **Node.js:** 18.0.0+ (check with `node -v`)
- **PostgreSQL:** 14+ (check with `psql --version`)
- **Git:** Latest version

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kishanssg/social-catering-mvp.git
   cd social-catering-mvp
   ```

2. **Install Ruby dependencies:**
   ```bash
   bundle install
   ```

3. **Install Node dependencies:**
   ```bash
   cd social-catering-ui
   npm install
   cd ..
   ```

4. **Set up the database:**
   ```bash
   rails db:create
   rails db:migrate
   rails db:seed
   ```

5. **Start the development servers:**
   ```bash
   # Option 1: Use Foreman (recommended)
   ./bin/dev

   # Option 2: Start separately
   # Terminal 1: Rails backend
   rails server -p 3001

   # Terminal 2: Vite frontend
   cd social-catering-ui
   VITE_API_URL=http://localhost:3001/api/v1 npm run dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api/v1

### Test Credentials
- **Email:** `gravyadmin@socialcatering.com`
- **Password:** `gravyadmin@sc_mvp`

Or use admin accounts:
- `natalie@socialcatering.com` / `natalie@sc`
- `madison@socialcatering.com` / `madison@sc`
- `sarah@socialcatering.com` / `sarah@sc`

---

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
rails test

# Run specific test file
rails test test/models/worker_test.rb

# Run with verbose output
rails test --verbose
```

### Frontend Smoke Tests
```bash
# API path audit
npm run audit:api

# Endpoint smoke tests (requires running backend)
npm run test:smoke
```

### Manual Testing Checklist
- [ ] Worker CRUD operations
- [ ] Event creation and publishing
- [ ] Shift assignment with conflict detection
- [ ] Bulk assignment (Quick Fill)
- [ ] Worker search (name/skill/cert)
- [ ] Activity log viewing
- [ ] Report generation (CSV exports)

---

## 📦 Deployment

### Staging Deployment
```bash
APP_NAME=sc-mvp-staging bash scripts/deploy-heroku.sh
```

### Production Deployment
```bash
APP_NAME=sc-mvp-production bash scripts/deploy-heroku.sh
```

The deployment script handles:
- Frontend build with Vite
- Asset syncing to Rails `public/` directory
- Chunk integrity verification
- Database migrations
- Health check verification

See `docs/RUNBOOK.md` for detailed deployment procedures.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│              (React 18 + TypeScript SPA)                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/HTTPS
                         │ (JSON API)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Rails 7.2 API Backend                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Controllers  │→ │   Services    │→ │   Models     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                           │                             │
│                           ▼                             │
│              ┌──────────────────────┐                  │
│              │   PostgreSQL 14+     │                  │
│              │   (Standard-0)       │                  │
│              └──────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions
- **API-only Rails:** No server-side rendering, pure JSON API
- **Pre-built Frontend:** Vite builds React app, assets copied to Rails `public/`
- **Session-based Auth:** Devise sessions with cookies (no JWT)
- **UTC Timezone:** All datetime columns end with `*_utc`, stored as TIMESTAMPTZ
- **Activity Logging:** All write operations logged via `Auditable` concern
- **Conflict Detection:** Database-level constraints + application validations

---

## 📊 Database Schema Highlights

### Core Tables
- **workers** - Worker profiles with skills and certifications
- **events** - Catering events with schedules
- **shifts** - Individual work shifts within events
- **assignments** - Worker-to-shift assignments
- **certifications** - Global certification catalog
- **worker_certifications** - Worker certification records with expiry
- **activity_logs** - Audit trail of all actions

### Key Constraints
- All datetime columns: `*_utc` (TIMESTAMPTZ)
- Foreign keys with explicit `on_delete` policies
- Unique indexes to prevent duplicate assignments
- CHECK constraints for status enums

---

## 🔐 Security

- **CSRF Protection:** Enabled (Rails default)
- **Strong Parameters:** All controllers use strong params
- **Authentication:** Required for all API endpoints (except `/healthz`)
- **SQL Injection:** Parameterized queries only
- **XSS Protection:** React escapes by default
- **HTTPS:** Enforced on Heroku (production)

---

## 📞 Support & Contacts

### Development Team
- **Repository Owner:** @kishanssg
- **Repository:** kishanssg/social-catering-mvp

### Operations Team (GravyWork)
- **Admins:** Natalie, Madison, Sarah
- **Email:** See login credentials above

### Heroku Support
- **Standard Support:** https://help.heroku.com/
- **Critical Issues:** Open ticket via Heroku dashboard

### Documentation
- **API Reference:** `docs/API_DOCUMENTATION.md`
- **Operations Manual:** `docs/RUNBOOK.md`
- **Environment Config:** `docs/ENV_CONFIG.md`
- **User Guide:** `docs/USER_GUIDE.md`

---

## 🐛 Troubleshooting

### Common Issues

**Frontend not connecting to backend:**
- Check `VITE_API_URL` environment variable
- Verify backend is running on correct port
- Check CORS configuration in `config/initializers/cors.rb`

**Database connection errors:**
- Verify PostgreSQL is running: `pg_isready`
- Check `config/database.yml` configuration
- Ensure database exists: `rails db:create`

**Asset loading errors (404 on chunks):**
- Rebuild frontend: `cd social-catering-ui && npm run build`
- Copy assets to Rails: `cp -a social-catering-ui/dist/assets/. public/assets/`
- Verify `public/index.html` references correct chunk files

**Migration errors:**
- Check database version: `rails db:version`
- Review migration files: `ls db/migrate/`
- Run migrations: `rails db:migrate`

---

## 📝 License & Credits

**Project:** Social Catering MVP  
**Client:** GravyWork  
**Status:** Production Ready  
**Last Updated:** November 2025

---

For detailed operational procedures, see `docs/RUNBOOK.md`.  
For API reference, see `docs/API_DOCUMENTATION.md`.  
For end-user instructions, see `docs/USER_GUIDE.md`.

