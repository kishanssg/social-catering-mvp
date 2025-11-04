#!/usr/bin/env node
/**
 * Generate frontend/src/api/routes.ts from Rails routes export
 * Usage: npm run generate:routes
 */

import * as fs from 'fs';
import * as path from 'path';

interface Route {
  name: string;
  verb: string;
  path: string;
  ts_path: string;
  controller: string;
  action: string;
}

interface RouteGroup {
  [controller: string]: Route[];
}

interface RoutesExport {
  generated_at: string;
  routes: RouteGroup;
}

// Load the exported routes
const routesJsonPath = path.join(process.cwd(), 'tmp/routes.json');
const routesData: RoutesExport = JSON.parse(fs.readFileSync(routesJsonPath, 'utf8'));

// Generate TypeScript routes structure
let tsContent = `/**
 * Generated API Routes
 * Auto-generated from Rails routes export on ${new Date(routesData.generated_at).toISOString()}
 * 
 * DO NOT EDIT MANUALLY - Regenerate with: npm run generate:routes
 */

export const routes = {
`;

// Organize routes by functional area
const routeMap: Record<string, Record<string, string>> = {};

Object.entries(routesData.routes).forEach(([controller, routes]) => {
  routes.forEach((route) => {
    // Clean up path for TypeScript - remove Rails format suffix
    const cleanPath = route.path.replace(/\(\.:format\)/g, '');
    
    const controllerName = controller.replace('api/v1/', '').replace(/\//g, '_');
    const methodName = `${controllerName}_${route.action}`;
    
    if (!routeMap[controllerName]) {
      routeMap[controllerName] = {};
    }
    
    routeMap[controllerName][route.action] = cleanPath;
  });
});

// Generate the routes object
Object.entries(routeMap).forEach(([area, methods]) => {
  tsContent += `  ${area}: {\n`;
  Object.entries(methods).forEach(([method, routePath]) => {
    const methodKey = method.replace(/[^a-zA-Z0-9]/g, '_');
    // Escape quotes in path
    const escapedPath = routePath.replace(/'/g, "\\'").replace(/"/g, '\\"');
    tsContent += `    ${methodKey}: '${escapedPath}',\n`;
  });
  tsContent += `  },\n`;
});

tsContent += `} as const;

// Find the closest matching route (for 404 suggestions)
export function findClosestRoute(path: string, limit = 1): string[] {
  const allPaths = Object.values(routes)
    .flatMap(area => Object.values(area) as string[]);
  
  return allPaths
    .map(routePath => ({
      path: routePath,
      score: levenshtein(routePath, path)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(r => r.path);
}

// Levenshtein distance for string similarity
function levenshtein(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
`;

// Write to output file
const outputPath = path.join(process.cwd(), 'social-catering-ui/src/api/routes.ts');
fs.writeFileSync(outputPath, tsContent);

console.log(`✅ Generated ${outputPath}`);
console.log(`   ${Object.keys(routeMap).length} route areas`);
console.log(`   ${Object.values(routeMap).reduce((acc, area) => acc + Object.keys(area).length, 0)} total routes`);
