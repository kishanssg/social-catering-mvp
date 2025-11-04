# Deployment Guide

Safe Heroku deployment for Social Catering MVP (Rails 7 + Vite React).

## Quick Start

```bash
APP_NAME=sc-mvp-staging \
APP_URL=https://sc-mvp-staging.herokuapp.com \
ADMIN_EMAIL=your-admin@email.com \
ADMIN_PASSWORD=your-password \
npm run deploy
```

## Prerequisites

1. **Heroku CLI** installed and logged in
2. **Node.js 18+** and **Rails** installed locally
3. **Heroku app** created: `heroku create sc-mvp-staging`
4. **Config vars** set:
   ```bash
   heroku config:set RAILS_ENV=production -a sc-mvp-staging
   heroku config:set RAILS_SERVE_STATIC_FILES=true -a sc-mvp-staging
   heroku config:set SECRET_KEY_BASE=$(rails secret) -a sc-mvp-staging
   heroku config:set RAILS_MASTER_KEY=$(cat config/master.key) -a sc-mvp-staging
   ```

## What the Deploy Script Does

1. ✅ **Preflight checks** - Verifies Heroku config vars exist
2. ✅ **Build frontend** - Runs `npm ci` and `npm run build` in `social-catering-ui/`
3. ✅ **Sync assets** - Copies `dist/assets/**` → `public/assets/`
4. ✅ **Chunk check** - Verifies all referenced assets exist
5. ✅ **Route catalog** - Generates `frontend/src/api/routes.ts` from Rails routes
6. ✅ **API audit** - Checks for hardcoded `/api/` paths
7. ✅ **Git commit** - Commits built assets
8. ✅ **Heroku push** - Pushes to `https://git.heroku.com/sc-mvp-staging.git`
9. ✅ **Migrations** - Runs `rails db:migrate` on Heroku
10. ✅ **Health check** - Polls `/healthz` endpoint
11. ✅ **Smoke tests** - Tests critical API endpoints
12. ✅ **Session probe** - Verifies login session handshake works

## Fail-Fast Guardrails

The script will abort if:
- ❌ Heroku config vars are missing
- ❌ Frontend build fails
- ❌ Assets are not synced correctly
- ❌ Referenced chunks don't exist
- ❌ healthz endpoint doesn't respond
- ❌ Database migrations fail
- ❌ Smoke tests fail
- ❌ Session handshake breaks

## Manual Deployment Steps

If you need to deploy manually:

```bash
# 1. Build frontend
cd social-catering-ui
npm ci --frozen-lockfile
npm run build
cd ..

# 2. Sync assets
rm -rf public/assets
mkdir -p public/assets
cp -a social-catering-ui/dist/assets/. public/assets/
cp social-catering-ui/dist/index.html public/index.html

# 3. Check chunks
node social-catering-ui/scripts/check-chunks.js

# 4. Commit
git add public/index.html public/assets
git commit -m "chore: Deploy built assets"

# 5. Push to Heroku
git push heroku-staging main

# 6. Run migrations
heroku run rails db:migrate -a sc-mvp-staging

# 7. Verify
curl https://sc-mvp-staging.herokuapp.com/healthz
```

## Troubleshooting

### "Failed to fetch dynamically imported module"
- **Cause**: Missing assets or wrong Vite base URL
- **Fix**: Run `node social-catering-ui/scripts/check-chunks.js` and verify assets were copied

### "404 Not Found" for API endpoints
- **Cause**: Hardcoded API paths or wrong routes
- **Fix**: Run `npm run audit:api` and update to use `routes.ts`

### "Session handshake failed"
- **Cause**: CORS or missing session endpoint
- **Fix**: Verify `/api/v1/session` endpoint exists and CORS allows credentials

### "Healthz endpoint not responding"
- **Cause**: App crashed on startup
- **Fix**: Check Heroku logs: `heroku logs --tail -a sc-mvp-staging`

## Environment Variables

Required Heroku config vars:

```bash
RAILS_ENV=production
RAILS_SERVE_STATIC_FILES=true
SECRET_KEY_BASE=<generated-by-rails-secret>
RAILS_MASTER_KEY=<from-config/master.key>
DATABASE_URL=<auto-set-by-heroku>
```

## Heroku Buildpacks Order

**Critical**: Node.js must come **before** Ruby (even though we prebuild):

```bash
heroku buildpacks -a sc-mvp-staging
# Should show: heroku/nodejs (first), heroku/ruby (second)

# If wrong, fix with:
heroku buildpacks:clear -a sc-mvp-staging
heroku buildpacks:add heroku/nodejs -a sc-mvp-staging
heroku buildpacks:add heroku/ruby -a sc-mvp-staging
```

## Asset Sync Strategy

We **do not build on Heroku**. Instead:

1. Build locally: `npm run build` in `social-catering-ui/`
2. Copy artifacts: `cp dist/assets/** public/assets/`
3. Commit to git
4. Heroku serves from `public/assets/`

This prevents:
- Build failures on Heroku
- Asset hash mismatches
- Dynamic import 404s
- Stale cached assets

## Post-Deploy Checklist

After deployment, verify:

- [ ] Visit `https://sc-mvp-staging.herokuapp.com`
- [ ] Login works (no redirect loop)
- [ ] Dashboard loads
- [ ] Events page shows data
- [ ] No console errors (check DevTools)
- [ ] No "Failed to fetch" errors
- [ ] API calls succeed (check Network tab)
- [ ] Static assets load (no 404s in Network tab)

## Related Files

- `scripts/deploy-heroku.sh` - Main deploy script
- `scripts/smoke-endpoints.ts` - API smoke tests
- `scripts/probe-session.ts` - Session handshake test
- `social-catering-ui/scripts/check-chunks.js` - Chunk integrity check
- `Procfile` - Heroku process definition
- `lib/tasks/export_routes.rake` - Rails route export

