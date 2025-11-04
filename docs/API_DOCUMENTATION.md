# Social Catering MVP - API Documentation

**Base URLs:**
- **Development:** `http://localhost:3001/api/v1`
- **Staging:** `https://sc-mvp-staging.herokuapp.com/api/v1`
- **Production:** `https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1`

**Authentication:** Session-based (Devise cookies)  
**Content-Type:** `application/json`  
**API Version:** v1

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Workers Endpoints](#workers-endpoints)
3. [Shifts Endpoints](#shifts-endpoints)
4. [Assignments Endpoints](#assignments-endpoints)
5. [Events Endpoints](#events-endpoints)
6. [Certifications Endpoints](#certifications-endpoints)
7. [Activity Logs Endpoints](#activity-logs-endpoints)
8. [Reports Endpoints](#reports-endpoints)
9. [Response Formats](#response-formats)
10. [Error Handling](#error-handling)

---

## 🔐 Authentication

### Overview
The API uses session-based authentication via Devise. After successful login, a session cookie is set and used for subsequent requests.

### Login

**Endpoint:** `POST /api/v1/login`

**Request:**
```json
{
  "user": {
    "email": "gravyadmin@socialcatering.com",
    "password": "gravyadmin@sc_mvp"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "email": "gravyadmin@socialcatering.com",
      "password": "gravyadmin@sc_mvp"
    }
  }' \
  -c cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "gravyadmin@socialcatering.com",
      "role": "admin"
    }
  }
}
```

**Error Response:** 401 Unauthorized
```json
{
  "status": "error",
  "error": "Invalid email or password"
}
```

**Test Credentials:**
- `gravyadmin@socialcatering.com` / `gravyadmin@sc_mvp`
- `natalie@socialcatering.com` / `natalie@sc`
- `madison@socialcatering.com` / `madison@sc`
- `sarah@socialcatering.com` / `sarah@sc`

### Logout

**Endpoint:** `DELETE /api/v1/logout`

**cURL Example:**
```bash
curl -X DELETE https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Signed out successfully"
}
```

### Session Check

**Endpoint:** `GET /api/v1/session` (or `/api/v1/sessions/current`)

**cURL Example:**
```bash
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/session \
  -b cookies.txt
```

**Response:** 200 OK (if authenticated)
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "gravyadmin@socialcatering.com",
      "role": "admin"
    }
  }
}
```

**Response:** 401 Unauthorized (if not authenticated)
```json
{
  "status": "error",
  "error": "Not authenticated"
}
```

---

## 👥 Workers Endpoints

### List Workers

**Endpoint:** `GET /api/v1/workers`

**Query Parameters:**
- `search` (string): Search by name, email, or phone
- `skills` (string): Comma-separated skills to filter
- `certification_id` (integer): Filter by certification ID
- `active` (boolean): Filter by active status (true/false)
- `available_for_shift_id` (integer): Only show workers available for this shift

**cURL Example:**
```bash
curl "https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers?search=alex&active=true" \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "workers": [
      {
        "id": 778,
        "first_name": "Alex",
        "last_name": "Williams",
        "email": "alex.williams21@socialcatering.com",
        "phone": "2755813443",
        "address_line1": "123 Main St",
        "address_line2": null,
        "active": true,
        "hourly_rate": null,
        "skills_json": ["Event Helper", "Captain"],
        "certifications": [
          {
            "id": 79,
            "name": "Food Handler",
            "expires_at_utc": "2026-10-21T00:00:00Z",
            "expired": false
          }
        ],
        "profile_photo_url": "https://...",
        "created_at": "2025-10-21T10:00:00Z",
        "updated_at": "2025-10-21T10:00:00Z"
      }
    ],
    "total_count": 1
  }
}
```

### Get Worker Details

**Endpoint:** `GET /api/v1/workers/:id`

**cURL Example:**
```bash
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers/778 \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "worker": {
      "id": 778,
      "first_name": "Alex",
      "last_name": "Williams",
      "email": "alex.williams21@socialcatering.com",
      "phone": "2755813443",
      "active": true,
      "skills_json": ["Event Helper", "Captain"],
      "certifications": [
        {
          "id": 79,
          "name": "Food Handler",
          "expires_at_utc": "2026-10-21T00:00:00Z",
          "expired": false
        }
      ],
      "profile_photo_url": "https://...",
      "created_at": "2025-10-21T10:00:00Z"
    }
  }
}
```

### Create Worker

**Endpoint:** `POST /api/v1/workers`

**Request:**
```json
{
  "worker": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "address_line1": "123 Main St",
    "address_line2": "Apt 4",
    "active": true,
    "skills_json": ["Bartender", "Server"],
    "worker_certifications_attributes": [
      {
        "certification_id": 79,
        "expires_at_utc": "2026-12-31"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X POST https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "worker": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "active": true,
      "skills_json": ["Bartender"]
    }
  }'
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "worker": {
      "id": 789,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "active": true,
      "created_at": "2025-11-04T10:00:00Z"
    }
  }
}
```

**Error Response:** 422 Unprocessable Entity
```json
{
  "status": "validation_error",
  "errors": {
    "email": ["has already been taken"],
    "phone": ["must be 10-15 digits only"]
  }
}
```

### Update Worker

**Endpoint:** `PATCH /api/v1/workers/:id`

**Request:**
```json
{
  "worker": {
    "first_name": "John",
    "last_name": "Updated",
    "active": false
  }
}
```

**cURL Example:**
```bash
curl -X PATCH https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers/789 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "worker": {
      "first_name": "John",
      "last_name": "Updated",
      "active": false
    }
  }'
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "worker": {
      "id": 789,
      "first_name": "John",
      "last_name": "Updated",
      "active": false,
      "updated_at": "2025-11-04T11:00:00Z"
    }
  }
}
```

### Delete Worker

**Endpoint:** `DELETE /api/v1/workers/:id`

**cURL Example:**
```bash
curl -X DELETE https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers/789 \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Worker deleted successfully"
}
```

**Note:** Workers with assignment history cannot be deleted (soft delete: `active=false`).

### Add Certification to Worker

**Endpoint:** `POST /api/v1/workers/:id/certifications`

**Request:**
```json
{
  "certification_id": 79,
  "expires_at_utc": "2026-12-31"
}
```

**cURL Example:**
```bash
curl -X POST https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers/778/certifications \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "certification_id": 79,
    "expires_at_utc": "2026-12-31"
  }'
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "worker_certification": {
      "id": 123,
      "worker_id": 778,
      "certification_id": 79,
      "expires_at_utc": "2026-12-31T00:00:00Z",
      "certification": {
        "id": 79,
        "name": "Food Handler"
      }
    }
  }
}
```

### Remove Certification from Worker

**Endpoint:** `DELETE /api/v1/workers/:id/certifications/:certification_id`

**cURL Example:**
```bash
curl -X DELETE https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/workers/778/certifications/79 \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Certification removed from worker"
}
```

---

## 📅 Shifts Endpoints

### List Shifts

**Endpoint:** `GET /api/v1/shifts`

**Query Parameters:**
- `event_id` (integer): Filter by event ID
- `status` (string): Filter by status (draft, published, assigned, completed)
- `start_date` (date): Filter shifts starting on or after this date
- `end_date` (date): Filter shifts ending on or before this date

**cURL Example:**
```bash
curl "https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/shifts?event_id=255&status=published" \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "shifts": [
      {
        "id": 1234,
        "event_id": 255,
        "role_needed": "Bartender",
        "start_time_utc": "2025-11-15T16:00:00Z",
        "end_time_utc": "2025-11-15T21:00:00Z",
        "capacity": 2,
        "assigned_count": 1,
        "status": "published",
        "pay_rate": 15.00,
        "required_cert_id": 79,
        "location": "Venue Name",
        "created_at": "2025-11-04T10:00:00Z"
      }
    ]
  }
}
```

### Get Shift Details

**Endpoint:** `GET /api/v1/shifts/:id`

**cURL Example:**
```bash
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/shifts/1234 \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "shift": {
      "id": 1234,
      "event_id": 255,
      "role_needed": "Bartender",
      "start_time_utc": "2025-11-15T16:00:00Z",
      "end_time_utc": "2025-11-15T21:00:00Z",
      "capacity": 2,
      "assigned_count": 1,
      "status": "published",
      "pay_rate": 15.00,
      "required_cert_id": 79,
      "assignments": [
        {
          "id": 5678,
          "worker_id": 778,
          "worker_name": "Alex Williams",
          "status": "assigned",
          "hourly_rate": 15.00
        }
      ]
    }
  }
}
```

### Create Shift

**Endpoint:** `POST /api/v1/shifts`

**Request:**
```json
{
  "shift": {
    "event_id": 255,
    "role_needed": "Bartender",
    "start_time_utc": "2025-11-15T16:00:00Z",
    "end_time_utc": "2025-11-15T21:00:00Z",
    "capacity": 2,
    "pay_rate": 15.00,
    "required_cert_id": 79,
    "location": "Venue Name"
  }
}
```

**Response:** 201 Created

### Update Shift

**Endpoint:** `PATCH /api/v1/shifts/:id`

**Response:** 200 OK

### Delete Shift

**Endpoint:** `DELETE /api/v1/shifts/:id`

**Response:** 200 OK

---

## 🔗 Assignments Endpoints

### List Assignments

**Endpoint:** `GET /api/v1/assignments`

**Query Parameters:**
- `worker_id` (integer): Filter by worker ID
- `shift_id` (integer): Filter by shift ID
- `status` (string): Filter by status (assigned, confirmed, completed, cancelled)
- `start_date` (date): Filter assignments starting on or after this date
- `end_date` (date): Filter assignments ending on or before this date

**cURL Example:**
```bash
curl "https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/assignments?worker_id=778&status=assigned" \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "assignments": [
      {
        "id": 5678,
        "worker_id": 778,
        "worker_name": "Alex Williams",
        "shift_id": 1234,
        "shift": {
          "role_needed": "Bartender",
          "start_time_utc": "2025-11-15T16:00:00Z",
          "end_time_utc": "2025-11-15T21:00:00Z",
          "event": {
            "id": 255,
            "title": "Wedding Reception"
          }
        },
        "status": "assigned",
        "hourly_rate": 15.00,
        "assigned_at_utc": "2025-11-04T10:00:00Z",
        "assigned_by": {
          "id": 1,
          "email": "gravyadmin@socialcatering.com"
        }
      }
    ]
  }
}
```

### Create Assignment (Single)

**Endpoint:** `POST /api/v1/assignments`

**Request:**
```json
{
  "assignment": {
    "worker_id": 778,
    "shift_id": 1234,
    "hourly_rate": 15.00
  }
}
```

**cURL Example:**
```bash
curl -X POST https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/assignments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "assignment": {
      "worker_id": 778,
      "shift_id": 1234,
      "hourly_rate": 15.00
    }
  }'
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "assignment": {
      "id": 5678,
      "worker_id": 778,
      "shift_id": 1234,
      "status": "assigned",
      "hourly_rate": 15.00,
      "created_at": "2025-11-04T10:00:00Z"
    }
  }
}
```

**Error Response:** 422 Unprocessable Entity (Conflict)
```json
{
  "status": "validation_error",
  "errors": {
    "base": ["Worker has conflicting shift 'Wedding Reception' (2:00 PM - 7:00 PM)"]
  }
}
```

**Conflict Detection:**
- ⚠️ **Time Overlap:** Worker already assigned to overlapping shift
- ⚠️ **Capacity:** Shift is fully staffed
- ⚠️ **Certification:** Worker's certification expired or missing

### Bulk Create Assignments

**Endpoint:** `POST /api/v1/assignments/bulk_create`

**Request:**
```json
{
  "assignments": [
    {
      "worker_id": 778,
      "shift_id": 1234,
      "hourly_rate": 15.00
    },
    {
      "worker_id": 778,
      "shift_id": 1235,
      "hourly_rate": 15.00
    }
  ]
}
```

**Response:** 200 OK (Partial Success)
```json
{
  "status": "success",
  "data": {
    "created": 1,
    "failed": 1,
    "errors": [
      {
        "shift_id": 1235,
        "error": "Worker has conflicting shift"
      }
    ]
  }
}
```

**Note:** Bulk assignments check for conflicts within the batch and against existing assignments.

### Update Assignment

**Endpoint:** `PATCH /api/v1/assignments/:id`

**Request:**
```json
{
  "assignment": {
    "status": "confirmed",
    "hourly_rate": 16.00,
    "hours_worked": 5.0
  }
}
```

**Response:** 200 OK

### Delete Assignment (Unassign)

**Endpoint:** `DELETE /api/v1/assignments/:id`

**cURL Example:**
```bash
curl -X DELETE https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/assignments/5678 \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Assignment deleted successfully"
}
```

### Validate Bulk Assignments

**Endpoint:** `POST /api/v1/staffing/validate_bulk`

**Request:**
```json
{
  "assignments": [
    {
      "worker_id": 778,
      "shift_id": 1234
    },
    {
      "worker_id": 778,
      "shift_id": 1235
    }
  ]
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "valid": [
      {
        "worker_id": 778,
        "shift_id": 1234,
        "conflict": null
      }
    ],
    "invalid": [
      {
        "worker_id": 778,
        "shift_id": 1235,
        "conflict": "Worker has conflicting shift 'Event Name' (2:00 PM - 7:00 PM)"
      }
    ]
  }
}
```

---

## 🎉 Events Endpoints

### List Events

**Endpoint:** `GET /api/v1/events`

**Query Parameters:**
- `status` (string): Filter by status (draft, published, completed, deleted)
- `start_date` (date): Filter events starting on or after this date
- `end_date` (date): Filter events ending on or before this date

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": 255,
        "title": "Wedding Reception",
        "venue_name": "Venue Name",
        "start_time_utc": "2025-11-15T16:00:00Z",
        "end_time_utc": "2025-11-15T21:00:00Z",
        "status": "published",
        "total_shifts": 5,
        "assigned_shifts_count": 3,
        "created_at": "2025-11-04T10:00:00Z"
      }
    ]
  }
}
```

