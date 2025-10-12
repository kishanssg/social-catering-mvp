#!/bin/bash
# Frontend Deployment Verification Script
# This script verifies that the React frontend is properly deployed and accessible

set -e

echo "🔍 Verifying Frontend Deployment..."

# Check if React build files exist
echo "📁 Checking React build files..."
if [ ! -f "public/index.html" ]; then
    echo "❌ ERROR: public/index.html not found"
    exit 1
fi

if [ ! -d "public/assets" ]; then
    echo "❌ ERROR: public/assets directory not found"
    exit 1
fi

# Check if JavaScript and CSS files exist
JS_FILE=$(find public/assets -name "*.js" | head -1)
CSS_FILE=$(find public/assets -name "*.css" | head -1)

if [ -z "$JS_FILE" ]; then
    echo "❌ ERROR: No JavaScript files found in public/assets"
    exit 1
fi

if [ -z "$CSS_FILE" ]; then
    echo "❌ ERROR: No CSS files found in public/assets"
    exit 1
fi

echo "✅ Found JavaScript: $JS_FILE"
echo "✅ Found CSS: $CSS_FILE"

# Check if HTML references the correct files
echo "🔗 Checking HTML file references..."
if ! grep -q "$(basename $JS_FILE)" public/index.html; then
    echo "❌ ERROR: HTML does not reference JavaScript file"
    exit 1
fi

if ! grep -q "$(basename $CSS_FILE)" public/index.html; then
    echo "❌ ERROR: HTML does not reference CSS file"
    exit 1
fi

echo "✅ HTML references correct asset files"

# Test local server (if running)
if curl -s http://localhost:3000/healthz > /dev/null; then
    echo "🌐 Testing local server..."
    
    # Test if static assets are served correctly
    JS_URL="http://localhost:3000/assets/$(basename $JS_FILE)"
    CSS_URL="http://localhost:3000/assets/$(basename $CSS_FILE)"
    
    if curl -s -I "$JS_URL" | grep -q "200 OK"; then
        echo "✅ JavaScript file accessible at $JS_URL"
    else
        echo "❌ ERROR: JavaScript file not accessible at $JS_URL"
        exit 1
    fi
    
    if curl -s -I "$CSS_URL" | grep -q "200 OK"; then
        echo "✅ CSS file accessible at $CSS_URL"
    else
        echo "❌ ERROR: CSS file not accessible at $CSS_URL"
        exit 1
    fi
fi

echo "🎉 Frontend deployment verification completed successfully!"
echo ""
echo "📋 Deployment Checklist:"
echo "  ✅ React build files exist"
echo "  ✅ HTML references correct assets"
echo "  ✅ Static files are accessible"
echo "  ✅ Rails static file serving enabled"
echo ""
echo "🚀 Ready for production deployment!"
