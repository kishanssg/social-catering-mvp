# 🤖 CURSOR AI: Production Migration Instructions
# Social Catering MVP - Milestone 3 Completion

**Reference Document**: @migrate.md  
**Repository**: kishanssg/social-catering-mvp  
**Current Status**: Milestones 1 & 2 complete on staging  
**Goal**: Deploy production environment with automated daily backups

---

## 📖 HOW TO USE THIS FILE

This file contains **5 phases** of instructions for Cursor AI to execute the production migration.

**IMPORTANT RULES:**
1. ✅ Execute ONE phase at a time
2. ✅ Complete ALL acceptance criteria before moving to next phase
3. ✅ Report results after each phase
4. ✅ WAIT for user confirmation before proceeding to next phase
5. ✅ If ANY acceptance criteria fails, STOP and report the issue

**User will provide phase-by-phase prompts like:**
```
Execute PHASE 1 from CURSOR_MIGRATION_INSTRUCTIONS.md
```

---

## ⚙️ PHASE 0: Pre-Flight Verification (DO THIS FIRST)

### CURSOR TASK:
Run the following verification commands and report the results. DO NOT proceed to Phase 1 until all checks pass.

### COMMANDS TO RUN:
```bash
# 1. Verify Heroku authentication
heroku auth:whoami

# 2. Verify staging app exists and is accessible
heroku apps:info -a sc-mvp-staging

# 3. Test staging health endpoint
curl -s -o /dev/null -w "%{http_code}" https://sc-mvp-staging.herokuapp.com/healthz

# 4. Check git status and current branch
git status
git branch --show-current

# 5. Verify git remotes
git remote -v

# 6. Check for uncommitted changes
git diff --stat
```

### ACCEPTANCE CRITERIA:
- [ ] `heroku auth:whoami` returns valid username (not "not logged in")
- [ ] `heroku apps:info -a sc-mvp-staging` shows app details without errors
- [ ] Staging health endpoint returns `200` status code
- [ ] Current git branch is `main`
- [ ] Git working directory is clean (no uncommitted changes) OR changes are committed
- [ ] Git remotes include `origin` pointing to GitHub repository

### REPORT FORMAT:
```
✅ PHASE 0: Pre-Flight Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Heroku Authentication:
  Status: [PASS/FAIL]
  User: [username]

Staging App Status:
  Status: [PASS/FAIL]
  App Name: sc-mvp-staging
  Region: [region]
  Stack: [stack]

Staging Health Check:
  Status: [PASS/FAIL]
  HTTP Code: [200/other]
  URL: https://sc-mvp-staging.herokuapp.com/healthz

Git Status:
  Status: [PASS/FAIL]
  Branch: [branch name]
  Uncommitted changes: [YES/NO]
  
Git Remotes:
  Status: [PASS/FAIL]
  origin: [URL]
  staging: [URL if exists]
  production: [URL if exists]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Status: [ALL CHECKS PASSED / ISSUES FOUND]

[If issues found, list them here with recommendations]

Ready to proceed to PHASE 1: [YES/NO]
```

**USER: Review the report and confirm to proceed to Phase 1**

---

## 🚀 PHASE 1: Production Environment Setup

### CURSOR TASK:
Create the production Heroku app, provision PostgreSQL, copy configuration, and deploy the code.

### STEP 1.1: Create Production App
```bash
heroku create sc-mvp-production
```

**Expected Output**: App created successfully with URL  
**Acceptance Criteria**:
- [ ] Command completes without errors
- [ ] App URL is `https://sc-mvp-production.herokuapp.com`
- [ ] App appears in `heroku apps:list`

---

### STEP 1.2: Provision PostgreSQL Standard-0
```bash
heroku addons:create heroku-postgresql:standard-0 -a sc-mvp-production

# Wait for provisioning
echo "Waiting 60 seconds for database provisioning..."
sleep 60

# Verify provisioning
heroku addons:info heroku-postgresql -a sc-mvp-production
heroku pg:info -a sc-mvp-production
```

**Expected Output**: PostgreSQL addon with status "available"  
**Acceptance Criteria**:
- [ ] Addon created successfully
- [ ] Addon status is "available" (not "creating")
- [ ] Plan is "standard-0" or higher
- [ ] DATABASE_URL environment variable is set
- [ ] Connection limit is shown (minimum 120 connections)

---