### Get Event Details

**Endpoint:** `GET /api/v1/events/:id`

**Response:** 200 OK

### Create Event

**Endpoint:** `POST /api/v1/events`

**Response:** 201 Created

### Update Event

**Endpoint:** `PATCH /api/v1/events/:id`

**Response:** 200 OK

### Publish Event

**Endpoint:** `POST /api/v1/events/:id/publish`

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Event published successfully",
  "data": {
    "event": {
      "id": 255,
      "status": "published",
      "shifts_created": 5
    }
  }
}
```

### Delete Event

**Endpoint:** `DELETE /api/v1/events/:id`

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Event moved to trash and all assignments cancelled",
  "event_id": 255,
  "event_title": "Wedding Reception"
}
```

**Note:** Soft delete - sets status to `deleted` and cancels all assignments.

---

## 🏆 Certifications Endpoints

### List Certifications

**Endpoint:** `GET /api/v1/certifications`

**cURL Example:**
```bash
curl https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/certifications \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "certifications": [
      {
        "id": 79,
        "name": "Food Handler",
        "created_at": "2025-10-21T10:00:00Z",
        "updated_at": "2025-10-21T10:00:00Z"
      },
      {
        "id": 78,
        "name": "ServSafe",
        "created_at": "2025-10-21T10:00:00Z",
        "updated_at": "2025-10-21T10:00:00Z"
      }
    ]
  }
}
```

