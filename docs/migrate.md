# 🚀 Production Migration Plan - Social Catering MVP
# Milestone 3: Production Deployment & Automated Backups

**Project**: Social Catering MVP  
**Repository**: kishanssg/social-catering-mvp  
**Current Status**: Milestones 1 & 2 Complete on Staging  
**Staging App**: sc-mvp-staging (Heroku)  
**Production App**: sc-mvp-production (Heroku - to be created)  
**Migration Date**: 2025-11-04  
**Owner**: @kishanssg

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Requirements](#pre-migration-requirements)
3. [Phase 1: Production Environment Setup](#phase-1-production-environment-setup)
4. [Phase 2: Database Migration & Backup Configuration](#phase-2-database-migration--backup-configuration)
5. [Phase 3: Verification & Testing](#phase-3-verification--testing)
6. [Phase 4: Documentation Package](#phase-4-documentation-package)
7. [Phase 5: Final Acceptance Criteria](#phase-5-final-acceptance-criteria)
8. [Rollback Procedures](#rollback-procedures)
9. [Post-Migration Tasks](#post-migration-tasks)

---

## Overview

### Objective
Clone the fully-functional staging environment (sc-mvp-staging) to production (sc-mvp-production) with automated daily database backups to complete Milestone 3 requirements.

### Success Criteria (Milestone 3 Acceptance)
- ✅ Production app deployed on Client's Heroku
- ✅ Daily automated DB backups verified
- ✅ /healthz endpoint returns 200 on production
- ✅ No Sev-1/2 issues
- ✅ Documentation package complete (5 documents)
- ✅ Code transferred to GravyWork's private GitHub repo

### Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                   CURRENT STATE                          │
├─────────────────────────────────────────────────────────┤
│  sc-mvp-staging (Heroku)                                │
│  ├─ PostgreSQL (current plan)                           │
│  ├─ Rails 7 API Backend                                 │
│  ├─ React 18 + TypeScript SPA                           │
│  ├─ Environment: staging                                │
│  └─ Status: ✅ Milestones 1 & 2 Complete                │
└─────────────────────────────────────────────────────────┘
                        │
                        │ MIGRATION
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   TARGET STATE                           │
├─────────────────────────────────────────────────────────┤
│  sc-mvp-production (Heroku)                             │
│  ├─ PostgreSQL Standard-0 (for automated backups)       │
│  ├─ Rails 7 API Backend (same codebase)                 │
│  ├─ React 18 + TypeScript SPA (same codebase)           │
│  ├─ Environment: production                             │
│  ├─ Daily Backups: 02:00 AM Pacific Time                │
│  └─ Data: Cloned from staging                           │
└─────────────────────────────────────────────────────────┘
```

---

## Pre-Migration Requirements

### Environment Checklist
- [ ] Heroku CLI installed and authenticated (`heroku auth:whoami`)
- [ ] Git repository up-to-date with latest staging code
- [ ] Access to sc-mvp-staging Heroku app
- [ ] Billing enabled on Heroku account (for PostgreSQL Standard-0 ~$50/month)
- [ ] All Milestone 1 & 2 features verified on staging
- [ ] Staging /healthz endpoint confirmed working

### Verification Commands
```bash
# Verify Heroku authentication
heroku auth:whoami

# Verify staging app status
heroku apps:info -a sc-mvp-staging

# Test staging health endpoint
curl https://sc-mvp-staging.herokuapp.com/healthz

# Check git status
git status
git remote -v

# Verify current branch is main
git branch --show-current
```

### Expected Costs (Monthly)
| Resource | Plan | Cost |
|----------|------|------|
| Production Dyno | Eco/Basic | $5-7 |
| PostgreSQL Standard-0 | Standard-0 | $50 |
| **Total** | | **~$55-57/month** |

---

## Phase 1: Production Environment Setup

### Objective
Create production Heroku app with PostgreSQL Standard-0 and deploy codebase.

### Tasks

#### 1.1 Create Production App
```bash
# Create new Heroku app
heroku create sc-mvp-production

# Verify creation
heroku apps:info -a sc-mvp-production
```

**Acceptance Criteria:**
- [ ] App `sc-mvp-production` exists in Heroku dashboard
- [ ] App URL is accessible: https://sc-mvp-production.herokuapp.com
- [ ] App is owned by correct Heroku account

---

#### 1.2 Provision PostgreSQL Database
```bash
# Add PostgreSQL Standard-0 (required for automated backups)
heroku addons:create heroku-postgresql:standard-0 -a sc-mvp-production

# Wait for provisioning (30-60 seconds)
sleep 60

# Verify database provisioning
heroku addons:info heroku-postgresql -a sc-mvp-production
heroku pg:info -a sc-mvp-production
```

**Acceptance Criteria:**
- [ ] PostgreSQL addon shows status: "available"
- [ ] DATABASE_URL environment variable is set
- [ ] Database plan is Standard-0 or higher
- [ ] Connection limit is appropriate for production

---

#### 1.3 Copy Configuration Variables
```bash
# Export staging config (excluding DATABASE_URL)
heroku config -a sc-mvp-staging --shell | \
  grep -vE '^(DATABASE_URL|HEROKU_POSTGRESQL|LANG|RACK_ENV)' > staging-config.env

# Review exported config
cat staging-config.env

# Apply config to production (manual review recommended)
# DO NOT blindly copy - review each variable

# Set production-specific variables
heroku config:set \
  NODE_ENV=production \
  RAILS_ENV=production \
  RAILS_LOG_TO_STDOUT=enabled \
  RAILS_SERVE_STATIC_FILES=enabled \
  -a sc-mvp-production

# Copy remaining staging configs one by one
# Example:
# heroku config:set SECRET_KEY_BASE="<value>" -a sc-mvp-production
# heroku config:set SMTP_HOST="<value>" -a sc-mvp-production
# etc.
```

**Acceptance Criteria:**
- [ ] All required environment variables copied
- [ ] NODE_ENV=production set
- [ ] RAILS_ENV=production set
- [ ] No sensitive staging-only variables copied
- [ ] Config vars reviewed and validated

**IMPORTANT:** Review each config var before copying. Some may need different values for production (e.g., domain names, API endpoints).

---

#### 1.4 Configure Git Remotes
```bash
# Add production remote
git remote add production https://git.heroku.com/sc-mvp-production.git

# Add staging remote (if not already added)
git remote add staging https://git.heroku.com/sc-mvp-staging.git

# Verify remotes
git remote -v
```

**Expected Output:**
```
production	https://git.heroku.com/sc-mvp-production.git (fetch)
production	https://git.heroku.com/sc-mvp-production.git (push)
staging	https://git.heroku.com/sc-mvp-staging.git (fetch)
staging	https://git.heroku.com/sc-mvp-staging.git (push)
origin	git@github.com:kishanssg/social-catering-mvp.git (fetch)
origin	git@github.com:kishanssg/social-catering-mvp.git (push)
```

**Acceptance Criteria:**
- [ ] `production` remote points to sc-mvp-production
- [ ] `staging` remote points to sc-mvp-staging
- [ ] `origin` remote points to GitHub repository

---

#### 1.5 Deploy Code to Production
```bash
# Ensure on main branch with latest code
git checkout main
git pull origin main

# Deploy to production
git push production main:main

# Monitor deployment logs
heroku logs --tail -a sc-mvp-production
```

**Acceptance Criteria:**
- [ ] Git push completes successfully
- [ ] Build completes without errors
- [ ] Assets compiled successfully (if applicable)
- [ ] Dynos start successfully
- [ ] No errors in deployment logs

---

#### 1.6 Run Database Migrations
```bash
# Run migrations on production
heroku run rails db:migrate -a sc-mvp-production

# Verify migration success
heroku run rails runner "puts ActiveRecord::Base.connection.migration_context.current_version" -a sc-mvp-production
```

**Acceptance Criteria:**
- [ ] All migrations run successfully
- [ ] No migration errors in output
- [ ] Database schema version matches staging
- [ ] All tables created (workers, shifts, assignments, activity_logs)

---

### Phase 1 Completion Checklist
- [ ] Production app created
- [ ] PostgreSQL Standard-0 provisioned
- [ ] Configuration variables set
- [ ] Git remotes configured
- [ ] Code deployed successfully
- [ ] Database migrations completed
- [ ] No deployment errors

---

## Phase 2: Database Migration & Backup Configuration

### Objective
Copy staging data to production and configure automated daily backups.

### Tasks

#### 2.1 Backup Staging Database
```bash
# Create backup of staging database
heroku pg:backups:capture -a sc-mvp-staging

# Verify backup created
heroku pg:backups -a sc-mvp-staging

# Get backup details
heroku pg:backups:info -a sc-mvp-staging
```

**Acceptance Criteria:**
- [ ] Backup created successfully
- [ ] Backup shows "Completed" status
- [ ] Backup size is reasonable (not 0 bytes)
- [ ] Backup timestamp is recent

---

#### 2.2 Restore Staging Data to Production
```bash
# Get staging backup URL
STAGING_BACKUP_URL=$(heroku pg:backups:url -a sc-mvp-staging)

# Restore to production (THIS WILL OVERWRITE production database)
heroku pg:backups:restore "$STAGING_BACKUP_URL" DATABASE_URL \
  -a sc-mvp-production \
  --confirm sc-mvp-production

# Monitor restore progress
heroku pg:backups -a sc-mvp-production
```

**CRITICAL WARNING:** This will completely replace production database with staging data. Ensure this is desired before proceeding.

**Acceptance Criteria:**
- [ ] Restore completes successfully
- [ ] No errors during restore
- [ ] Restore shows "Completed" status

---

#### 2.3 Verify Data Migration
```bash
# Check record counts in production
heroku run rails runner "
  puts 'Workers: ' + Worker.count.to_s
  puts 'Shifts: ' + Shift.count.to_s
  puts 'Assignments: ' + Assignment.count.to_s
  puts 'Activity Logs: ' + ActivityLog.count.to_s
" -a sc-mvp-production

# Compare with staging counts
heroku run rails runner "
  puts 'Workers: ' + Worker.count.to_s
  puts 'Shifts: ' + Shift.count.to_s
  puts 'Assignments: ' + Assignment.count.to_s
  puts 'Activity Logs: ' + ActivityLog.count.to_s
" -a sc-mvp-staging
```

**Acceptance Criteria:**
- [ ] Record counts match between staging and production
- [ ] All major tables have data
- [ ] No foreign key constraint errors
- [ ] Sample data spot-checked and verified

---

#### 2.4 Schedule Automated Daily Backups
```bash
# Schedule daily backups at 2:00 AM Pacific Time
heroku pg:backups:schedule DATABASE_URL \
  --at '02:00 America/Los_Angeles' \
  -a sc-mvp-production

# Verify schedule created
heroku pg:backups:schedules -a sc-mvp-production
```

**Expected Output:**
```
DATABASE_URL: daily at 2:00 America/Los_Angeles
```

**Acceptance Criteria:**
- [ ] Backup schedule created successfully
- [ ] Schedule time is 02:00 AM Pacific
- [ ] Schedule status is "active"
- [ ] Next backup time is shown

**NOTE:** First automated backup will run at next scheduled time (tomorrow at 2:00 AM).

---

#### 2.5 Create Manual Test Backup
```bash
# Manually trigger a backup to verify functionality
heroku pg:backups:capture -a sc-mvp-production

# Verify backup created
heroku pg:backups -a sc-mvp-production

# Check backup info
heroku pg:backups:info -a sc-mvp-production
```

**Acceptance Criteria:**
- [ ] Manual backup created successfully
- [ ] Backup shows "Completed" status
- [ ] Backup is downloadable
- [ ] Backup size matches database size

---

#### 2.6 Test Backup Download (Optional but Recommended)
```bash
# Download latest backup to verify integrity
heroku pg:backups:download -a sc-mvp-production

# This creates latest.dump file
ls -lh latest.dump

# Verify file is valid PostgreSQL dump (optional)
# pg_restore --list latest.dump | head -20
```

**Acceptance Criteria:**
- [ ] Backup downloads successfully
- [ ] File size is non-zero
- [ ] File is valid PostgreSQL dump format

---

### Phase 2 Completion Checklist
- [ ] Staging database backed up
- [ ] Data restored to production
- [ ] Data integrity verified
- [ ] Automated daily backups scheduled
- [ ] Manual test backup created
- [ ] Backup download tested
- [ ] Backup retention policy confirmed (7 days for Standard-0)

---

## Phase 3: Verification & Testing

### Objective
Thoroughly test production environment to ensure Milestone 3 acceptance criteria are met.

### Tasks

#### 3.1 Health Endpoint Verification
```bash
# Test production health endpoint
curl -i https://sc-mvp-production.herokuapp.com/healthz

# Should return HTTP 200 with success response
```

**Expected Response:**
```
HTTP/2 200
content-type: application/json

{"status":"ok","timestamp":"2025-11-04T19:05:51Z"}
```

**Acceptance Criteria:**
- [ ] HTTP status code is 200
- [ ] Response is valid JSON
- [ ] Response indicates healthy status
- [ ] Response time is reasonable (<500ms)

**CRITICAL:** This is explicitly required in Milestone 3 acceptance criteria.

---

#### 3.2 API Endpoint Testing
Test all critical API endpoints documented in Milestone 1.

```bash
# Base URL
PROD_URL="https://sc-mvp-production.herokuapp.com"

# Test authentication endpoint
curl -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test workers endpoint (requires auth token)
curl "$PROD_URL/api/workers" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test shifts endpoint
curl "$PROD_URL/api/shifts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test assignments endpoint
curl "$PROD_URL/api/assignments" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Acceptance Criteria:**
- [ ] Authentication endpoint works (returns token)
- [ ] Workers CRUD endpoints functional
- [ ] Shifts CRUD endpoints functional
- [ ] Assignments CRUD endpoints functional
- [ ] Conflict checks working (time overlap, capacity, cert expiration)
- [ ] Activity logs being created on updates/deletes
- [ ] No 500 errors on any endpoint
- [ ] Response times acceptable

---

#### 3.3 Frontend Application Testing
```bash
# Open production URL in browser
open https://sc-mvp-production.herokuapp.com

# Or test with curl
curl -I https://sc-mvp-production.herokuapp.com
```

**Manual Testing Checklist:**
- [ ] Application loads without errors
- [ ] Login page accessible
- [ ] Authentication flow works (email/password for 3 admins)
- [ ] Dashboard displays correctly
- [ ] Workers page loads and displays data
- [ ] Worker search functionality works (name/skill/cert)
- [ ] Shifts page loads and displays data
- [ ] Assignments page loads and displays data
- [ ] Assignment conflict warnings display correctly
- [ ] Activity log viewer works
- [ ] Responsive design works (desktop + tablet)
- [ ] No console errors in browser
- [ ] No loading state errors
- [ ] Performance is acceptable (no N+1 queries on dashboard)

---

#### 3.4 Database Backup Verification
```bash
# Check all backups
heroku pg:backups -a sc-mvp-production

# Verify schedule is active
heroku pg:backups:schedules -a sc-mvp-production

# Check database info
heroku pg:info -a sc-mvp-production
```

**Acceptance Criteria:**
- [ ] At least one backup exists
- [ ] Backup schedule shows "active"
- [ ] Backup schedule time is correct (02:00 AM Pacific)
- [ ] Database plan supports automated backups (Standard-0+)
- [ ] Backup retention policy is clear (7 days)

---

#### 3.5 Application Logs Review
```bash
# Check for errors in production logs
heroku logs --tail -a sc-mvp-production

# Check for specific error levels
heroku logs --tail -a sc-mvp-production | grep -i error
heroku logs --tail -a sc-mvp-production | grep -i exception
heroku logs --tail -a sc-mvp-production | grep -i fatal
```

**Acceptance Criteria:**
- [ ] No critical errors in logs
- [ ] No unhandled exceptions
- [ ] No database connection errors
- [ ] No asset compilation errors
- [ ] Application starts successfully
- [ ] Health checks passing

---

#### 3.6 Performance Verification
```bash
# Check dyno status
heroku ps -a sc-mvp-production

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://sc-mvp-production.herokuapp.com/healthz

# Create curl-format.txt with:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_total:       %{time_total}\n
```

**Acceptance Criteria:**
- [ ] Dynos are running (not idle)
- [ ] Response times acceptable (<500ms for /healthz)
- [ ] No timeout errors
- [ ] Dashboard loads without N+1 query issues (per Milestone 2)

---

### Phase 3 Completion Checklist
- [ ] /healthz returns 200 ✅ (Milestone 3 requirement)
- [ ] All API endpoints tested and working
- [ ] Frontend application fully functional
- [ ] Worker search works (name/skill/cert)
- [ ] Assignment conflict warnings display
- [ ] Activity log viewer functional
- [ ] Database backups verified
- [ ] No Sev-1/2 issues found ✅ (Milestone 3 requirement)
- [ ] Performance acceptable
- [ ] Logs show no critical errors

---

## Phase 4: Documentation Package

### Objective
Create comprehensive documentation for handoff to GravyWork's ops team.

**Required Documents (Milestone 3):**
1. README.md - Project overview and setup
2. RUNBOOK.md - Operations manual
3. ENV_CONFIG.md - Environment configuration
4. API_DOCUMENTATION.md - API reference
5. USER_GUIDE.md - End-user instructions

### Tasks

#### 4.1 Create/Update README.md
```markdown
# Social Catering MVP - README.md

Content Requirements:
- [ ] Project overview and purpose
- [ ] Tech stack (Rails 7, React 18 + TypeScript, PostgreSQL)
- [ ] Repository structure
- [ ] Local development setup instructions
- [ ] How to run tests
- [ ] Deployment instructions (staging & production)
- [ ] Architecture diagram
- [ ] Milestones completion status
- [ ] Contact information for support
```

---

#### 4.2 Create RUNBOOK.md
```markdown
# Social Catering MVP - Operations Runbook

Content Requirements:
- [ ] Daily operations procedures
- [ ] Deployment workflow (staging → production)
- [ ] Database backup/restore procedures
- [ ] Monitoring and health checks
- [ ] Common troubleshooting scenarios
- [ ] Incident response procedures
- [ ] Scaling instructions
- [ ] Log access and analysis
- [ ] Performance monitoring
- [ ] Rollback procedures
- [ ] Contact escalation path
```

**Critical Sections:**
- How to deploy code updates
- How to restore from backup
- How to check backup status
- Emergency procedures

---

#### 4.3 Create ENV_CONFIG.md
```markdown
# Social Catering MVP - Environment Configuration

Content Requirements:
- [ ] List of all environment variables
- [ ] Description of each variable
- [ ] Required vs optional variables
- [ ] Staging-specific configuration
- [ ] Production-specific configuration
- [ ] How to manage secrets
- [ ] How to rotate credentials
- [ ] Database connection configuration
- [ ] Third-party API keys (if any)
- [ ] Email/SMTP configuration
```

**IMPORTANT:** Do NOT include actual secret values. Document variable names and purposes only.

---

#### 4.4 Create API_DOCUMENTATION.md
```markdown
# Social Catering MVP - API Documentation

Content Requirements:
- [ ] Authentication flow (email/password for 3 admins)
- [ ] API base URLs (staging & production)
- [ ] All endpoints with HTTP methods
- [ ] Request/response formats
- [ ] Error response formats
- [ ] Workers endpoints (CRUD + status flow)
- [ ] Shifts endpoints (CRUD)
- [ ] Assignments endpoints (CRUD + conflict checks)
- [ ] Activity logs endpoint
- [ ] Rate limiting (if applicable)
- [ ] Example requests with curl
- [ ] OpenAPI/Swagger spec (if available)
```

**Based on Milestone 1 Requirements:**
- Workers, Shifts, Assignments (CRUD + status flow)
- Assignment conflict checks (time overlap, capacity, cert expiration)
- Activity logs on create/update/delete

---

#### 4.5 Create USER_GUIDE.md
```markdown
# Social Catering MVP - User Guide

Content Requirements:
- [ ] Application overview
- [ ] Login instructions
- [ ] Dashboard walkthrough
- [ ] How to manage workers (add, edit, search)
- [ ] How to manage shifts
- [ ] How to create assignments
- [ ] Understanding conflict warnings
- [ ] How to view activity logs
- [ ] Common workflows
- [ ] FAQ section
- [ ] Screenshots or diagrams
- [ ] Troubleshooting common issues
```

**Target Audience:** Ops team (Natalie, Madison, Sarah) and GravyWork administrators.

---

### Phase 4 Completion Checklist
- [ ] README.md created/updated
- [ ] RUNBOOK.md created with operational procedures
- [ ] ENV_CONFIG.md created with all config documentation
- [ ] API_DOCUMENTATION.md created with all endpoints
- [ ] USER_GUIDE.md created for end users
- [ ] All documents reviewed for accuracy
- [ ] All documents committed to repository
- [ ] Screenshots/diagrams included where helpful
- [ ] No sensitive credentials in documentation

---

## Phase 5: Final Acceptance Criteria

### Milestone 3 Requirements Verification

#### Official Acceptance Criteria (from Milestone 3)
```
✅ /healthz = 200 on production
✅ No Sev-1/2 issues
✅ Docs + code delivered
```

### Detailed Acceptance Checklist

#### 5.1 Production Deployment
- [ ] **Production app deployed on Client's Heroku** ✅ Required
  - App name: sc-mvp-production
  - Accessible at: https://sc-mvp-production.herokuapp.com
  - Owned by correct Heroku account

#### 5.2 Daily Automated DB Backups
- [ ] **Daily automated DB backups verified** ✅ Required
  - Schedule active: daily at 02:00 AM Pacific
  - At least one successful backup exists
  - Backup can be downloaded and restored
  - Retention policy: 7 days (Standard-0)
  - PostgreSQL plan: Standard-0 or higher

#### 5.3 Health Check
- [ ] **/healthz endpoint returns 200 on production** ✅ CRITICAL
  - `curl https://sc-mvp-production.herokuapp.com/healthz` returns 200
  - Response is valid JSON
  - Response indicates healthy status

#### 5.4 Quality Assurance
- [ ] **No Sev-1/2 issues** ✅ Required
  - Sev-1: No critical bugs blocking core functionality
  - Sev-2: No major bugs affecting user experience
  - All Milestone 1 & 2 features working in production
  - UAT completed with ops team (Natalie, Madison, Sarah)

#### 5.5 Code Transfer
- [ ] **Code transferred to GravyWork's private GitHub repo** ✅ Required
  - Repository transferred or code pushed to their repo
  - Full commit history preserved
  - Admin access provided to GravyWork team

#### 5.6 Documentation Package
- [ ] **Documentation package complete** ✅ Required
  - README.md
  - RUNBOOK.md (operations manual)
  - ENV_CONFIG.md (environment configuration)
  - API_DOCUMENTATION.md (API reference)
  - USER_GUIDE.md (end-user instructions)

#### 5.7 Handoff Session
- [ ] **60-90 min handoff session (recording optional)** ✅ Required
  - Session scheduled with ops team
  - Demo of all features
  - Walkthrough of documentation
  - Q&A session
  - Recording available (optional)

#### 5.8 Bug Fix Warranty
- [ ] **30-day Sev-1/2 bug-fix warranty** ✅ Required
  - Period: 30 days from handoff
  - Scope: Sev-1/2 issues only
  - Contact method established
  - Response time SLA defined

---

### Final Verification Commands

Run these commands to verify all acceptance criteria:

```bash
# 1. Verify production app exists
heroku apps:info -a sc-mvp-production

# 2. Verify health endpoint (CRITICAL)
curl -i https://sc-mvp-production.herokuapp.com/healthz
# Must return: HTTP/2 200

# 3. Verify database backups scheduled
heroku pg:backups:schedules -a sc-mvp-production
# Must show: daily at 2:00 America/Los_Angeles

# 4. Verify at least one backup exists
heroku pg:backups -a sc-mvp-production
# Must show: at least 1 backup with "Completed" status

# 5. Verify PostgreSQL plan supports backups
heroku addons:info heroku-postgresql -a sc-mvp-production
# Must show: standard-0 or higher

# 6. Verify all documentation exists
ls -la docs/
# Must include: README.md, RUNBOOK.md, ENV_CONFIG.md, API_DOCUMENTATION.md, USER_GUIDE.md

# 7. Check production logs for errors
heroku logs --tail -a sc-mvp-production | grep -i error
# Should show: no critical errors

# 8. Verify data in production
heroku run rails runner "puts 'Workers: ' + Worker.count.to_s" -a sc-mvp-production
# Should show: non-zero count
```

---

## Rollback Procedures

### If Production Deployment Fails

#### Scenario 1: Code Deployment Fails
```bash
# Roll back to previous release
heroku releases -a sc-mvp-production
heroku rollback v<PREVIOUS_VERSION> -a sc-mvp-production

# Verify rollback
heroku releases -a sc-mvp-production
```

#### Scenario 2: Database Migration Fails
```bash
# DO NOT rollback migrations automatically
# Instead, create a new migration to fix the issue

# If database is corrupted, restore from backup
heroku pg:backups -a sc-mvp-production
heroku pg:backups:restore <BACKUP_ID> DATABASE_URL -a sc-mvp-production --confirm sc-mvp-production
```

#### Scenario 3: Database Restore Fails
```bash
# If staging data restore fails, production DB is still in migrated state
# Option 1: Try restore again with different backup
heroku pg:backups:restore <DIFFERENT_BACKUP_ID> DATABASE_URL -a sc-mvp-production --confirm sc-mvp-production

# Option 2: Manually seed production database
heroku run rails db:seed -a sc-mvp-production

# Option 3: Reset database and start fresh (DESTRUCTIVE)
heroku pg:reset DATABASE_URL -a sc-mvp-production --confirm sc-mvp-production
heroku run rails db:migrate -a sc-mvp-production
heroku run rails db:seed -a sc-mvp-production
```

#### Scenario 4: Backup Schedule Fails
```bash
# Unschedule and reschedule
heroku pg:backups:unschedule DATABASE_URL -a sc-mvp-production
heroku pg:backups:schedule DATABASE_URL --at '02:00 America/Los_Angeles' -a sc-mvp-production

# If PostgreSQL plan is insufficient
heroku addons:upgrade heroku-postgresql:standard-0 -a sc-mvp-production
```

---

## Post-Migration Tasks

### Immediate Tasks (Day 1)
- [ ] Monitor production logs for first 24 hours
- [ ] Verify first automated backup runs successfully (tomorrow at 02:00 AM)
- [ ] Set up monitoring/alerting (New Relic, Sentry, etc.)
- [ ] Update DNS/domain if needed
- [ ] Notify stakeholders of production launch

### Week 1 Tasks
- [ ] Conduct UAT with ops team (Natalie, Madison, Sarah)
- [ ] Schedule 60-90 min handoff session
- [ ] Transfer code to GravyWork's private GitHub
- [ ] Provide admin access to GravyWork team
- [ ] Document any issues found during UAT
- [ ] Fix Sev-1/2 bugs if any found

### Week 2-3 Tasks
- [ ] Monitor backup retention (verify 7-day retention working)
- [ ] Review production metrics and performance
- [ ] Optimize any performance issues
- [ ] Complete documentation revisions based on UAT feedback
- [ ] Prepare for final handoff

### Week 4 Tasks
- [ ] Final handoff session with recording
- [ ] Transfer all access and credentials
- [ ] Document 30-day bug-fix warranty process
- [ ] Establish support contact method
- [ ] Close out Milestone 3

---

## Database Sync Strategy (Ongoing)

### When to Sync Production → Staging

After production is established, you may need to refresh staging with production data for realistic testing.

```bash
# Refresh staging from production (weekly or monthly)
# WARNING: This OVERWRITES staging data

# 1. Backup current staging (just in case)
heroku pg:backups:capture -a sc-mvp-staging

# 2. Capture production backup
heroku pg:backups:capture -a sc-mvp-production

# 3. Get production backup URL
PROD_BACKUP_URL=$(heroku pg:backups:url -a sc-mvp-production)

# 4. Restore to staging
heroku pg:backups:restore "$PROD_BACKUP_URL" DATABASE_URL -a sc-mvp-staging --confirm sc-mvp-staging

# 5. Sanitize sensitive data in staging
heroku run rails console -a sc-mvp-staging
# In console: User.update_all(email: -> { "test_#{id}@example.com" })
```

**When to use:**
- Monthly or before major feature testing
- When debugging production issues
- When testing migrations with realistic data

---

## Support & Contacts

### During Migration (kishanssg)
- GitHub: @kishanssg
- Repository: kishanssg/social-catering-mvp

### Post-Handoff (GravyWork)
- Ops Team: Natalie, Madison, Sarah
- Bug Reports: [To be established during handoff]
- Emergency Contact: [To be established during handoff]

### Heroku Support
- Standard Support: https://help.heroku.com/
- Critical Issues: Open ticket via Heroku dashboard

---

## Cursor AI Instructions

**For Cursor AI to execute this migration plan:**

### Phase-by-Phase Execution

**PHASE 1 PROMPT:**
```
Read the file migrate.md and execute Phase 1: Production Environment Setup.
Complete tasks 1.1 through 1.6 in order.
After each task, verify the acceptance criteria before proceeding.
Report any errors and wait for user confirmation before continuing.
```

**PHASE 2 PROMPT:**
```
Read the file migrate.md and execute Phase 2: Database Migration & Backup Configuration.
Complete tasks 2.1 through 2.6 in order.
Verify data integrity and backup schedules.
Report completion status with verification results.
```

**PHASE 3 PROMPT:**
```
Read the file migrate.md and execute Phase 3: Verification & Testing.
Run all verification commands and manual testing checklists.
Report any failing tests or issues found.
Ensure /healthz returns 200 (CRITICAL for Milestone 3).
```

**PHASE 4 PROMPT:**
```
Read the file migrate.md and execute Phase 4: Documentation Package.
Create all 5 required documentation files:
1. README.md
2. RUNBOOK.md
3. ENV_CONFIG.md
4. API_DOCUMENTATION.md
5. USER_GUIDE.md

Use the context from Milestone 1, 2, and 3 requirements.
Include all sections listed in the content requirements.
```

**PHASE 5 PROMPT:**
```
Read the file migrate.md and execute Phase 5: Final Acceptance Criteria.
Run all final verification commands.
Generate a completion report showing all acceptance criteria status.
Highlight any items that do not meet requirements.
```

---

## Migration Completion Report Template

After completing all phases, generate this report:

```markdown
# Migration Completion Report
Date: YYYY-MM-DD
Environment: sc-mvp-production
Migration By: @kishanssg

## Phase 1: Production Environment Setup
- [ ] Production app created: YES/NO
- [ ] PostgreSQL provisioned: YES/NO (Plan: ______)
- [ ] Config vars copied: YES/NO
- [ ] Code deployed: YES/NO
- [ ] Migrations run: YES/NO
- [ ] Issues: None / [List issues]

## Phase 2: Database Migration & Backup
- [ ] Staging backed up: YES/NO
- [ ] Data restored to production: YES/NO
- [ ] Daily backups scheduled: YES/NO (Time: ______)
- [ ] Test backup created: YES/NO
- [ ] Issues: None / [List issues]

## Phase 3: Verification & Testing
- [ ] /healthz returns 200: YES/NO ⚠️ CRITICAL
- [ ] API endpoints working: YES/NO
- [ ] Frontend functional: YES/NO
- [ ] No Sev-1/2 issues: YES/NO ⚠️ CRITICAL
- [ ] Performance acceptable: YES/NO
- [ ] Issues: None / [List issues]

## Phase 4: Documentation
- [ ] README.md: Complete/Incomplete
- [ ] RUNBOOK.md: Complete/Incomplete
- [ ] ENV_CONFIG.md: Complete/Incomplete
- [ ] API_DOCUMENTATION.md: Complete/Incomplete
- [ ] USER_GUIDE.md: Complete/Incomplete

## Phase 5: Final Acceptance
- [ ] Production deployed: YES/NO
- [ ] Daily backups verified: YES/NO
- [ ] /healthz = 200: YES/NO
- [ ] No Sev-1/2 issues: YES/NO
- [ ] Docs complete: YES/NO
- [ ] Ready for handoff: YES/NO

## Milestone 3 Acceptance Criteria
✅ /healthz = 200 on production: YES/NO
✅ No Sev-1/2 issues: YES/NO
✅ Docs + code delivered: YES/NO

## Overall Status
PASS / FAIL

## Next Steps
[List any remaining tasks or issues to address]

## Production URLs
- Application: https://sc-mvp-production.herokuapp.com
- Health Check: https://sc-mvp-production.herokuapp.com/healthz

## Backup Information
- Schedule: Daily at 02:00 AM Pacific
- Retention: 7 days
- Last Backup: [Timestamp]

## Handoff Readiness
Ready: YES/NO
Pending Items: [List if any]
```

---

## End of Migration Plan

**This document should be used as the single source of truth for Milestone 3 completion.**

Last Updated: 2025-11-04  
Version: 1.0  
Owner: @kishanssg