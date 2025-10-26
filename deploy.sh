#!/bin/bash
set -e

echo "🔨 Building frontend..."
cd social-catering-ui
rm -rf node_modules dist
npm ci
npm run build

echo "📦 Copying assets to public/"
cd ..
rm -rf public/assets public/index.html
mkdir -p public/assets

# Copy ALL files from dist root
cp -v social-catering-ui/dist/*.js public/assets/
cp -v social-catering-ui/dist/*.css public/assets/
cp -v social-catering-ui/dist/*.svg public/assets/ 2>/dev/null || true
cp -v social-catering-ui/dist/*.png public/assets/ 2>/dev/null || true
cp -v social-catering-ui/dist/index.html public/index.html

echo "✅ Assets copied. Files in public/assets/:" 
ls public/assets/ | wc -l

echo "📝 Committing and deploying..."
git add public/ social-catering-ui/src/
git commit -m "feat: Update QuickFillModal to use shared Modal component"
git push staging dev:main

echo "🎉 Deployment complete!"
