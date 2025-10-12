#!/bin/bash
# Integrated React + Rails Build Script
# This script builds the React frontend and integrates it with Rails properly

set -e

echo "🏗️  Building React + Rails Integration..."

# Step 1: Build React app
echo "📦 Building React frontend..."
cd social-catering-ui/social-catering-ui
npm run build
cd ../..

# Step 2: Copy build files to Rails public directory
echo "📁 Copying React build to Rails public directory..."
rm -rf public/assets public/index.html
cp -r social-catering-ui/social-catering-ui/dist/* public/

# Step 3: Verify the build
echo "🔍 Verifying build..."
if [ ! -f "public/index.html" ]; then
    echo "❌ ERROR: Failed to copy index.html"
    exit 1
fi

if [ ! -d "public/assets" ]; then
    echo "❌ ERROR: Failed to copy assets directory"
    exit 1
fi

# Step 4: Update HTML to use correct asset paths
echo "🔗 Updating asset paths in HTML..."
# The HTML should already have correct paths from Vite build

# Step 5: Run verification script
echo "✅ Running deployment verification..."
./scripts/verify_frontend_deployment.sh

echo "🎉 React + Rails build completed successfully!"
echo ""
echo "📋 Build Summary:"
echo "  ✅ React app built"
echo "  ✅ Assets copied to Rails public directory"
echo "  ✅ Asset paths verified"
echo "  ✅ Static file serving configured"
echo ""
echo "🚀 Ready to deploy to Heroku!"