---

## 📜 Activity Logs Endpoints

### List Activity Logs

**Endpoint:** `GET /api/v1/activity_logs`

**Query Parameters:**
- `entity_type` (string): Filter by entity type (Worker, Shift, Assignment, Event)
- `entity_id` (integer): Filter by entity ID
- `action` (string): Filter by action (created, updated, deleted, assigned, unassigned)
- `start_date` (date): Filter logs from this date
- `end_date` (date): Filter logs until this date
- `page` (integer): Page number for pagination
- `per_page` (integer): Items per page (default: 50)

**cURL Example:**
```bash
curl "https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/activity_logs?entity_type=Worker&action=created&page=1" \
  -b cookies.txt
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "activity_logs": [
      {
        "id": 12345,
        "actor_user_id": 1,
        "actor_email": "gravyadmin@socialcatering.com",
        "entity_type": "Worker",
        "entity_id": 778,
        "entity_name": "Alex Williams",
        "action": "created",
        "action_description": "Admin created worker Alex Williams",
        "before_json": null,
        "after_json": {
          "first_name": "Alex",
          "last_name": "Williams",
          "email": "alex.williams21@socialcatering.com"
        },
        "created_at_utc": "2025-11-04T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total_pages": 5,
      "total_count": 250
    }
  }
}
```

