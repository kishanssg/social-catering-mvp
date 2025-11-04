# Social Catering MVP - Operations Runbook

**Purpose:** Operational procedures for maintaining and troubleshooting the Social Catering MVP application  
**Audience:** Operations team, DevOps engineers, administrators  
**Last Updated:** November 2025

---

## 📋 Table of Contents

1. [Daily Operations](#daily-operations)
2. [Deployment Procedures](#deployment-procedures)
3. [Database Operations](#database-operations)
4. [Monitoring & Health Checks](#monitoring--health-checks)
5. [Common Troubleshooting](#common-troubleshooting)
6. [Incident Response](#incident-response)
7. [Scaling Instructions](#scaling-instructions)

---

## 🔄 Daily Operations

### Health Check
```bash
# Production
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/healthz

# Staging
curl https://sc-mvp-staging.herokuapp.com/healthz
```

**Expected Response:** HTTP 200 with JSON `{"status":"ok","timestamp":"..."}`

### Check Application Logs
```bash
# Production logs (last 100 lines)
heroku logs --tail -n 100 -a sc-mvp-production

# Staging logs
heroku logs --tail -n 100 -a sc-mvp-staging

# Filter for errors
heroku logs --tail -a sc-mvp-production | grep -iE "(error|exception|fatal)"
```

### Monitor Dyno Status
```bash
# Production
heroku ps -a sc-mvp-production

# Staging
heroku ps -a sc-mvp-staging
```

**Expected:** All dynos should show `up` status

### Check Backup Status
```bash
# Production backups
heroku pg:backups -a sc-mvp-production

# Verify backup schedule
heroku pg:backups:schedules -a sc-mvp-production
```

**Expected:** Daily backup scheduled at 2:00 AM Pacific, at least one completed backup exists

---

## 🚀 Deployment Procedures

### Deploy to Staging

**Prerequisites:**
- Code committed to `main` branch
- Tests passing locally
- Git remotes configured

**Steps:**
```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Run deployment script
APP_NAME=sc-mvp-staging bash scripts/deploy-heroku.sh

# 3. Monitor deployment logs
heroku logs --tail -a sc-mvp-staging

# 4. Verify health endpoint
curl https://sc-mvp-staging.herokuapp.com/healthz
```

**Verification Checklist:**
- [ ] Build completes without errors
- [ ] Migrations run successfully
- [ ] Health endpoint returns 200
- [ ] Frontend loads correctly
- [ ] No critical errors in logs

### Deploy to Production

**⚠️ CRITICAL:** Only deploy to production after staging verification.

**Steps:**
```bash
# 1. Verify staging is working correctly
curl https://sc-mvp-staging.herokuapp.com/healthz

# 2. Deploy to production
APP_NAME=sc-mvp-production bash scripts/deploy-heroku.sh

# 3. Monitor deployment
heroku logs --tail -a sc-mvp-production

# 4. Verify production health
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/healthz
```

**Post-Deployment Verification:**
- [ ] Health endpoint returns 200
- [ ] Application loads in browser
- [ ] Login works with admin credentials
- [ ] Dashboard displays correctly
- [ ] No errors in logs

### Running Database Migrations

**⚠️ IMPORTANT:** Always run migrations manually after deployment.

```bash
# Staging
heroku run rails db:migrate -a sc-mvp-staging

# Production
heroku run rails db:migrate -a sc-mvp-production
```

**Verification:**
```bash
# Check migration status
heroku run rails runner "puts ActiveRecord::Base.connection.migration_context.current_version" -a sc-mvp-production
```

### Rollback Procedure

**If deployment fails or causes issues:**

```bash
# 1. List recent releases
heroku releases -a sc-mvp-production

# 2. Rollback to previous version
heroku rollback v<PREVIOUS_VERSION> -a sc-mvp-production

# Example: Rollback to v8 if v9 is broken
heroku rollback v8 -a sc-mvp-production

# 3. Verify rollback
heroku releases -a sc-mvp-production | head -3
```

**⚠️ WARNING:** Rollback will revert code changes. Database migrations are NOT automatically rolled back.

---

## 💾 Database Operations

### Backup Procedures

#### View Backup Schedule
```bash
# Production
heroku pg:backups:schedules -a sc-mvp-production
```

**Expected Output:**
```
DATABASE_URL: daily at 2:00 America/Los_Angeles
```

#### Create Manual Backup
```bash
# Production
heroku pg:backups:capture -a sc-mvp-production

# Verify backup created
heroku pg:backups -a sc-mvp-production
```

**Backup Status:**
- `Completed` - Backup successful
- `Running` - Backup in progress
- `Failed` - Backup failed (check logs)

#### Verify Backup
```bash
# List all backups
heroku pg:backups -a sc-mvp-production

# Get backup details
heroku pg:backups:info <BACKUP_ID> -a sc-mvp-production
```

**Check Backup Size:**
- Should be non-zero (typically 1-50 MB for MVP)
- Size should match database size

#### Download Backup
```bash
# Download latest backup
heroku pg:backups:download -a sc-mvp-production

# This creates: latest.dump
ls -lh latest.dump
```

**Use Cases:**
- Local testing with production data (sanitized)
- Backup verification
- Disaster recovery preparation

### Restore Procedures

#### ⚠️ CRITICAL WARNING
**Restoring a backup will COMPLETELY OVERWRITE the target database.** All current data will be lost.

#### When to Restore
- Production database corruption
- Accidental data deletion
- Testing with production data in staging
- Disaster recovery

#### Restore from Backup

**Step 1: Identify Backup to Restore**
```bash
# List available backups
heroku pg:backups -a sc-mvp-production

# Get backup URL
heroku pg:backups:url <BACKUP_ID> -a sc-mvp-production
```

**Step 2: Restore to Production**
```bash
# Get backup URL
BACKUP_URL=$(heroku pg:backups:url <BACKUP_ID> -a sc-mvp-production)

# Restore (THIS OVERWRITES DATABASE)
heroku pg:backups:restore "$BACKUP_URL" DATABASE_URL \
  -a sc-mvp-production \
  --confirm sc-mvp-production
```

**Step 3: Verify Restore**
```bash
# Wait for restore to complete (30-60 seconds)
sleep 60

# Check restore status
heroku pg:backups -a sc-mvp-production

# Verify data
heroku run rails runner "
  puts 'Workers: ' + Worker.count.to_s
  puts 'Shifts: ' + Shift.count.to_s
  puts 'Assignments: ' + Assignment.count.to_s
" -a sc-mvp-production
```

#### Restore Staging from Production
```bash
# 1. Create production backup
heroku pg:backups:capture -a sc-mvp-production

# 2. Get production backup URL
PROD_BACKUP_URL=$(heroku pg:backups:url -a sc-mvp-production)

# 3. Restore to staging
heroku pg:backups:restore "$PROD_BACKUP_URL" DATABASE_URL \
  -a sc-mvp-staging \
  --confirm sc-mvp-staging

# 4. Sanitize sensitive data (optional)
heroku run rails console -a sc-mvp-staging
# In console: User.update_all(email: -> { "test_#{id}@example.com" })
```

### Database Maintenance

#### Check Database Size
```bash
heroku pg:info -a sc-mvp-production
```

#### Check Connection Count
```bash
heroku pg:info -a sc-mvp-production | grep "Connections"
```

#### Vacuum Database (if needed)
```bash
heroku pg:vacuum -a sc-mvp-production
```

**Note:** Standard-0 plan includes automatic vacuuming. Manual vacuum rarely needed.

---

## 📊 Monitoring & Health Checks

### Health Endpoint

**Endpoint:** `/healthz`  
**Method:** GET  
**Authentication:** Not required

```bash
# Production
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/healthz

# Expected response
{"status":"ok","timestamp":"2025-11-04T19:05:51Z"}
```

**Failure Indicators:**
- HTTP 500: Application error
- HTTP 503: Database connection issue
- Timeout: Dyno not responding

### Application Logs

#### View Recent Logs
```bash
# Production (last 100 lines)
heroku logs -n 100 -a sc-mvp-production

# Tail logs (real-time)
heroku logs --tail -a sc-mvp-production
```

#### Filter Logs
```bash
# Errors only
heroku logs --tail -a sc-mvp-production | grep -i error

# Specific controller
heroku logs --tail -a sc-mvp-production | grep WorkersController

# Time range (requires Heroku CLI addon)
heroku logs --tail -a sc-mvp-production --since "1 hour ago"
```

### Dyno Status

```bash
# Check dyno status
heroku ps -a sc-mvp-production

# Expected output
=== web (Basic): bundle exec puma -C config/puma.rb (1)
web.1: up 2025/11/04 16:25:03 -0500 (~ 1m ago)
```

**Status Indicators:**
- `up` - Dyno is running
- `idle` - Dyno is sleeping (if on Eco plan)
- `crashed` - Dyno failed to start
- `restarting` - Dyno is restarting

### Database Metrics

```bash
# Database info
heroku pg:info -a sc-mvp-production

# Connection stats
heroku pg:info -a sc-mvp-production | grep -i connection
```

---

## 🔧 Common Troubleshooting

### App Won't Start

**Symptoms:**
- Health endpoint returns 500/503
- Dyno shows `crashed` status
- No response from application

**Diagnosis:**
```bash
# Check logs for errors
heroku logs --tail -n 200 -a sc-mvp-production | grep -iE "(error|exception|fatal)"

# Check dyno status
heroku ps -a sc-mvp-production

# Check recent releases
heroku releases -a sc-mvp-production | head -5
```

**Common Causes:**
- Missing environment variables
- Database connection issues
- Migration errors
- Build failures

**Solutions:**
1. Check environment variables: `heroku config -a sc-mvp-production`
2. Verify database: `heroku pg:info -a sc-mvp-production`
3. Run migrations: `heroku run rails db:migrate -a sc-mvp-production`
4. Check build logs: `heroku releases:info -a sc-mvp-production`

### Database Connection Errors

**Symptoms:**
- 500 errors on API requests
- Health endpoint returns 503
- Logs show "ActiveRecord::ConnectionPoolError"

**Diagnosis:**
```bash
# Test database connection
heroku run rails runner "puts ActiveRecord::Base.connection.active? ? 'OK' : 'FAILED'" -a sc-mvp-production

# Check database status
heroku pg:info -a sc-mvp-production
```

**Solutions:**
1. Verify `DATABASE_URL` is set: `heroku config:get DATABASE_URL -a sc-mvp-production`
2. Check database plan: `heroku addons:info heroku-postgresql -a sc-mvp-production`
3. Restart dynos: `heroku restart -a sc-mvp-production`
4. If persistent, contact Heroku support

### Migration Failures

**Symptoms:**
- Migration command fails
- Application errors on startup
- Database schema mismatch

**Diagnosis:**
```bash
# Check current schema version
heroku run rails runner "puts ActiveRecord::Base.connection.migration_context.current_version" -a sc-mvp-production

# Check pending migrations
heroku run rails db:migrate:status -a sc-mvp-production
```

**Solutions:**
1. Review migration file for errors
2. Check for database locks: `heroku pg:locks -a sc-mvp-production`
3. Run migration manually: `heroku run rails db:migrate -a sc-mvp-production`
4. If migration fails, create fix migration (do NOT rollback in production)

### Backup Failures

**Symptoms:**
- Backup shows "Failed" status
- No recent backups
- Backup schedule inactive

**Diagnosis:**
```bash
# Check backup status
heroku pg:backups -a sc-mvp-production

# Check schedule
heroku pg:backups:schedules -a sc-mvp-production

# Check database plan
heroku addons:info heroku-postgresql -a sc-mvp-production
```

**Solutions:**
1. Verify PostgreSQL plan is Standard-0 or higher
2. Check database size (backups may fail if database is too large)
3. Create manual backup: `heroku pg:backups:capture -a sc-mvp-production`
4. Reschedule backups: `heroku pg:backups:schedule DATABASE_URL --at '02:00 America/Los_Angeles' -a sc-mvp-production`

### Performance Issues

**Symptoms:**
- Slow API responses
- Timeout errors
- High response times

**Diagnosis:**
```bash
# Check dyno metrics
heroku ps -a sc-mvp-production

# Check database query performance
heroku logs --tail -a sc-mvp-production | grep -i "slow"

# Check connection pool
heroku pg:info -a sc-mvp-production | grep -i connection
```

**Solutions:**
1. Scale dynos: `heroku ps:scale web=2:standard-1x -a sc-mvp-production`
2. Upgrade database plan if connection limit reached
3. Review N+1 queries in logs
4. Add database indexes for slow queries

### Frontend Asset Loading Errors (404 on chunks)

**Symptoms:**
- Frontend shows blank page
- Browser console shows "Failed to fetch dynamically imported module"
- Assets return 404

**Diagnosis:**
```bash
# Check if assets exist on Heroku
heroku run 'ls -la public/assets/ | head -10' -a sc-mvp-production

# Check index.html
heroku run 'cat public/index.html | grep assets' -a sc-mvp-production
```

**Solutions:**
1. Rebuild frontend: `cd social-catering-ui && npm run build`
2. Copy assets: `cp -a social-catering-ui/dist/assets/. public/assets/`
3. Commit and redeploy: `git add public/ && git commit -m "Fix assets" && git push production main`
4. Verify chunk integrity in deployment script

---

## 🚨 Incident Response

### Severity Levels

**Sev-1 (Critical):**
- Production application down
- Data loss or corruption
- Security breach
- **Response Time:** Immediate

**Sev-2 (Major):**
- Major functionality broken
- Performance degradation affecting users
- Backup failures
- **Response Time:** 2 hours

**Sev-3 (Minor):**
- Minor bugs
- UI issues
- Non-critical feature requests
- **Response Time:** 24 hours

### Escalation Procedures

1. **Identify Issue:** Check logs, health endpoint, dyno status
2. **Assess Severity:** Determine Sev-1/2/3
3. **Immediate Actions:**
   - Sev-1: Rollback if recent deployment
   - Check backups if data corruption suspected
   - Restart dynos if app crashed
4. **Document:** Record issue, steps taken, resolution
5. **Notify:** Contact ops team and stakeholders

### Emergency Contacts

**During Migration (kishanssg):**
- GitHub: @kishanssg
- Repository: kishanssg/social-catering-mvp

**Post-Handoff (GravyWork):**
- Ops Team: Natalie, Madison, Sarah
- Emergency Contact: [To be established during handoff]

**Heroku Support:**
- Standard: https://help.heroku.com/
- Critical: Open ticket via Heroku dashboard

### Rollback Decision Tree

```
Production Issue?
├─ Yes → Recent Deployment (< 1 hour)?
│   ├─ Yes → Rollback to previous release
│   └─ No → Check logs, diagnose, fix
└─ No → Troubleshoot, fix, deploy
```

---

## 📈 Scaling Instructions

### Scale Dynos

**Current Configuration:**
- Production: 1 Basic dyno ($7/month)
- Staging: 1 Basic dyno ($7/month)

**Scale Up:**
```bash
# Scale to 2 dynos
heroku ps:scale web=2:standard-1x -a sc-mvp-production

# Scale to 3 dynos
heroku ps:scale web=3:standard-1x -a sc-mvp-production
```

**Scale Down:**
```bash
# Scale back to 1 dyno
heroku ps:scale web=1:basic -a sc-mvp-production
```

### Upgrade Database Plan

**Current Plan:** Standard-0 ($50/month)

**Upgrade If:**
- Database size > 10 GB
- Connection limit reached
- Need longer backup retention (> 7 days)

**Upgrade Command:**
```bash
# Upgrade to Standard-1
heroku addons:upgrade heroku-postgresql:standard-1 -a sc-mvp-production
```

**Plans Available:**
- Standard-0: $50/month (10 GB, 7-day backups)
- Standard-1: $200/month (64 GB, 7-day backups)
- Premium-0: $600/month (256 GB, 30-day backups)

### Cost Estimation

**Current Monthly Costs:**
- Production Dyno (Basic): $7
- Database (Standard-0): $50
- **Total:** ~$57/month

**Scaled Costs (2 dynos + Standard-1):**
- Production Dynos (2x Standard-1x): $50
- Database (Standard-1): $200
- **Total:** ~$250/month

---

## 📝 Log Access and Analysis

### Accessing Logs

```bash
# Real-time logs
heroku logs --tail -a sc-mvp-production

# Last 100 lines
heroku logs -n 100 -a sc-mvp-production

# Time range (if addon enabled)
heroku logs --tail -a sc-mvp-production --since "2 hours ago"
```

### Log Analysis

**Common Patterns:**
- `ERROR` - Application errors
- `ActiveRecord::RecordInvalid` - Validation failures
- `PG::ConnectionTimeout` - Database connection issues
- `ActionController::RoutingError` - 404 errors

**Filter Examples:**
```bash
# All errors
heroku logs --tail -a sc-mvp-production | grep -i error

# Specific controller
heroku logs --tail -a sc-mvp-production | grep WorkersController

# Database queries
heroku logs --tail -a sc-mvp-production | grep "SELECT"
```

---

## ✅ Maintenance Checklist

### Daily
- [ ] Check health endpoint (automated)
- [ ] Review logs for errors
- [ ] Verify backup completed (check schedule)

### Weekly
- [ ] Review backup status
- [ ] Check database size
- [ ] Review application performance
- [ ] Check for pending migrations

### Monthly
- [ ] Review monthly costs
- [ ] Verify backup retention (7 days)
- [ ] Review security logs
- [ ] Update documentation if needed

---

**Last Updated:** November 2025  
**Next Review:** December 2025

For API reference, see `docs/API_DOCUMENTATION.md`.  
For environment configuration, see `docs/ENV_CONFIG.md`.