### STEP 1.3: Copy Configuration Variables
```bash
# Export staging config (excluding database URLs)
heroku config -a sc-mvp-staging --shell | \
  grep -vE '^(DATABASE_URL|HEROKU_POSTGRESQL|LANG|RACK_ENV)=' > staging-config.env

# Show what will be copied (for user review)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Config variables to be copied from staging:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat staging-config.env | cut -d'=' -f1
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**STOP HERE**: Present the list of config variables to the user for review.

**USER ACTION REQUIRED**: 
- Review the config variable names above
- Confirm which variables should be copied to production
- Identify any variables that need different values in production

**After user confirms**, continue with:

```bash
# Apply config to production (one by one to avoid shell issues)
while IFS='=' read -r key value; do
  if [[ -n "$key" && ! "$key" =~ ^# ]]; then
    echo "Setting: $key"
    heroku config:set "$key=$value" -a sc-mvp-production
  fi
done < staging-config.env

# Set production-specific variables
heroku config:set NODE_ENV=production -a sc-mvp-production
heroku config:set RAILS_ENV=production -a sc-mvp-production

# Clean up temp file
rm staging-config.env
```

**Acceptance Criteria**:
- [ ] All approved config variables copied without errors
- [ ] NODE_ENV=production is set
- [ ] RAILS_ENV=production is set
- [ ] No staging-specific values copied (like staging URLs)
- [ ] Verify with: `heroku config -a sc-mvp-production`

---

### STEP 1.4: Configure Git Remotes
```bash
# Add production remote
git remote add production https://git.heroku.com/sc-mvp-production.git 2>/dev/null || \
  git remote set-url production https://git.heroku.com/sc-mvp-production.git

# Add staging remote if not exists
git remote add staging https://git.heroku.com/sc-mvp-staging.git 2>/dev/null || \
  git remote set-url staging https://git.heroku.com/sc-mvp-staging.git

# Verify remotes
git remote -v
```

**Acceptance Criteria**:
- [ ] `production` remote points to `https://git.heroku.com/sc-mvp-production.git`
- [ ] `staging` remote points to `https://git.heroku.com/sc-mvp-staging.git`
- [ ] `origin` remote points to GitHub repository
- [ ] All remotes shown in `git remote -v` output

---

### STEP 1.5: Deploy Code to Production
```bash
# Ensure we're on main branch
git checkout main

# Deploy to production
echo "Deploying to production..."
git push production main:main

# Check deployment status
heroku releases -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] Git push completes successfully (exit code 0)
- [ ] Build completes without errors
- [ ] Release created (shown in `heroku releases`)
- [ ] Slug compilation successful
- [ ] No errors in build output

---

### STEP 1.6: Run Database Migrations
```bash
# Run migrations
heroku run rails db:migrate -a sc-mvp-production

# Verify migrations completed
heroku run rails runner "puts 'Current schema version: ' + ActiveRecord::Base.connection.migration_context.current_version.to_s" -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] Migrations run without errors
- [ ] Schema version number is displayed
- [ ] No "PendingMigrationError" messages
- [ ] All expected tables created (workers, shifts, assignments, activity_logs)

---

### PHASE 1 COMPLETION REPORT:

After completing ALL steps above, generate this report:

```
✅ PHASE 1 COMPLETE: Production Environment Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1.1 - Create Production App:
  Status: [PASS/FAIL]
  App Name: sc-mvp-production
  App URL: https://sc-mvp-production.herokuapp.com

Step 1.2 - Provision PostgreSQL:
  Status: [PASS/FAIL]
  Plan: standard-0
  Addon Status: available
  Connections: [number]

Step 1.3 - Copy Config Variables:
  Status: [PASS/FAIL]
  Variables Copied: [count]
  NODE_ENV: production
  RAILS_ENV: production

Step 1.4 - Configure Git Remotes:
  Status: [PASS/FAIL]
  production remote: ✓
  staging remote: ✓
  origin remote: ✓

Step 1.5 - Deploy Code:
  Status: [PASS/FAIL]
  Release: [version number]
  Build Status: successful

Step 1.6 - Run Migrations:
  Status: [PASS/FAIL]
  Schema Version: [version number]
  Tables Created: workers, shifts, assignments, activity_logs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Phase 1 Status: [SUCCESS / FAILED]

[If failed, list failing steps and errors]

Ready to proceed to PHASE 2: [YES/NO]
```

**USER: Review Phase 1 report and confirm to proceed to Phase 2**

---

## 💾 PHASE 2: Database Migration & Backup Configuration

### CURSOR TASK:
Copy staging database to production and configure automated daily backups.

### STEP 2.1: Backup Staging Database
```bash
# Create staging backup
echo "Creating staging database backup..."
heroku pg:backups:capture -a sc-mvp-staging

# Verify backup created
heroku pg:backups -a sc-mvp-staging | head -5

# Get backup details
heroku pg:backups:info -a sc-mvp-staging
```

**Acceptance Criteria**:
- [ ] Backup created successfully
- [ ] Backup status is "Completed" (not "Failed" or "Running")
- [ ] Backup size is non-zero
- [ ] Backup timestamp is recent (within last few minutes)

---

### STEP 2.2: Get Staging Data Statistics (Before Restore)
```bash
# Count records in staging
echo "Staging database record counts:"
heroku run rails runner "
  puts '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  puts 'Workers: ' + Worker.count.to_s
  puts 'Shifts: ' + Shift.count.to_s
  puts 'Assignments: ' + Assignment.count.to_s
  puts 'Activity Logs: ' + ActivityLog.count.to_s
  puts '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
" -a sc-mvp-staging
```

**STOP HERE**: Show the record counts to the user.

**USER ACTION REQUIRED**: 
- Review the record counts from staging
- Confirm these are the expected data to copy to production
- Type "PROCEED" to continue with data restore

---

### STEP 2.3: Restore Staging Data to Production
```bash
# Get staging backup URL
STAGING_BACKUP_URL=$(heroku pg:backups:url -a sc-mvp-staging)

# Restore to production
echo "⚠️  RESTORING STAGING DATA TO PRODUCTION..."
echo "This will OVERWRITE the production database."
echo "Backup URL: $STAGING_BACKUP_URL"

heroku pg:backups:restore "$STAGING_BACKUP_URL" DATABASE_URL \
  -a sc-mvp-production \
  --confirm sc-mvp-production

# Wait for restore to complete
echo "Waiting for restore to complete..."
sleep 30

# Check restore status
heroku pg:backups -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] Restore command completes without errors
- [ ] Restore status is "Completed" (not "Failed")
- [ ] No error messages in output

---

### STEP 2.4: Verify Data Migration
```bash
# Count records in production (should match staging)
echo "Production database record counts (should match staging):"
heroku run rails runner "
  puts '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  puts 'Workers: ' + Worker.count.to_s
  puts 'Shifts: ' + Shift.count.to_s
  puts 'Assignments: ' + Assignment.count.to_s
  puts 'Activity Logs: ' + ActivityLog.count.to_s
  puts '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
" -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] Production record counts MATCH staging counts exactly
- [ ] All counts are non-zero (data was copied)
- [ ] No "ActiveRecord" errors or exceptions

**COMPARE**: Production counts should match staging counts from Step 2.2

---

### STEP 2.5: Schedule Automated Daily Backups
```bash
# Schedule daily backups at 2:00 AM Pacific Time
echo "Scheduling automated daily backups..."
heroku pg:backups:schedule DATABASE_URL \
  --at '02:00 America/Los_Angeles' \
  -a sc-mvp-production

# Verify schedule created
heroku pg:backups:schedules -a sc-mvp-production
```

**Expected Output**: 
```
DATABASE_URL: daily at 2:00 America/Los_Angeles
```

**Acceptance Criteria**:
- [ ] Backup schedule created successfully
- [ ] Schedule shows "daily at 2:00 America/Los_Angeles"
- [ ] Schedule status is active
- [ ] Next backup time is displayed (tomorrow at 2:00 AM)

---

### STEP 2.6: Create Manual Test Backup
```bash
# Manually trigger a backup to verify functionality
echo "Creating manual test backup..."
heroku pg:backups:capture -a sc-mvp-production

# Verify backup created
heroku pg:backups -a sc-mvp-production

# Get backup details
heroku pg:backups:info -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] Manual backup created successfully
- [ ] Backup status is "Completed"
- [ ] Backup size matches database size (reasonable)
- [ ] At least 2 backups shown (restore backup + manual backup)

---

### STEP 2.7: Test Backup Download (Optional)
```bash
# Download latest backup to verify integrity
echo "Testing backup download..."
heroku pg:backups:download -a sc-mvp-production

# Check downloaded file
if [ -f "latest.dump" ]; then
  echo "✓ Backup downloaded successfully"
  ls -lh latest.dump
  echo "File size: $(du -h latest.dump | cut -f1)"
  rm latest.dump  # Clean up
else
  echo "✗ Backup download failed"
fi
```

**Acceptance Criteria**:
- [ ] Backup downloads successfully
- [ ] File "latest.dump" is created
- [ ] File size is non-zero and reasonable (>1KB)

---

### PHASE 2 COMPLETION REPORT:

```
✅ PHASE 2 COMPLETE: Database Migration & Backup Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 2.1 - Backup Staging Database:
  Status: [PASS/FAIL]
  Backup Status: Completed
  Backup Size: [size in MB]

Step 2.2 - Staging Record Counts:
  Workers: [count]
  Shifts: [count]
  Assignments: [count]
  Activity Logs: [count]

Step 2.3 - Restore to Production:
  Status: [PASS/FAIL]
  Restore Status: Completed

Step 2.4 - Verify Data Migration:
  Status: [PASS/FAIL]
  Production Workers: [count] (matches staging: YES/NO)
  Production Shifts: [count] (matches staging: YES/NO)
  Production Assignments: [count] (matches staging: YES/NO)
  Production Activity Logs: [count] (matches staging: YES/NO)

Step 2.5 - Schedule Daily Backups:
  Status: [PASS/FAIL]
  Schedule: daily at 2:00 America/Los_Angeles
  Next Backup: [timestamp]

Step 2.6 - Manual Test Backup:
  Status: [PASS/FAIL]
  Backup Status: Completed
  Backup Size: [size in MB]

Step 2.7 - Backup Download Test:
  Status: [PASS/FAIL/SKIPPED]
  File Downloaded: [YES/NO]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Phase 2 Status: [SUCCESS / FAILED]

Backup Retention: 7 days (Standard-0 plan)
Estimated Monthly Cost: ~$50 for PostgreSQL Standard-0

[If failed, list failing steps and errors]

Ready to proceed to PHASE 3: [YES/NO]
```

**USER: Review Phase 2 report and confirm to proceed to Phase 3**

---

## ✅ PHASE 3: Verification & Testing

### CURSOR TASK:
Thoroughly test production environment to ensure all Milestone 3 acceptance criteria are met.

### STEP 3.1: Health Endpoint Verification (CRITICAL)
```bash
# Test production health endpoint
echo "Testing production health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" https://sc-mvp-production.herokuapp.com/healthz)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Health Check Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: https://sc-mvp-production.herokuapp.com/healthz"
echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ HEALTH CHECK PASSED (200 OK)"
else
  echo "❌ HEALTH CHECK FAILED (Expected 200, got $HTTP_CODE)"
fi
```

**Acceptance Criteria** (⚠️ CRITICAL FOR MILESTONE 3):
- [ ] HTTP status code is **exactly 200**
- [ ] Response body is valid JSON
- [ ] Response indicates healthy status
- [ ] Response time < 500ms

**IF THIS FAILS, DO NOT PROCEED. Report the issue immediately.**

---

### STEP 3.2: Application Logs Review
```bash
# Check production logs for errors
echo "Checking production logs for errors..."
heroku logs --tail -n 100 -a sc-mvp-production | grep -iE '(error|exception|fatal|fail)' || echo "No errors found in recent logs"

# Check dyno status
heroku ps -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] No critical errors in logs (ERROR, FATAL, EXCEPTION)
- [ ] Dynos are running (not crashed or idle)
- [ ] No "Boot timeout" errors
- [ ] Application started successfully

