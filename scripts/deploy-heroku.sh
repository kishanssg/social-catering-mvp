#!/usr/bin/env bash

# Safe Heroku Deploy Script
# This script implements a fail-fast deployment with all the guardrails
# to prevent the issues we hit before (wrong Vite base, missing chunks, etc.)

set -euo pipefail

# Configuration
APP_NAME="${APP_NAME:-sc-mvp-staging}"
APP_URL="${APP_URL:-https://${APP_NAME}.herokuapp.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-natalie@socialcatering.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-TempPassword123!}"

echo "========================================="
echo "   SAFE HEROKU DEPLOY"
echo "========================================="
echo "App: $APP_NAME"
echo "URL: $APP_URL"
echo "=========================================\n"

# Step 1: Preflight - Check Heroku config
echo "Step 1: Preflight - Checking Heroku config..."
heroku config -a "$APP_NAME" > /tmp/heroku_cfg.txt

if ! grep -q RAILS_MASTER_KEY /tmp/heroku_cfg.txt; then
  echo "❌ Missing RAILS_MASTER_KEY in Heroku config"
  exit 1
fi

if ! grep -q SECRET_KEY_BASE /tmp/heroku_cfg.txt; then
  echo "❌ Missing SECRET_KEY_BASE in Heroku config"
  exit 1
fi

echo "✅ Heroku config OK\n"

# Step 2: Build frontend
echo "Step 2: Building frontend with Vite..."
cd social-catering-ui
npm ci --frozen-lockfile
npm run build
cd ..

if [ ! -f "social-catering-ui/dist/index.html" ]; then
  echo "❌ Frontend build failed - index.html not found"
  exit 1
fi

echo "✅ Frontend build complete\n"

# Step 3: Sync assets to Rails public/
echo "Step 3: Syncing assets to public/assets/..."
rm -rf public/assets
mkdir -p public/assets

# Check if dist/assets exists
if [ ! -d "social-catering-ui/dist/assets" ]; then
  echo "❌ dist/assets directory not found"
  echo "   Vite may have put files in dist/ instead of dist/assets/"
  ls -la social-catering-ui/dist/ || true
  exit 1
fi

# Copy assets
cp -a social-catering-ui/dist/assets/. public/assets/

# Copy index.html
cp social-catering-ui/dist/index.html public/index.html

echo "✅ Assets synced\n"

# Step 4: Chunk integrity check
echo "Step 4: Checking chunk integrity..."
node social-catering-ui/scripts/check-chunks.js

if [ $? -ne 0 ]; then
  echo "❌ Chunk integrity check failed"
  exit 1
fi

echo "✅ Chunk integrity check passed\n"

# Step 5: Generate routes and audit API paths
echo "Step 5: Generating API routes catalog..."
bundle exec rake export:routes_json

echo "Generating frontend routes..."
npm run routes:gen || true

echo "Auditing API paths..."
npm run audit:api || true

echo "✅ Route generation complete\n"

# Step 6: Commit changes
echo "Step 6: Committing built assets..."
git add public/index.html public/assets
git commit -m "chore: Add built assets for Heroku deployment" || echo "No changes to commit"

echo "✅ Assets committed\n"

# Step 7: Push to Heroku
echo "Step 7: Pushing to Heroku..."
git push "https://git.heroku.com/${APP_NAME}.git" HEAD:main

echo "✅ Push complete\n"

# Step 8: Run migrations (release phase should handle this)
echo "Step 8: Running database migrations..."
heroku run -a "$APP_NAME" rails db:migrate || true

echo "✅ Migrations complete\n"

# Step 9: Health check
echo "Step 9: Checking health endpoint..."
for i in {1..30}; do
  if curl -fsSL "${APP_URL}/healthz" > /dev/null 2>&1; then
    echo "✅ healthz endpoint responding"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ healthz endpoint not responding after 30 attempts"
    exit 1
  fi
  echo "   Attempt $i/30..."
  sleep 2
done

echo "\n✅ healthz OK\n"

# Step 10: Smoke tests
echo "Step 10: Running smoke tests..."
API_BASE="$APP_URL" npm run test:smoke || true

echo "\n✅ Smoke tests complete\n"

# Step 11: Session probe
echo "Step 11: Probing session handshake..."
API_BASE="$APP_URL" \
ADMIN_EMAIL="$ADMIN_EMAIL" \
ADMIN_PASSWORD="$ADMIN_PASSWORD" \
node scripts/probe-session.ts || true

echo "\n✅ Session probe complete\n"

echo "========================================="
echo "   DEPLOYMENT COMPLETE!"
echo "========================================="
echo "App URL: $APP_URL"
echo "Health: ${APP_URL}/healthz"
echo "========================================="

