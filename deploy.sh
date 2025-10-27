#!/bin/bash
set -e

echo "🔨 Building frontend..."
cd social-catering-ui
rm -rf dist
npm run build

echo "📦 Copying assets to public/"
cd ..
rm -rf public/assets public/index.html
mkdir -p public/assets

# Copy ALL files from dist root
cp -a social-catering-ui/dist/*.js public/assets/ 2>/dev/null || true
cp -a social-catering-ui/dist/*.css public/assets/ 2>/dev/null || true
cp -a social-catering-ui/dist/*.svg public/assets/ 2>/dev/null || true
cp -a social-catering-ui/dist/*.png public/assets/ 2>/dev/null || true
cp social-catering-ui/dist/index.html public/index.html

echo "✅ Assets copied. Files in public/assets/: $(ls public/assets/ | wc -l)"

echo "📝 Committing..."
git add public/
git commit -m "feat: Sync Vite build to public/ for deployment" || echo "No changes to commit"

echo "🚀 Deploying to staging..."
git push staging dev:main

echo "🎉 Deployment complete!"