---

### STEP 3.3: Database Connection Test
```bash
# Test database connectivity
echo "Testing database connection..."
heroku run rails runner "puts 'Database connection: ' + (ActiveRecord::Base.connection.active? ? 'ACTIVE' : 'FAILED')" -a sc-mvp-production

# Test sample query
heroku run rails runner "puts 'Sample Worker: ' + Worker.first.inspect" -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] Database connection is ACTIVE
- [ ] Sample query returns data (Worker record)
- [ ] No connection errors or timeouts

---

### STEP 3.4: API Endpoints Smoke Test
```bash
# Test key API endpoints (requires authentication)
echo "Note: Full API testing requires authentication token"
echo "Testing public/health endpoints only..."

# Test if Rails API is responding
curl -s -o /dev/null -w "API root: %{http_code}\n" https://sc-mvp-production.herokuapp.com/api/

# List available endpoints (if you have a routes endpoint)
# heroku run rails runner "puts Rails.application.routes.routes.map { |r| r.path.spec.to_s }.uniq.sort" -a sc-mvp-production
```

**Acceptance Criteria**:
- [ ] API responds (not 404 or 500 for base routes)
- [ ] No routing errors in logs

**NOTE**: Full API testing (Workers, Shifts, Assignments CRUD) requires manual browser testing or authenticated curl requests.

---

### STEP 3.5: Environment Variables Verification
```bash
# Verify critical environment variables are set
echo "Verifying production environment variables..."
heroku config -a sc-mvp-production | grep -E '(NODE_ENV|RAILS_ENV|DATABASE_URL|SECRET_KEY_BASE)'
```

**Acceptance Criteria**:
- [ ] NODE_ENV=production
- [ ] RAILS_ENV=production
- [ ] DATABASE_URL is set
- [ ] SECRET_KEY_BASE is set (or equivalent)

---

### STEP 3.6: Backup System Final Check
```bash
# Final verification of backup system
echo "Final backup system verification..."

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "BACKUP SCHEDULES:"
heroku pg:backups:schedules -a sc-mvp-production
echo ""
echo "RECENT BACKUPS:"
heroku pg:backups -a sc-mvp-production
echo ""
echo "DATABASE INFO:"
heroku pg:info -a sc-mvp-production
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**Acceptance Criteria**:
- [ ] Backup schedule is active (daily at 2:00 AM)
- [ ] At least 2 backups exist
- [ ] Latest backup is completed successfully
- [ ] PostgreSQL plan is Standard-0 or higher

