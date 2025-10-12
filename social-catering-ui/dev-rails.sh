#!/bin/bash
echo "=== RAILS INTEGRATION DEVELOPMENT ==="

# Switch back to Rails config
cp vite.config.rails.ts vite.config.ts

# Start development server
echo "Starting development server with Rails integration..."
npm run dev
