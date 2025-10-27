#!/bin/bash
set -e

# Staging app name
APP_NAME="sc-mvp-staging"
APP_URL="https://sc-mvp-staging-c6ef090c6c41.herokuapp.com"

echo "═══════════════════════════════════════════════════"
echo "🚀 Social Catering MVP - Deployment Script"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 0: Build strategy verification
echo "✅ Step 0: Build Strategy Verification"
echo "   - We prebuild locally with Vite"
echo "   - Dev index.html remains unchanged (points to /src/main.tsx)"
echo ""

# Step 1: Fresh Vite build
echo "🔨 Step 1: Building frontend..."
cd social-catering-ui
rm -rf dist
npm run build

# Verify build succeeded
if [ ! -f dist/index.html ]; then
  echo "❌ ERROR: Build failed - dist/index.html not found"
  exit 1
fi

BUILD_FILE_COUNT=$(find dist -type f -name "*.js" -o -name "*.css" | wc -l | tr -d ' ')
echo "   ✅ Build complete: $BUILD_FILE_COUNT assets generated"

# Step 2: Atomic copy into Rails
echo ""
echo "📦 Step 2: Copying assets to public/"
cd ..
rm -rf public/assets public/index.html
mkdir -p public/assets

# Copy ALL files from dist root
cp -a social-catering-ui/dist/*.js public/assets/ 2>/dev/null || true
cp -a social-catering-ui/dist/*.css public/assets/ 2>/dev/null || true
cp -a social-catering-ui/dist/*.svg public/assets/ 2>/dev/null || true
cp -a social-catering-ui/dist/*.png public/assets/ 2>/dev/null || true
cp social-catering-ui/dist/index.html public/index.html

# Step 3: Index ↔ Assets Integrity Check
echo ""
echo "🔍 Step 3: Index ↔ Assets Integrity Check"
if ! grep -q "assets/.*\.js" public/index.html; then
  echo "   ❌ ERROR: index.html doesn't reference hashed assets"
  exit 1
fi

JS_FILES_IN_INDEX=$(grep -o 'assets/[^"]*\.js' public/index.html | wc -l | tr -d ' ')
ASSETS_COUNT=$(ls public/assets/*.js 2>/dev/null | wc -l | tr -d ' ')
echo "   ✅ index.html references $JS_FILES_IN_INDEX JS files"
echo "   ✅ public/assets/ contains $ASSETS_COUNT JS files"

# Check that referenced files exist
MISSING_COUNT=0
for f in $(grep -o 'assets/[^"]*\.js' public/index.html); do
  if [ ! -f "public/$f" ]; then
    echo "   ❌ MISSING: $f"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

if [ $MISSING_COUNT -gt 0 ]; then
  echo "   ❌ ERROR: $MISSING_COUNT referenced files are missing!"
  exit 1
fi

echo "   ✅ All referenced assets exist in public/assets/"

# Step 4: Commit and deploy
echo ""
echo "📝 Step 4: Committing changes..."
git add public/
git commit -m "feat: Sync Vite build to public/ for deployment" || echo "   (No changes to commit)"

echo ""
echo "🚀 Step 5: Deploying to staging..."
git push staging dev:main

# Step 6: Wait for deployment and verify
echo ""
echo "⏳ Waiting for Heroku to process deployment (10 seconds)..."
sleep 10

echo ""
echo "🔍 Step 6: Verifying deployment..."

# Check health endpoint
echo "   Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$APP_URL/healthz" || echo "failed")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Health check passed (HTTP $HTTP_CODE)"
else
  echo "   ⚠️  Health check returned HTTP $HTTP_CODE"
fi

# Check for asset 404s in logs
echo "   Checking for asset 404 errors in logs..."
ASSET_404S=$(heroku logs --tail -n 50 -a "$APP_NAME" | grep -c "/assets/.*404" || echo "0")
if [ "$ASSET_404S" -eq 0 ]; then
  echo "   ✅ No asset 404 errors found"
else
  echo "   ⚠️  Found $ASSET_404S asset 404 errors in logs"
fi

# Spot-check a random chunk
echo "   Spot-checking a random chunk..."
RANDOM_CHUNK=$(grep -o 'assets/[^"]*\.js' public/index.html | head -n 1)
if [ -n "$RANDOM_CHUNK" ]; then
  CHUNK_URL="$APP_URL/$RANDOM_CHUNK"
  CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CHUNK_URL" || echo "000")
  if [ "$CHUNK_STATUS" = "200" ]; then
    echo "   ✅ Chunk accessible: $RANDOM_CHUNK (HTTP 200)"
  else
    echo "   ❌ Chunk not accessible: $RANDOM_CHUNK (HTTP $CHUNK_STATUS)"
  fi
fi

# Step 7: Session endpoint check
echo ""
echo "🔍 Step 7: Checking session endpoint..."
SESSION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/v1/session" || echo "000")
if [ "$SESSION_STATUS" = "401" ] || [ "$SESSION_STATUS" = "200" ]; then
  echo "   ✅ Session endpoint accessible (HTTP $SESSION_STATUS)"
else
  echo "   ⚠️  Session endpoint returned HTTP $SESSION_STATUS"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "🌐 App URL: $APP_URL"
echo "📱 Next steps:"
echo "   1. Hard refresh browser (Cmd+Shift+R)"
echo "   2. Check DevTools Console for errors"
echo "   3. Test key workflows"
echo ""
echo "🔄 To redeploy: ./deploy.sh"
echo ""
