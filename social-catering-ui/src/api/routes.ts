/**
 * Generated API Routes
 * Auto-generated from Rails routes export on 2025-10-27T13:23:34.000Z
 * 
 * DO NOT EDIT MANUALLY - Regenerate with: npm run generate:routes
 */

export const routes = {
  sessions: {
    create: '/api/v1/login',
    destroy: '/api/v1/logout',
  },
  workers: {
    add_certification: '/api/v1/workers/:id/certifications',
    remove_certification: '/api/v1/workers/:id/certifications/:certification_id',
    index: '/api/v1/workers',
    create: '/api/v1/workers',
    show: '/api/v1/workers/:id',
    update: '/api/v1/workers/:id',
    destroy: '/api/v1/workers/:id',
  },
  shifts: {
    index: '/api/v1/shifts',
    create: '/api/v1/shifts',
    show: '/api/v1/shifts/:id',
    update: '/api/v1/shifts/:id',
    destroy: '/api/v1/shifts/:id',
  },
  assignments: {
    bulk_create: '/api/v1/assignments/bulk_create',
    export: '/api/v1/assignments/export',
    clock_in: '/api/v1/assignments/:id/clock_in',
    clock_out: '/api/v1/assignments/:id/clock_out',
    update_break: '/api/v1/assignments/:id/update_break',
    index: '/api/v1/assignments',
    create: '/api/v1/assignments',
    update: '/api/v1/assignments/:id',
    destroy: '/api/v1/assignments/:id',
  },
  certifications: {
    index: '/api/v1/certifications',
  },
  activity_logs: {
    index: '/api/v1/activity_logs',
  },
  skills: {
    index: '/api/v1/skills',
    create: '/api/v1/skills',
  },
  locations: {
    index: '/api/v1/locations',
    create: '/api/v1/locations',
  },
  venues: {
    search: '/api/v1/venues/search',
    select: '/api/v1/venues/select',
    index: '/api/v1/venues',
    create: '/api/v1/venues',
    show: '/api/v1/venues/:id',
    update: '/api/v1/venues/:id',
  },
  exports: {
    timesheet: '/api/v1/exports/timesheet',
  },
  dashboard: {
    index: '/api/v1/dashboard',
  },
  events: {
    update_status: '/api/v1/events/:id/update_status',
    publish: '/api/v1/events/:id/publish',
    complete: '/api/v1/events/:id/complete',
    restore: '/api/v1/events/:id/restore',
    index: '/api/v1/jobs',
    create: '/api/v1/jobs',
    new: '/api/v1/jobs/new',
    edit: '/api/v1/jobs/:id/edit',
    show: '/api/v1/jobs/:id',
    update: '/api/v1/jobs/:id',
    destroy: '/api/v1/jobs/:id',
  },
  event_skill_requirements: {
    create: '/api/v1/events/:event_id/event_skill_requirements',
    update: '/api/v1/events/:event_id/event_skill_requirements/:id',
    destroy: '/api/v1/events/:event_id/event_skill_requirements/:id',
  },
  staffing: {
    bulk_create: '/api/v1/assignments/bulk_create',
    validate_bulk: '/api/v1/staffing/validate_bulk',
    create: '/api/v1/assignments',
    update: '/api/v1/assignments/:id',
    destroy: '/api/v1/assignments/:id',
    export: '/api/v1/assignments/export',
    clock_in: '/api/v1/assignments/:id/clock_in',
    clock_out: '/api/v1/assignments/:id/clock_out',
    update_break: '/api/v1/assignments/:id/update_break',
  },
  reports: {
    timesheet: '/api/v1/reports/timesheet',
    payroll: '/api/v1/reports/payroll',
    worker_hours: '/api/v1/reports/worker_hours',
    event_summary: '/api/v1/reports/event_summary',
  },
} as const;

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