---

### PHASE 3 COMPLETION REPORT:

```
✅ PHASE 3 COMPLETE: Verification & Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 3.1 - Health Endpoint (⚠️ CRITICAL):
  Status: [PASS/FAIL]
  HTTP Code: [200/other]
  Response: [response body]
  ✅ Milestone 3 Requirement: /healthz = 200 [MET/NOT MET]

Step 3.2 - Application Logs:
  Status: [PASS/FAIL]
  Critical Errors: [count or "None"]
  Dyno Status: [running/crashed]

Step 3.3 - Database Connection:
  Status: [PASS/FAIL]
  Connection: [ACTIVE/FAILED]
  Sample Query: [SUCCESS/FAILED]

Step 3.4 - API Endpoints:
  Status: [PASS/FAIL]
  API Response: [http code]

Step 3.5 - Environment Variables:
  Status: [PASS/FAIL]
  NODE_ENV: production
  RAILS_ENV: production
  DATABASE_URL: set
  SECRET_KEY_BASE: set

Step 3.6 - Backup System:
  Status: [PASS/FAIL]
  Schedule Active: YES
  Backups Exist: [count]
  PostgreSQL Plan: standard-0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Phase 3 Status: [SUCCESS / FAILED]

MILESTONE 3 ACCEPTANCE CRITERIA STATUS:
  ✅ /healthz = 200 on production: [MET/NOT MET]
  ✅ Daily automated DB backups verified: [MET/NOT MET]
  ✅ No Sev-1/2 issues: [MET/NOT MET]

[If failed, list failing steps and errors]

Manual Testing Required:
  - Frontend application functionality
  - Worker search (name/skill/cert)
  - Assignment conflict warnings
  - Activity log viewer
  - Complete API endpoint testing (requires auth)

Ready to proceed to PHASE 4: [YES/NO]
```

**USER: Review Phase 3 report. If health check passed and no critical issues, confirm to proceed to Phase 4**

