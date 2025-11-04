## Social Catering – Staging Handout
### Staging info
- URL: https://sc-mvp-staging-c6ef090c6c41.herokuapp.com
- Test login: admin@socialcatering.com / Password123
- Health: https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/healthz (200 OK)

### Smoke tests (summary)
- GET /healthz → 200
- GET /api/v1/skills, /api/v1/locations, /api/v1/events?tab=active → 401 without session (expected)
- Asset integrity: All /assets/*.js referenced by index.html return 200

### Tiny API README (key endpoints)
- Auth
  - POST /users/sign_in (form): email, password → 302 + session cookie
  - GET /api/v1/session → 200 { user: { id, email } } when authenticated; 401 otherwise

- Events
  - GET /api/v1/events?tab=active|draft|completed&filter=needs_workers|fully_staffed&date=YYYY-MM-DD
    - Returns: [{ id, title, status, schedule: { start_time_utc, end_time_utc }, venue, staffing_* }]
  - POST /api/v1/events/:id/publish → { status, message }
  - PATCH /api/v1/events/:id → edits; returns 422 with friendly conflicts if double‑booking would occur
  - DELETE /api/v1/events/:id → soft delete; cancels assignments

- Staffing
  - POST /api/v1/staffing/assign { shift_id, worker_id, hourly_rate? } → assigns or 422 with reason
  - DELETE /api/v1/staffing/:assignment_id → unassign
  - POST /api/v1/staffing/quick_fill { event_id, role_name, shift_ids[] } → { assigned, skipped[], details }

- Workers
  - GET /api/v1/workers?active=true
  - POST /api/v1/workers { first_name, last_name, email, phone, skills_json[], certifications[] }
  - PATCH /api/v1/workers/:id (same fields)

- Reports (CSV)
  - GET /api/v1/reports/timesheet?start_date&end_date&worker_id?&event_id?&skill_name?
  - GET /api/v1/reports/payroll?start_date&end_date&worker_id?&event_id?
  - GET /api/v1/reports/worker_hours?start_date&end_date&worker_id?&skill_name?
  - GET /api/v1/reports/event_summary?start_date&end_date&event_id?
  - Responses: CSV attachment with descriptive filename; 4xx/5xx → JSON { message }

