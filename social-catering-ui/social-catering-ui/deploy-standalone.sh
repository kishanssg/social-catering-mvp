#!/bin/bash
echo "=== STANDALONE DEPLOYMENT SCRIPT ==="

# Switch to standalone config
cp vite.config.standalone.ts vite.config.ts

# Clean previous build
rm -rf dist

# Build for standalone deployment
echo "Building for standalone deployment..."
npm run build

# Check build output
echo "Build output:"
ls -la dist/

# Check if index.html exists
if [ -f "dist/index.html" ]; then
    echo "✅ Build successful! dist/index.html exists"
else
    echo "❌ Build failed! dist/index.html missing"
    exit 1
fi

echo "✅ Ready for deployment!"
echo "Deploy the 'dist' folder to Netlify/Vercel"