---

## 📚 PHASE 4: Documentation Package Creation

### CURSOR TASK:
Create all 5 required documentation files for Milestone 3 handoff.

**Files to Create:**
1. `docs/README.md` - Project overview
2. `docs/RUNBOOK.md` - Operations manual
3. `docs/ENV_CONFIG.md` - Environment configuration
4. `docs/API_DOCUMENTATION.md` - API reference
5. `docs/USER_GUIDE.md` - End-user instructions

### STEP 4.1: Create docs/ Directory
```bash
# Create docs directory if it doesn't exist
mkdir -p docs

# Verify directory created
ls -la docs/
```

**Acceptance Criteria**:
- [ ] `docs/` directory exists
- [ ] Directory is in repository root

---

### STEP 4.2: Create README.md

**FILE**: `docs/README.md`

**CURSOR INSTRUCTIONS**:
Create a comprehensive README.md file with the following sections:

**Required Content**:
1. **Project Title & Overview**
   - Social Catering MVP
   - Purpose: Worker/shift/assignment management for GravyWork
   - Milestone status (1, 2, 3 complete)

2. **Tech Stack**
   - Backend: Rails 7 API
   - Frontend: React 18 + TypeScript SPA
   - Database: PostgreSQL (Heroku Standard-0)
   - Hosting: Heroku

3. **Repository Structure**
   - List main directories (app/, config/, db/, client/, etc.)
   - Explain purpose of each

4. **Local Development Setup**
   - Prerequisites (Ruby version, Node version, PostgreSQL)
   - Installation steps
   - Database setup commands
   - How to run Rails server
   - How to run React dev server

5. **Testing**
   - How to run backend tests
   - How to run smoke tests
   - API endpoint documentation reference

6. **Deployment**
   - Staging deployment process
   - Production deployment process
   - Migration workflow

7. **Architecture Diagram**
   - Simple text/ASCII diagram showing client → API → database flow

8. **Contact & Support**
   - Repository owner: @kishanssg
   - GravyWork ops team: Natalie, Madison, Sarah
   - 30-day bug-fix warranty info

**Acceptance Criteria**:
- [ ] File created at `docs/README.md`
- [ ] All 8 sections included
- [ ] Markdown formatting is correct
- [ ] No placeholder text (e.g., "TODO")
- [ ] File is >50 lines (comprehensive)

---

### STEP 4.3: Create RUNBOOK.md

**FILE**: `docs/RUNBOOK.md`

**CURSOR INSTRUCTIONS**:
Create an operations runbook with these sections:

**Required Content**:
1. **Overview**
   - Purpose of this runbook
   - Intended audience (ops team, DevOps)

2. **Daily Operations**
   - Checking application health
   - Monitoring backups
   - Reviewing logs

3. **Deployment Procedures**
   - Deploying to staging
   - Deploying to production
   - Running migrations
   - Rollback procedure

4. **Database Operations**
   - **Backup Procedures** (⚠️ CRITICAL)
     - Viewing backup schedule
     - Creating manual backup
     - Verifying backups
   - **Restore Procedures** (⚠️ CRITICAL)
     - When to restore
     - How to restore from backup
     - Step-by-step restore commands
   - Database maintenance
   - Copying production to staging

5. **Monitoring & Health Checks**
   - /healthz endpoint
   - Application logs
   - Dyno status
   - Database metrics

6. **Common Troubleshooting**
   - App won't start
   - Database connection errors
   - Migration failures
   - Backup failures
   - Performance issues

7. **Incident Response**
   - Severity levels (Sev-1, Sev-2, Sev-3)
   - Escalation procedures
   - Emergency contacts

8. **Scaling**
   - How to scale dynos
   - When to upgrade database plan

**Acceptance Criteria**:
- [ ] File created at `docs/RUNBOOK.md`
- [ ] All 8 sections included
- [ ] Backup/restore procedures are detailed with commands
- [ ] Troubleshooting section has actual solutions
- [ ] File is >100 lines (detailed)

---

### STEP 4.4: Create ENV_CONFIG.md

**FILE**: `docs/ENV_CONFIG.md`

**CURSOR INSTRUCTIONS**:
Document all environment variables used in the application.

**Required Content**:
1. **Overview**
   - Purpose of environment variables
   - Security note (never commit secrets)

2. **Required Variables**
   - List each variable with:
     - Name
     - Description
     - Example value (sanitized)
     - Where it's used
     - Required for staging/production

3. **Rails-Specific Variables**
   - RAILS_ENV
   - RAILS_LOG_TO_STDOUT
   - RAILS_SERVE_STATIC_FILES
   - SECRET_KEY_BASE

4. **Node/React Variables**
   - NODE_ENV
   - Any API endpoint URLs

5. **Database Configuration**
   - DATABASE_URL (auto-set by Heroku)

6. **Third-Party Services** (if applicable)
   - SMTP configuration
   - External APIs
   - File storage (S3, etc.)

7. **How to Manage Variables**
   - Setting variables in Heroku
   - Local development (.env files)
   - Rotating secrets

8. **Staging vs Production**
   - Variables that differ between environments
   - How to verify configuration

