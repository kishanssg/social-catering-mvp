# Social Catering MVP - API Documentation

## Overview
RESTful API for the Social Catering MVP application built with Ruby on Rails 7. This API manages events, workers, shifts, assignments, and provides comprehensive reporting capabilities.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All API endpoints require authentication via Devise. Include authentication headers in requests:
```
Authorization: Bearer <token>
```

## Health Check
```
GET /healthz
```
Returns application health status (200 OK if healthy).

---

## Core Endpoints

### Events
Manage catering events and their requirements.

#### List Events
```
GET /api/v1/events?tab={draft|active|past}&filter={needs_workers|partially_filled|fully_staffed}&search={term}
```

**Query Parameters:**
- `tab`: Filter by event status (`draft`, `active`, `past`)
- `filter`: Additional filtering for active events
- `search`: Search by event title or venue name

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "title": "Corporate Holiday Party",
      "status": "published",
      "venue": {
        "id": 1,
        "name": "Grand Ballroom",
        "formatted_address": "123 Main St, City, State"
      },
      "event_schedule": {
        "start_time_utc": "2025-12-15T18:00:00Z",
        "end_time_utc": "2025-12-15T23:00:00Z"
      },
      "skill_requirements": [
        {
          "id": 1,
          "skill_name": "Server",
          "needed_workers": 5,
          "pay_rate": 15.00,
          "description": "Serve food and beverages",
          "uniform_name": "Black pants, white shirt"
        }
      ],
      "shifts_by_role": {
        "Server": {
          "shifts": [
            {
              "id": 1,
              "start_time_utc": "2025-12-15T18:00:00Z",
              "end_time_utc": "2025-12-15T23:00:00Z",
              "capacity": 5,
              "pay_rate": 15.00,
              "assignments": [
                {
                  "id": 1,
                  "worker": {
                    "id": 1,
                    "first_name": "John",
                    "last_name": "Doe"
                  },
                  "hourly_rate": 15.00,
                  "status": "assigned"
                }
              ]
            }
          ]
        }
      },
      "unfilled_roles_count": 2,
      "assigned_workers_count": 3
    }
  ]
}
```

#### Create Event
```
POST /api/v1/events
```

**Request Body:**
```json
{
  "event": {
    "title": "New Event",
    "venue_id": 1,
    "event_schedule_attributes": {
      "start_time_utc": "2025-12-15T18:00:00Z",
      "end_time_utc": "2025-12-15T23:00:00Z"
    },
    "event_skill_requirements_attributes": [
      {
        "skill_name": "Server",
        "needed_workers": 5,
        "pay_rate": 15.00,
        "description": "Serve food and beverages"
      }
    ]
  }
}
```

#### Update Event Status
```
PATCH /api/v1/events/{id}/update_status
```

**Request Body:**
```json
{
  "status": "published"
}
```

#### Publish Event
```
POST /api/v1/events/{id}/publish
```

#### Complete Event
```
POST /api/v1/events/{id}/complete
```

---

### Workers
Manage worker profiles and certifications.

#### List Workers
```
GET /api/v1/workers
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "555-0123",
      "active": true,
      "skills_json": ["Server", "Bartender"],
      "certifications": [
        {
          "id": 1,
          "name": "Food Safety",
          "expires_at_utc": "2025-12-31T23:59:59Z"
        }
      ]
    }
  ]
}
```

#### Create Worker
```
POST /api/v1/workers
```

**Request Body:**
```json
{
  "worker": {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone_number": "555-0456",
    "skills_json": ["Server", "Captain"],
    "active": true
  }
}
```

#### Update Worker
```
PATCH /api/v1/workers/{id}
```

#### Add Certification
```
POST /api/v1/workers/{id}/certifications
```

**Request Body:**
```json
{
  "certification_id": 1,
  "expires_at_utc": "2025-12-31T23:59:59Z"
}
```

---

### Assignments
Manage worker assignments to shifts.

#### Create Assignment
```
POST /api/v1/assignments
```

**Request Body:**
```json
{
  "shift_id": 1,
  "worker_id": 1,
  "hourly_rate": 15.00
}
```

#### Bulk Create Assignments
```
POST /api/v1/assignments/bulk_create
```

**Request Body:**
```json
{
  "assignments": [
    {
      "shift_id": 1,
      "worker_id": 1,
      "hourly_rate": 15.00
    },
    {
      "shift_id": 2,
      "worker_id": 2,
      "hourly_rate": 16.00
    }
  ]
}
```

#### Clock In/Out
```
POST /api/v1/assignments/{id}/clock_in
POST /api/v1/assignments/{id}/clock_out
```

#### Update Break Duration
```
PATCH /api/v1/assignments/{id}/update_break
```

**Request Body:**
```json
{
  "break_duration_minutes": 30
}
```

---

### Shifts
Manage individual work shifts.

#### List Shifts
```
GET /api/v1/shifts
```

#### Create Shift
```
POST /api/v1/shifts
```

**Request Body:**
```json
{
  "shift": {
    "event_id": 1,
    "role_needed": "Server",
    "start_time_utc": "2025-12-15T18:00:00Z",
    "end_time_utc": "2025-12-15T23:00:00Z",
    "capacity": 5,
    "pay_rate": 15.00
  }
}
```

---

### Dashboard
Get application statistics and metrics.

#### Dashboard Stats
```
GET /api/v1/dashboard
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "draft_events": 2,
    "published_events": 7,
    "completed_events": 7,
    "total_workers": 35,
    "gaps_to_fill": 15
  }
}
```

---

### Reports
Generate various reports for payroll and analytics.

#### Timesheet Report
```
GET /api/v1/reports/timesheet?start_date=2025-01-01&end_date=2025-01-31
```

#### Payroll Report
```
GET /api/v1/reports/payroll?start_date=2025-01-01&end_date=2025-01-31
```

#### Worker Hours Report
```
GET /api/v1/reports/worker_hours?start_date=2025-01-01&end_date=2025-01-31
```

#### Event Summary Report
```
GET /api/v1/reports/event_summary?start_date=2025-01-01&end_date=2025-01-31
```

---

### Venues
Manage event venues with Google Places integration.

#### List Venues
```
GET /api/v1/venues
```

#### Search Venues
```
GET /api/v1/venues/search?query=restaurant
```

#### Create Venue
```
POST /api/v1/venues
```

**Request Body:**
```json
{
  "venue": {
    "name": "Grand Ballroom",
    "formatted_address": "123 Main St, City, State",
    "place_id": "ChIJ...",
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

---

### Skills
Manage available skills and their default pay rates.

#### List Skills
```
GET /api/v1/skills
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Server",
      "default_pay_rate": 15.00,
      "last_used_pay_rate": 15.50
    }
  ]
}
```

#### Create Skill
```
POST /api/v1/skills
```

**Request Body:**
```json
{
  "skill": {
    "name": "Bartender",
    "default_pay_rate": 18.00
  }
}
```

---

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Error message",
  "errors": ["Validation error 1", "Validation error 2"]
}
```

**Validation Error Response:**
```json
{
  "status": "validation_error",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity (Validation Error)
- `500` - Internal Server Error

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing rate limiting for production deployment.

## CORS

CORS is configured to allow requests from:
- `http://localhost:5173` (Frontend development server)
- `http://localhost:5174-5177` (Alternative ports)
- `http://localhost:3000` (Rails server)
- Production domains (configured in `config/initializers/cors.rb`)

## Data Validation

### Critical Business Rules

1. **No Double-Booking**: Workers cannot be assigned to overlapping shifts
2. **Skill Requirements**: Workers must have required skills for assigned roles
3. **Capacity Limits**: Shifts cannot exceed their capacity
4. **Active Workers Only**: Only active workers can be assigned to shifts
5. **Duplicate Prevention**: Workers cannot be assigned to the same shift twice

### Pay Rate Validation

- Pay rates must be positive numbers
- Custom pay rates can be set per assignment
- Default pay rates are inherited from skill requirements
- Pay rates are stored as decimal values with 2 decimal places

## Database Schema

### Key Tables

- `events` - Event information and status
- `workers` - Worker profiles and skills
- `shifts` - Individual work shifts
- `assignments` - Worker-shift assignments
- `event_skill_requirements` - Required skills per event
- `worker_certifications` - Worker certifications
- `venues` - Event venues
- `skills` - Available skills and default rates

### Timestamps

All timestamps are stored in UTC format with `_utc` suffix:
- `created_at_utc`
- `updated_at_utc`
- `start_time_utc`
- `end_time_utc`

## Testing

### Smoke Tests Results

✅ **Database Connectivity**: Working  
✅ **Model Validations**: Working  
✅ **Business Logic**: Working  
✅ **Data Integrity**: Good  
✅ **Health Check**: Working  

### Test Coverage

- Model validations
- Business rule enforcement
- Data integrity checks
- API endpoint functionality
- Authentication and authorization

## Deployment

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY_BASE` - Rails secret key
- `RAILS_ENV` - Environment (production, staging, development)
- `RAILS_MASTER_KEY` - Rails master key for encrypted credentials

Optional environment variables:
- `SENTRY_DSN` - Sentry error tracking
- `SMTP_*` - Email configuration

### Health Monitoring

The API provides a health check endpoint at `/healthz` that returns:
- `200 OK` - Application is healthy
- `503 Service Unavailable` - Application has issues

## Support

For API support or questions, please refer to the application documentation or contact the development team.