**Action Types:**
- `created` - Record created
- `updated` - Record updated
- `deleted` - Record deleted
- `assigned` - Worker assigned to shift
- `unassigned` - Worker unassigned from shift

---

## 📊 Reports Endpoints

### Timesheet Report

**Endpoint:** `GET /api/v1/reports/timesheet`

**Query Parameters:**
- `start_date` (date, required): Report start date (YYYY-MM-DD)
- `end_date` (date, required): Report end date (YYYY-MM-DD)
- `event_id` (integer, optional): Filter by event
- `worker_id` (integer, optional): Filter by worker
- `skill_name` (string, optional): Filter by skill/role

**cURL Example:**
```bash
curl "https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1/reports/timesheet?start_date=2025-10-20&end_date=2025-10-27" \
  -b cookies.txt \
  -o weeklytimesheet_2025-10-20_to_2025-10-27.csv
```

**Response:** CSV file download
```
Worker Name,Event Name,Date,Role,Hours,Pay Rate,Payout
Alex Williams,Wedding Reception,11/15/2025,Bartender,5.0,15.00,75.00
...
TOTAL,,,,,350.00
```

### Payroll Summary Report

**Endpoint:** `GET /api/v1/reports/payroll`

**Query Parameters:** Same as Timesheet Report

**Response:** CSV file download
```
Worker Name,Total Hours,Total Payout
Alex Williams,25.0,375.00
John Doe,20.0,300.00
...
```