**Acceptance Criteria**:
- [ ] File created at `docs/ENV_CONFIG.md`
- [ ] All sections included
- [ ] NO actual secret values included (only descriptions)
- [ ] Clear distinction between staging and production
- [ ] File is >50 lines

---

### STEP 4.5: Create API_DOCUMENTATION.md

**FILE**: `docs/API_DOCUMENTATION.md`

**CURSOR INSTRUCTIONS**:
Create comprehensive API documentation based on Milestone 1 & 2 requirements.

**Required Content**:
1. **Overview**
   - API purpose
   - Base URLs (staging and production)
   - Authentication method

2. **Authentication**
   - Email/password authentication for 3 admins
   - How to obtain token
   - How to use token in requests
   - Token expiration

3. **Workers Endpoints**
   - GET /api/workers (list)
   - GET /api/workers/:id (details)
   - POST /api/workers (create)
   - PATCH /api/workers/:id (update)
   - DELETE /api/workers/:id (delete)
   - GET /api/workers/search (search by name/skill/cert)
   - Status flow endpoints

4. **Shifts Endpoints**
   - Full CRUD operations
   - Request/response formats

5. **Assignments Endpoints**
   - Full CRUD operations
   - Conflict checks:
     - Time overlap detection
     - Capacity limits
     - Certificate expiration checks
   - Status flow

6. **Activity Logs Endpoints**
   - GET activity logs
   - Triggered on create/update/delete

7. **Response Formats**
   - Success responses
   - Error responses
   - Pagination (if applicable)

8. **Examples**
   - curl examples for each endpoint
   - Request payloads
   - Expected responses

**Acceptance Criteria**:
- [ ] File created at `docs/API_DOCUMENTATION.md`
- [ ] All Milestone 1 endpoints documented (Workers, Shifts, Assignments)
- [ ] Conflict check logic explained
- [ ] curl examples provided
- [ ] Request/response formats shown
- [ ] File is >150 lines (comprehensive)

---

### STEP 4.6: Create USER_GUIDE.md

**FILE**: `docs/USER_GUIDE.md`

**CURSOR INSTRUCTIONS**:
Create an end-user guide for GravyWork operations team (Natalie, Madison, Sarah).

**Required Content**:
1. **Introduction**
   - What is Social Catering MVP
   - Who should use this guide
   - How to access the application

2. **Getting Started**
   - Login instructions
   - Dashboard overview
   - Navigation

3. **Managing Workers**
   - How to add a new worker
   - How to search for workers (by name, skill, certification)
   - How to edit worker details
   - How to view worker status

4. **Managing Shifts**
   - How to create a shift
   - How to edit shift details
   - How to view all shifts

5. **Creating Assignments**
   - How to assign workers to shifts
   - Understanding conflict warnings:
     - Time overlap (worker already assigned)
     - Capacity limits (shift full)
     - Certificate expiration (worker cert expired)
   - How to resolve conflicts

6. **Activity Logs**
   - How to view activity logs
   - What information is logged
   - Filtering logs

7. **Common Workflows**
   - Weekly shift planning workflow
   - Emergency worker replacement
   - Reviewing daily assignments

8. **FAQ & Troubleshooting**
   - Common questions
   - What to do if something doesn't work
   - Who to contact for support

**Acceptance Criteria**:
- [ ] File created at `docs/USER_GUIDE.md`
- [ ] All 8 sections included
- [ ] Written for non-technical users
- [ ] Screenshots or diagrams (optional but helpful)
- [ ] Clear step-by-step instructions
- [ ] File is >75 lines

---

### STEP 4.7: Commit Documentation Files
```bash
# Add all documentation files
git add docs/

# Check what will be committed
git status

# Commit documentation
git commit -m "Add Milestone 3 documentation package

- README.md: Project overview and setup
- RUNBOOK.md: Operations manual with backup/restore procedures
- ENV_CONFIG.md: Environment variable documentation
- API_DOCUMENTATION.md: Complete API reference
- USER_GUIDE.md: End-user instructions for ops team

Milestone 3 requirement: Documentation package complete"

# Push to GitHub
git push origin main
```

**Acceptance Criteria**:
- [ ] All 5 documentation files added to git
- [ ] Commit message is descriptive
- [ ] Files pushed to GitHub
- [ ] Files visible in repository

---

### PHASE 4 COMPLETION REPORT:

```
✅ PHASE 4 COMPLETE: Documentation Package
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documentation Files Created:

1. docs/README.md
   Status: [CREATED/FAILED]
   Sections: [count]
   Line Count: [lines]
   Completeness: [COMPLETE/INCOMPLETE]

2. docs/RUNBOOK.md
   Status: [CREATED/FAILED]
   Sections: [count]
   Line Count: [lines]
   Backup/Restore Procedures: [INCLUDED/MISSING]
   Completeness: [COMPLETE/INCOMPLETE]

3. docs/ENV_CONFIG.md
   Status: [CREATED/FAILED]
   Variables Documented: [count]
   Line Count: [lines]
   Secrets Sanitized: [YES/NO]
   Completeness: [COMPLETE/INCOMPLETE]

4. docs/API_DOCUMENTATION.md
   Status: [CREATED/FAILED]
   Endpoints Documented: [count]
   curl Examples: [INCLUDED/MISSING]
   Line Count: [lines]
   Completeness: [COMPLETE/INCOMPLETE]

5. docs/USER_GUIDE.md
   Status: [CREATED/FAILED]
   Sections: [count]
   Line Count: [lines]
   User-Friendly: [YES/NO]
   Completeness: [COMPLETE/INCOMPLETE]

Git Commit:
   Status: [COMMITTED/NOT COMMITTED]
   Pushed to GitHub: [YES/NO]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Phase 4 Status: [SUCCESS / FAILED]

MILESTONE 3 REQUIREMENT:
  ✅ Documentation package complete: [MET/NOT MET]

[If any file incomplete or failed, list details]

Ready to proceed to PHASE 5: [YES/NO]
```

