# Social Catering API Documentation

**Base URL:** `http://localhost:3000/api/v1` (development)  
**Base URL:** `https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/api/v1` (staging)

**Authentication:** Session-based (Devise)  
**Content-Type:** `application/json`  
**CORS:** Enabled for localhost:3001, 5173 (dev) and Heroku domains (staging/prod)

---

## Authentication

### Login
POST /login
**Request:**
```json
{
  "user": {
    "email": "natalie@socialcatering.com",
    "password": "Password123!"
  }
}
```
**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "natalie@socialcatering.com",
      "role": "admin"
    }
  }
}
```

### Logout
DELETE /logout
**Response:** 200 OK

---

## Dashboard

### Get Dashboard Data
GET /dashboard
**Response:** 200 OK
```json
{
  "data": {
    "shift_counts": {
      "draft": 5,
      "published": 10,
      "assigned": 20,
      "completed": 15,
      "total": 50
    },
    "fill_status": {
      "unfilled": 3,
      "partial": 5,
      "covered": 12
    },
    "today_shifts": [...],
    "upcoming_shifts": [...]
  },
  "status": "success"
}
```

---

## Workers

### List Workers
GET /workers
**Query Parameters:**
- `query` (string): Search by name or skills
- `certification_id` (integer): Filter by certification
- `available_for_shift_id` (integer): Only show workers available for this shift

**Example:**
```
GET /workers?query=cooking&available_for_shift_id=5
```
**Response:** 200 OK
```json
{
  "data": {
    "workers": [
      {
        "id": 1,
        "first_name": "Worker1",
        "last_name": "Test",
        "email": "worker1@test.com",
        "phone": "555-0001",
        "skills_json": ["cooking", "bartending"],
        "active": true,
        "certifications": [
          { "id": 1, "name": "ServSafe" }
        ]
      }
    ]
  },
  "status": "success"
}
```

### Get Worker
GET /workers/:id

### Create Worker
POST /workers
**Request:**
```json
{
  "worker": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "skills_json": ["cooking", "serving"],
    "notes": "Experienced server"
  }
}
```

### Update Worker
PUT /workers/:id

---

## Shifts

### List Shifts
GET /shifts
**Query Parameters:**
- `status` (string): draft, published, assigned, completed
- `timeframe` (string): past, today, upcoming
- `fill_status` (string): unfilled, partial, covered

**Example:**
```
GET /shifts?status=published&timeframe=upcoming&fill_status=unfilled
```
**Response:** 200 OK
```json
{
  "data": {
    "shifts": [
      {
        "id": 1,
        "client_name": "Test Client",
        "role_needed": "Server",
        "location": "Downtown",
        "start_time_utc": "2025-10-08T18:00:00Z",
        "end_time_utc": "2025-10-08T22:00:00Z",
        "capacity": 3,
        "status": "published",
        "assigned_count": 1,
        "available_slots": 2,
        "workers": [...],
        "assignments": [...]
      }
    ]
  },
  "status": "success"
}
```

### Get Shift
GET /shifts/:id

### Create Shift
POST /shifts
**Request:**
```json
{
  "shift": {
    "client_name": "Acme Corp",
    "role_needed": "Server",
    "location": "123 Main St",
    "start_time_utc": "2025-10-10T18:00:00Z",
    "end_time_utc": "2025-10-10T22:00:00Z",
    "pay_rate": 25.00,
    "capacity": 3,
    "status": "draft",
    "notes": "Formal event"
  }
}
```

### Update Shift
PUT /shifts/:id

### Delete Shift
DELETE /shifts/:id
**Note:** Cannot delete shifts with assignments

---

## Assignments

### Assign Worker to Shift
POST /assignments
**Request:**
```json
{
  "shift_id": 1,
  "worker_id": 5
}
```
**Success Response:** 201 Created
```json
{
  "data": {
    "assignment": {
      "id": 1,
      "shift_id": 1,
      "worker_id": 5,
      "status": "assigned",
      "assigned_at_utc": "2025-10-07T12:00:00Z"
    }
  },
  "status": "success"
}
```
**Conflict Response:** 409 Conflict
```json
{
  "error": "Worker has overlapping shift from 02:00PM to 06:00PM",
  "status": "error"
}
```

### Unassign Worker from Shift
DELETE /assignments/:id

---

## Activity Logs

### List Activity Logs
GET /activity_logs
**Query Parameters:**
- `entity_type` (string): Shift, Worker, Assignment
- `entity_id` (integer): ID of the entity
- `actor_user_id` (integer): User who performed the action
- `action` (string): created, updated, deleted
- `from_date` (date): Filter from this date
- `to_date` (date): Filter to this date
- `page` (integer): Page number (default: 1, 50 per page)

**Example:**
```
GET /activity_logs?entity_type=Shift&action=created&page=1
```
**Response:** 200 OK
```json
{
  "data": {
    "activity_logs": [
      {
        "id": 1,
        "entity_type": "Shift",
        "entity_id": 5,
        "action": "created",
        "before_json": null,
        "after_json": {...},
        "created_at_utc": "2025-10-07T12:00:00Z",
        "actor_user": {
          "id": 1,
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total_count": 150,
      "total_pages": 3
    }
  },
  "status": "success"
}
```

---

## Certifications

### List Certifications
GET /certifications
**Response:** 200 OK
```json
{
  "data": {
    "certifications": [
      { "id": 1, "name": "ServSafe" },
      { "id": 2, "name": "TIPS" },
      { "id": 3, "name": "Food Handler" }
    ]
  },
  "status": "success"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "You need to sign in or sign up before continuing.",
  "status": "error"
}
```

### 404 Not Found
```json
{
  "error": "Record not found: Couldn't find Worker with 'id'=999",
  "status": "error"
}
```

### 422 Unprocessable Entity (Validation Error)
```json
{
  "errors": {
    "first_name": ["can't be blank"],
    "email": ["has already been taken"]
  },
  "status": "validation_error"
}
```

### 409 Conflict (Assignment Conflict)
```json
{
  "error": "Worker has overlapping shift from 02:00PM to 06:00PM; Shift is at full capacity (3 workers)",
  "status": "error"
}
```
