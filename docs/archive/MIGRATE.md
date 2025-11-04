# MIGRATE.md

## Current State Assessment
Documenting the current status of the system:
- **Backend**: A Rails 7 API serving the application logic.
- **Frontend**: A React 18 application serving the user interface.
- **Deployment**: Currently deployed to a staging environment.


## Production Migration Goals
- Create a production environment by copying `sc-mvp-staging` to `sc-mvp-production`.
- Implement daily automated backups of the production database.


## Database Sync Strategy
- Establish a one-way sync workflow from Production to Staging, ensuring that production data is reflected in staging without overwriting production data.


## Phase-by-Phase Implementation Plan
### Phase 1: Production Environment Setup (1 hour)
#### Steps:
1. Log in to Heroku.
   ```bash
   heroku login
   ```
2. Create a new Heroku app for production.
   ```bash
   heroku create sc-mvp-production
   ```
3. Set environment variables needed for production.
   ```bash
   heroku config:set RAILS_ENV=production --app sc-mvp-production
   ```
#### Acceptance Criteria:
- [ ] Production Heroku app is created
- [ ] Environment variables are set correctly


### Phase 2: Database Migration & Backup Configuration (1 hour)
#### Steps:
1. Provision the Heroku Postgres database.
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev --app sc-mvp-production
   ```
2. Set up automated database backups.
   ```bash
   heroku pg:backups:schedule DATABASE_URL --app sc-mvp-production --at '02:00 UTC' --frequency daily
   ```
3. Migrate the database from staging to production.
   ```bash
   # Assuming a backup system is in place for management
   heroku pg:copy sc-mvp-staging::DATABASE_URL DATABASE_URL --app sc-mvp-production
   ```
#### Acceptance Criteria:
- [ ] Database is provisioned
- [ ] Automated backups are configured
- [ ] Data migration is successful


### Phase 3: Verification & Documentation (30 minutes)
#### Steps:
1. Verify the production deployment:
   - Access the production URL and check for proper functionality.
   - Run tests to check API endpoints.
   ```bash
   # Run automated tests
   heroku run rake test --app sc-mvp-production
   ```
2. Document the migration process in this file.
#### Acceptance Criteria:
- [ ] Production site is functioning without errors
- [ ] Tests pass successfully
- [ ] Migration steps are documented


## Rollback Procedures
In case of issues during migration:
- Restore database from last successful backup:
   ```bash
   heroku pg:backups:restore b001 DATABASE_URL --app sc-mvp-production
   ```
- Re-deploy previous stable version of the application:
   ```bash
   heroku rollback --app sc-mvp-production
   ```


## Cost Breakdown for Heroku Resources
- **Heroku Postgres**: $7/month (Hobby tier)
- **Heroku Dynos**: $25/month (Hobby tier)
- **Total Estimated Monthly Cost**: $32/month


## Troubleshooting Guide for Common Issues
- **Deployment Failures**: Check Heroku logs.
   ```bash
   heroku logs --tail --app sc-mvp-production
   ```
- **Database Errors**: Ensure migrations are run in the correct order.
   ```bash
   heroku run rails db:migrate --app sc-mvp-production
   ```
- **Timeout Errors**: Increase timeout settings in Heroku settings.
   
---

This document provides a comprehensive migration plan for transitioning from a staging environment to production deployment in the `kishanssg/social-catering-mvp` repository.