**USER: Review Phase 4 report. Check documentation files in repository. Confirm to proceed to Phase 5 for final acceptance**

---

## 🎯 PHASE 5: Final Acceptance & Completion

### CURSOR TASK:
Verify all Milestone 3 acceptance criteria are met and generate final completion report.

### STEP 5.1: Run All Verification Commands
```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MILESTONE 3 FINAL VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1. Production App Exists:"
heroku apps:info -a sc-mvp-production | grep "Web URL"

echo ""
echo "2. Health Endpoint Returns 200 (CRITICAL):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://sc-mvp-production.herokuapp.com/healthz

echo ""
echo "3. Daily Backups Scheduled:"
heroku pg:backups:schedules -a sc-mvp-production

echo ""
echo "4. Backup Exists:"
heroku pg:backups -a sc-mvp-production | head -3

echo ""
echo "5. PostgreSQL Plan (Standard-0+):"
heroku addons:info heroku-postgresql -a sc-mvp-production | grep "Plan:"

echo ""
echo "6. Documentation Files:"
ls -la docs/ | grep -E '(README|RUNBOOK|ENV_CONFIG|API_DOCUMENTATION|USER_GUIDE)\.md'

echo ""
echo "7. Production Logs (No Critical Errors):"
heroku logs -n 50 -a sc-mvp-production | grep -iE '(error|exception|fatal)' | head -5 || echo "No critical errors found"

echo ""
echo "8. Database Has Data:"
heroku run rails runner "puts 'Workers: ' + Worker.count.to_s + ', Shifts: ' + Shift.count.to_s" -a sc-mvp-production

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

### STEP 5.2: Generate Milestone 3 Acceptance Checklist

**CURSOR INSTRUCTIONS**: Print this checklist with actual statuses:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 3 ACCEPTANCE CRITERIA CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Official Acceptance Criteria (from Milestone 3):

  ✅ /healthz = 200 on production
     Status: [✓ MET / ✗ NOT MET]
     Actual HTTP Code: [200/other]
     URL: https://sc-mvp-production.herokuapp.com/healthz

  ✅ Daily automated DB backups verified
     Status: [✓ MET / ✗ NOT MET]
     Schedule: [daily at 2:00 AM / other]
     Backups Exist: [YES/NO]
     Last Backup: [timestamp]

  ✅ No Sev-1/2 issues
     Status: [✓ MET / ✗ NOT MET]
     Critical Errors in Logs: [count or "None"]
     Application Status: [running/crashed]

Additional Requirements:

  ✅ Production deploy on Client's Heroku
     Status: [✓ MET / ✗ NOT MET]
     App Name: sc-mvp-production
     Owner: [heroku account]

  ✅ Documentation package complete
     Status: [✓ MET / ✗ NOT MET]
     README.md: [✓/✗]
     RUNBOOK.md: [✓/✗]
     ENV_CONFIG.md: [✓/✗]
     API_DOCUMENTATION.md: [✓/✗]
     USER_GUIDE.md: [✓/✗]

  ⏳ Code transferred to GravyWork's private GitHub
     Status: [PENDING - requires user action]
     Current Repo: kishanssg/social-catering-mvp

  ⏳ 60-90 min handoff session
     Status: [PENDING - requires scheduling]

  ⏳ 30-day Sev-1/2 bug-fix warranty
     Status: [PENDING - starts from handoff]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERALL MILESTONE 3 STATUS: [COMPLETE / INCOMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[If incomplete, list what's missing]
```

---

### STEP 5.3: Generate Production Information Summary

**CURSOR INSTRUCTIONS**: Create a summary document for handoff:

```markdown
# Social Catering MVP - Production Environment Summary

## Production URLs
- **Application**: https://sc-mvp-production.herokuapp.com
- **Health Check**: https://sc-mvp-production.herokuapp.com/healthz
- **Heroku Dashboard**: https://dashboard.heroku.com/apps/sc-mvp-production

## Database Backups
- **Schedule**: Daily at 2:00 AM America/Los_Angeles
- **Retention**: 7 days (Standard-0 plan)
- **Manual Backup Command**: `heroku pg:backups:capture -a sc-mvp-production`
- **View Backups**: `heroku pg:backups -a sc-mvp-production`
- **Restore Command**: `heroku pg:backups:restore <backup-id> DATABASE_URL -a sc-mvp-production --confirm sc-mvp-production`

## Key Commands
```bash
# View logs
heroku logs --tail -a sc-mvp-production

# Check health
curl https://sc-mvp-production.herokuapp.com/healthz

# Run Rails console
heroku run rails console -a sc-mvp-production

