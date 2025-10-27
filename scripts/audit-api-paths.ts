#!/usr/bin/env node
/**
 * Audit frontend codebase for API path usage
 * Flags hardcoded "/api/" strings not from routes.ts
 * Exit non-zero if violations found
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface Violation {
  file: string;
  line: number;
  method: string;
  path: string;
  context: string;
}

const projectRoot = process.cwd();
const frontendSrc = path.join(projectRoot, 'social-catering-ui/src');
const routesPath = path.join(projectRoot, 'social-catering-ui/src/api/routes.ts');

// Check if routes.ts exists
if (!fs.existsSync(routesPath)) {
  console.error('❌ routes.ts not found. Run: npm run generate:routes');
  process.exit(1);
}

// Load routes to check against
const routesContent = fs.readFileSync(routesPath, 'utf8');
const knownRoutes = new Set<string>();

// Extract all route paths from routes.ts
const routePattern = /['"]([^'"]+)['"]/g;
let match;
while ((match = routePattern.exec(routesContent)) !== null) {
  knownRoutes.add(match[1]);
}

console.log(`📋 Loaded ${knownRoutes.size} known routes from routes.ts\n`);

// Find all TypeScript/JavaScript files
const files = [
  ...glob.sync('**/*.ts', { cwd: frontendSrc, absolute: true }),
  ...glob.sync('**/*.tsx', { cwd: frontendSrc, absolute: true }),
].filter(f => !f.includes('routes.ts') && !f.includes('node_modules'));

console.log(`🔍 Scanning ${files.length} files...\n`);

const violations: Violation[] = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip commented lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Look for "/api/" patterns
    const apiPattern = /['"](\/api\/[^'"]+)['"]/g;
    let match;
    while ((match = apiPattern.exec(line)) !== null) {
      const apiPath = match[1];
      
      // Check if path is in our routes
      if (!knownRoutes.has(apiPath)) {
        // Extract method if possible
        let method = 'unknown';
        if (line.toLowerCase().includes('get(')) method = 'GET';
        else if (line.toLowerCase().includes('post(')) method = 'POST';
        else if (line.toLowerCase().includes('put(')) method = 'PUT';
        else if (line.toLowerCase().includes('patch(')) method = 'PATCH';
        else if (line.toLowerCase().includes('delete(')) method = 'DELETE';
        
        violations.push({
          file: path.relative(projectRoot, file),
          line: index + 1,
          method,
          path: apiPath,
          context: line.trim().substring(0, 100)
        });
      }
    }
  });
});

// Print results
if (violations.length === 0) {
  console.log('✅ No API path violations found!\n');
  console.log('✓ All API paths are validated');
  process.exit(0);
}

console.log(`❌ Found ${violations.length} API path violation(s):\n`);
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ File                                   │ Line │ Method │ Path          │');
console.log('├─────────────────────────────────────────────────────────────────────────┤');

violations.forEach(v => {
  const fileName = v.file.split('/').pop();
  const filePath = v.file.length > 30 ? '...' + v.file.substring(v.file.length - 27) : v.file;
  
  console.log(`│ ${filePath.padEnd(38)} │ ${String(v.line).padStart(4)} │ ${v.method.padEnd(6)} │ ${v.path.padEnd(13)} │`);
});

console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

console.log('💡 Recommendation:');
console.log('   Import and use routes from routes.ts instead of hardcoded paths\n');
console.log('   Example:');
console.log('     import { routes } from \'../api/routes\';');
console.log('     const response = await apiClient.get(routes.workers.index);\n');

process.exit(1);

