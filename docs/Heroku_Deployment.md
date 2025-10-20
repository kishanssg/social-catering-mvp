# Social Catering MVP – Heroku Deployment Guide

## Overview
Two-app deployment:
- API: Rails 7 + PostgreSQL + Devise (Active Storage ready)
- UI: React 18 + Vite (served as a static SPA)

## Prerequisites
- Heroku CLI logged in (`heroku login`)
- Git remotes set up
- Optional: AWS account ready for future S3 switch

---

## 1) Create Heroku Apps
```bash
# API
heroku create social-catering-api --region us

# UI
heroku create social-catering-ui --region us
```

## 2) Add Postgres (API)
```bash
heroku addons:create heroku-postgresql:mini -a social-catering-api
```

## 3) Buildpacks (Monorepo)
```bash
# API
heroku buildpacks:add https://github.com/lstoll/heroku-buildpack-monorepo -a social-catering-api
heroku buildpacks:add heroku/ruby -a social-catering-api
heroku buildpacks:add heroku/nodejs -a social-catering-api

# UI
heroku buildpacks:add https://github.com/lstoll/heroku-buildpack-monorepo -a social-catering-ui
heroku buildpacks:add heroku/nodejs -a social-catering-ui
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static -a social-catering-ui
```

## 4) Monorepo base dirs
```bash
# API serves from repo root
heroku config:set APP_BASE=. -a social-catering-api

# UI is in subdirectory
heroku config:set APP_BASE=social-catering-ui -a social-catering-ui
```

## 5) API Environment
```bash
heroku config:set -a social-catering-api \
  RAILS_ENV=production \
  RAILS_LOG_TO_STDOUT=enabled \
  RAILS_SERVE_STATIC_FILES=false \
  RAILS_MASTER_KEY="$(cat config/master.key)" \
  SECRET_KEY_BASE="$(bundle exec rails secret)" \
  WEB_CONCURRENCY=2 \
  RAILS_MAX_THREADS=5 \
  DB_POOL=10 \
  CORS_ORIGINS=https://social-catering-ui.herokuapp.com

# Optional
# heroku config:set GOOGLE_PLACES_API_KEY=your_key -a social-catering-api
```

## 6) UI Environment
```bash
heroku config:set -a social-catering-ui \
  NODE_ENV=production \
  NODE_OPTIONS="--max-old-space-size=1536" \
  VITE_API_URL=https://social-catering-api.herokuapp.com \
  NPM_CONFIG_PRODUCTION=false
```

## 7) Git remotes
```bash
git remote add heroku-api https://git.heroku.com/social-catering-api.git
git remote add heroku-ui https://git.heroku.com/social-catering-ui.git
```

## 8) Deploy API
```bash
git push heroku-api main
heroku run rails db:migrate -a social-catering-api
# Optional seeds
# heroku run rails db:seed -a social-catering-api
```

## 9) Deploy UI
```bash
# Heroku builds UI
git push heroku-ui main
```

### Alternative: Serve UI from Rails (single app)
```bash
# Build locally
cd social-catering-ui && npm ci && npm run build && cd ..
# Copy to Rails public/
cp -R social-catering-ui/dist/* public/
# Commit and deploy API app only
```

## 10) Verify
- API health: `https://social-catering-api.herokuapp.com/healthz`
- UI: `https://social-catering-ui.herokuapp.com`
- Login with admin users
- CORS permits UI origin

---

## Maintenance
```bash
# Logs
heroku logs --tail -a social-catering-api
heroku logs --tail -a social-catering-ui

# Rails console
heroku run rails console -a social-catering-api

# DB backups
heroku pg:backups:capture -a social-catering-api

# Restart
heroku restart -a social-catering-api
heroku restart -a social-catering-ui
```

## Troubleshooting
- TypeScript build: relax typechecks in UI build if needed (use `skipLibCheck` and run typecheck in CI)
- CORS: `heroku config:set CORS_ORIGINS=https://social-catering-ui.herokuapp.com -a social-catering-api`
- RAILS_MASTER_KEY: ensure it’s set on the API app

---

## Active Storage (Photos)
- Current: Disk service (works but ephemeral on Heroku)
- Recommended: Switch to S3 later (production):
  - Add gems `aws-sdk-s3`, `image_processing`
  - Set `config.active_storage.service = :amazon` in production.rb
  - Add env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
  - Redeploy