# Run database migrations
heroku run rails db:migrate -a sc-mvp-production

# Check dyno status
heroku ps -a sc-mvp-production

# Scale dynos
heroku ps:scale web=1:standard-1x -a sc-mvp-production
```

## Monthly Costs (Estimated)
- Production Dyno: $5-25/month (depending on plan)
- PostgreSQL Standard-0: $50/month
- **Total**: ~$55-75/month

## Support Contacts
- **Developer**: @kishanssg
- **Ops Team**: Natalie, Madison, Sarah
- **Bug Reports**: [To be established during handoff]
- **Emergency Contact**: [To be established during handoff]

## Next Steps for Handoff
1. Schedule 60-90 minute handoff session with ops team
2. Transfer repository to GravyWork's GitHub organization
3. Provide access credentials to GravyWork team
4. Demonstrate all features and workflows
5. Answer questions and document any additional procedures
6. Establish 30-day bug-fix warranty process

## Documentation
All documentation is located in the `docs/` directory:
- `docs/README.md` - Project overview and setup
- `docs/RUNBOOK.md` - Operations manual
- `docs/ENV_CONFIG.md` - Environment configuration
- `docs/API_DOCUMENTATION.md` - API reference
- `docs/USER_GUIDE.md` - End-user instructions
```

Save this as: `PRODUCTION_SUMMARY.md` in repository root.

---

### PHASE 5 FINAL COMPLETION REPORT:

```
🎉 MILESTONE 3 COMPLETE - FINAL REPORT 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: Social Catering MVP
Repository: kishanssg/social-catering-mvp
Completion Date: [YYYY-MM-DD]
Completed By: @kishanssg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 0 - Pre-Flight Verification: ✅ PASSED
Phase 1 - Production Environment Setup: ✅ PASSED
Phase 2 - Database Migration & Backup: ✅ PASSED
Phase 3 - Verification & Testing: ✅ PASSED
Phase 4 - Documentation Package: ✅ PASSED
Phase 5 - Final Acceptance: ✅ PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 3 ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ /healthz = 200 on production: MET
   HTTP Status: 200
   URL: https://sc-mvp-production.herokuapp.com/healthz

✅ Daily automated DB backups verified: MET
   Schedule: Daily at 2:00 AM America/Los_Angeles
   Active Backups: [count]
   PostgreSQL Plan: standard-0

✅ No Sev-1/2 issues: MET
   Critical Errors: None
   Application Status: Running
   Dynos: Healthy

✅ Production deployed: MET
   App: sc-mvp-production
   URL: https://sc-mvp-production.herokuapp.com
   Heroku Owner: [account]

✅ Documentation package: MET
   README.md: ✓
   RUNBOOK.md: ✓
   ENV_CONFIG.md: ✓
   API_DOCUMENTATION.md: ✓
   USER_GUIDE.md: ✓
   PRODUCTION_SUMMARY.md: ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTION ENVIRONMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Application URL: https://sc-mvp-production.herokuapp.com
Health Check: https://sc-mvp-production.herokuapp.com/healthz
Database: PostgreSQL Standard-0
Backup Schedule: Daily at 2:00 AM Pacific
Backup Retention: 7 days
Estimated Monthly Cost: $55-75

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENDING HANDOFF TASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Transfer repository to GravyWork's GitHub
   Current: kishanssg/social-catering-mvp
   Target: [GravyWork's private repo]

⏳ Schedule handoff session
   Duration: 60-90 minutes
   Attendees: Ops team (Natalie, Madison, Sarah)
   Recording: Optional

⏳ Establish 30-day bug-fix warranty
   Period: 30 days from handoff date
   Scope: Sev-1/2 issues only
   Contact: [To be established]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Review PRODUCTION_SUMMARY.md
2. Test production environment manually (browser testing)
3. Schedule UAT with ops team
4. Prepare for handoff session
5. Transfer repository to GravyWork
6. Deliver final handoff

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MILESTONE 3 STATUS: COMPLETE ✅

All technical requirements met. Ready for handoff.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**END OF CURSOR MIGRATION INSTRUCTIONS**

---

## 🆘 Troubleshooting Guide for Cursor

### If Phase 1 Fails:

**Production app creation fails:**
- Check Heroku account has available app slots
- Verify billing is enabled
- Try different app name if `sc-mvp-production` is taken

**PostgreSQL provisioning fails:**
- Wait longer (can take 2-3 minutes)
- Check Heroku status page for outages
- Verify billing method is valid

**Deployment fails:**
- Check build logs: `heroku logs -a sc-mvp-production`
- Verify all dependencies in Gemfile/package.json
- Check for compilation errors

---

### If Phase 2 Fails:

**Backup creation fails:**
- Check database is accessible
- Verify database has data
- Try again (might be temporary)

**Restore fails:**
- Ensure backup URL is valid (not expired)
- Check target database is empty or confirm overwrite
- Verify source and target are compatible PostgreSQL versions

**Backup schedule fails:**
- Verify PostgreSQL plan is Standard-0 or higher
- Check for existing schedule conflicts
- Try unscheduling and rescheduling

---

### If Phase 3 Fails:

**Health check returns non-200:**
- Check application logs
- Verify dynos are running
- Check for boot timeout
- Verify /healthz route