### Worker Hours Report

**Endpoint:** `GET /api/v1/reports/worker_hours`

**Query Parameters:** Same as Timesheet Report

**Response:** CSV file download with detailed worker breakdown

### Event Summary Report

**Endpoint:** `GET /api/v1/reports/event_summary`

**Query Parameters:**
- `start_date` (date, optional)
- `end_date` (date, optional)

**Response:** CSV file download with event costs and worker counts

---

## 📝 Response Formats

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Error message here"
}
```

### Validation Error Response
```json
{
  "status": "validation_error",
  "errors": {
    "email": ["has already been taken"],
    "phone": ["must be 10-15 digits only"]
  }
}
```

### Conflict Error Response
```json
{
  "status": "validation_error",
  "errors": {
    "base": ["Worker has conflicting shift 'Event Name' (2:00 PM - 7:00 PM)"]
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

- **200 OK** - Successful request
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request format
- **401 Unauthorized** - Authentication required
- **404 Not Found** - Resource not found
- **422 Unprocessable Entity** - Validation errors or conflicts
- **500 Internal Server Error** - Server error

### Common Error Scenarios

**1. Authentication Required:**
```json
{
  "status": "error",
  "error": "Not authenticated"
}
```
**Solution:** Login first, ensure cookies are sent with requests.

**2. Conflict Detection:**
```json
{
  "status": "validation_error",
  "errors": {
    "base": ["Worker has conflicting shift 'Event Name' (2:00 PM - 7:00 PM)"]
  }
}
```
**Solution:** Check worker's existing assignments, unassign conflicting shift first.

**3. Capacity Exceeded:**
```json
{
  "status": "validation_error",
  "errors": {
    "base": ["Shift is fully staffed (2 workers)"]
  }
}
```
**Solution:** Check shift capacity, unassign a worker first.

**4. Certification Expired:**
```json
{
  "status": "validation_error",
  "errors": {
    "base": ["Worker's Food Handler expires on 10/20/2025, before shift ends 11/15/2025"]
  }
}
```
**Solution:** Update worker's certification expiry date.

---

## 🔒 Security Notes

1. **All endpoints require authentication** (except `/healthz` and `/login`)
2. **CSRF protection** is disabled for API (session-based auth handles this)
3. **CORS** is configured for specific origins
4. **Rate limiting** is not currently implemented (consider for production)
5. **Input validation** is performed on all endpoints
6. **SQL injection protection** via ActiveRecord parameterized queries

---

## 📚 Additional Resources

- **Health Check:** `GET /healthz` (no authentication required)
- **API Base:** All endpoints under `/api/v1/`
- **Session Management:** Cookies handled automatically by browser/HTTP client

---

**Last Updated:** November 2025  
**API Version:** v1

For deployment procedures, see `docs/RUNBOOK.md`.  
For environment configuration, see `docs/ENV_CONFIG.md`.

