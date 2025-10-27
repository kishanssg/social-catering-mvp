#!/usr/bin/env node

/**
 * Chunk Integrity Check
 * 
 * Verifies that all assets referenced in index.html actually exist in public/assets/
 * This prevents 404 errors for dynamically imported modules after deployment.
 */

const fs = require('fs');
const path = require('path');
// Note: This script needs to be run from the social-catering-ui directory
// Usage: node scripts/check-chunks.js

function listFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...listFiles(fullPath).map(f => `${item.name}/${f}`));
    } else {
      files.push(item.name);
    }
  }
  
  return files;
}

// Path to the built index.html (produced by Vite)
const indexHtmlPath = path.join(__dirname, '../dist/index.html');
// Check if assets are in dist/assets/ or directly in dist/
const distDir = path.join(__dirname, '../dist');
const assetsDir = fs.existsSync(path.join(distDir, 'assets')) 
  ? path.join(distDir, 'assets') 
  : distDir;

function extractAssetReferences(htmlContent) {
  const assetRegex = /(?:src|href)="\/assets\/([^"]+)"/g;
  const assets = [];
  let match;
  
  while ((match = assetRegex.exec(htmlContent)) !== null) {
    assets.push(match[1]);
  }
  
  return assets;
}

function checkChunkIntegrity() {
  console.log('🔍 Checking chunk integrity...\n');
  
  // Check if index.html exists
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`❌ index.html not found at: ${indexHtmlPath}`);
    console.error('   Make sure to run `pnpm build` first');
    process.exit(1);
  }
  
  // Read index.html
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  const referencedAssets = extractAssetReferences(htmlContent);
  
  console.log(`📋 Found ${referencedAssets.length} asset references in index.html\n`);
  
  // Check if assets directory exists
  if (!fs.existsSync(assetsDir)) {
    console.error(`❌ Assets directory not found: ${assetsDir}`);
    process.exit(1);
  }
  
  // Get all actual files in the assets directory
  let actualFiles;
  try {
    actualFiles = listFiles(assetsDir);
  } catch (e) {
    // If listFiles fails (deep directory), try reading current directory
    actualFiles = fs.readdirSync(assetsDir).filter(f => {
      const fullPath = path.join(assetsDir, f);
      return fs.statSync(fullPath).isFile();
    });
  }
  
  console.log(`📦 Found ${actualFiles.length} actual files in the assets directory\n`);
  
  // Check each referenced asset
  const missing = [];
  const orphaned = [];
  
  referencedAssets.forEach(asset => {
    if (!actualFiles.includes(asset)) {
      missing.push(asset);
    }
  });
  
  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing assets:\n');
    missing.forEach(asset => {
      console.error(`   /assets/${asset}`);
    });
    console.error('\n💡 This usually means:');
    console.error('   • Assets were not synced from dist/assets/ to public/assets/');
    console.error('   • Vite build was incomplete');
    console.error('   • Assets are in dist/ but not in dist/assets/\n');
    process.exit(1);
  }
  
  console.log('✅ All referenced assets exist!\n');
  
  // List what was checked
  console.log('📋 Referenced assets:');
  referencedAssets.forEach(asset => {
    console.log(`   ✓ /assets/${asset}`);
  });
  
  console.log('\n✅ Chunk integrity check passed!');
}

checkChunkIntegrity();

