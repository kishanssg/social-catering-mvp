#!/bin/bash

# Social Catering MVP - Deployment Script
# ======================================

echo "🚀 Starting deployment process..."

# Step 1: Check project structure
echo "🔍 Checking project structure..."
echo "Current directory: $(pwd)"
echo "Frontend location: social-catering-ui/social-catering-ui/"
echo "Backend location: $(pwd)"

# Step 2: Build the frontend
echo "⚙️ Building frontend..."
cd social-catering-ui/social-catering-ui

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Build the frontend
echo "🔨 Building frontend with Vite..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed! No dist folder created."
    exit 1
fi

echo "✅ Frontend build successful!"

# Step 3: Copy built files to Rails public folder
echo "🚚 Copying frontend build to Rails public folder..."
cd ../..

# Backup existing public assets (keep Rails error pages)
echo "💾 Backing up existing public files..."
mkdir -p public_backup
cp public/4*.html public/5*.html public/icon.* public/robots.txt public_backup/ 2>/dev/null || true

# Clear public folder and copy new build
echo "🧹 Clearing public folder..."
rm -rf public/assets/*
rm -f public/index.html 2>/dev/null || true

# Copy new build
echo "📋 Copying new frontend build..."
cp -r social-catering-ui/social-catering-ui/dist/* public/

# Restore Rails error pages
echo "🔄 Restoring Rails error pages..."
cp public_backup/4*.html public/ 2>/dev/null || true
cp public_backup/5*.html public/ 2>/dev/null || true
cp public_backup/icon.* public/ 2>/dev/null || true
cp public_backup/robots.txt public/ 2>/dev/null || true

# Clean up backup
rm -rf public_backup

echo "✅ Frontend files copied to Rails public folder!"

# Step 4: Verify the build
echo "🔍 Verifying build..."
if [ -f "public/index.html" ]; then
    echo "✅ index.html found in public folder"
else
    echo "❌ index.html not found in public folder!"
    exit 1
fi

# Step 5: Commit and push to GitHub
echo "📦 Committing changes to Git..."
git add .
git commit -m "Deploy: Build and integrate frontend with Rails backend

- Built React frontend with Vite
- Copied dist files to Rails public folder
- Preserved Rails error pages and assets
- Ready for Heroku deployment"

echo "📤 Pushing to GitHub..."
git push origin main

# Step 6: Deploy to Heroku
echo "🚀 Deploying to Heroku..."
echo "Checking Heroku remotes..."
git remote -v

# Deploy to staging first
echo "Deploying to staging..."
git push heroku main

echo "✅ Deployment complete!"
echo "🌐 Check your Heroku app - the frontend should now be integrated!"
echo "📱 Frontend will be served from the root URL of your Heroku app"
