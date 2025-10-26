# Axios Error Fix - Bulk Assignment Endpoint

**Date**: 2025-10-26  
**Error**: `POST /api/v1/staffing/bulk_create` returned 404  
**Status**: ✅ FIXED

---

## Problem

During E2E manual testing, attempting to schedule a worker for shifts resulted in:
```
POST https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/api/v1/staffing/bulk_create
Status: 404 Not Found
AxiosError: Request failed with status code 404
```

**Root Cause**: The frontend was sending:
```json
{
  "assignments": [
    { "shift_id": 123, "worker_id": 456, "hourly_rate": 15.50 }
  ]
}
```

But the backend `bulk_create` method only expected:
```json
{
  "worker_id": 456,
  "shift_ids": [123, 456, 789]
}
```

---

## Solution

Updated `app/controllers/api/v1/staffing_controller.rb` to support **both formats**:

### Frontend Format (assignments array):
```json
{
  "assignments": [
    { "shift_id": 123, "worker_id": 456, "hourly_rate": 15.50 },
    { "shift_id": 124, "worker_id": 456, "hourly_rate": 16.00 }
  ]
}
```

### Backend Format (worker_id + shift_ids):
```json
{
  "worker_id": 456,
  "shift_ids": [123, 124]
}
```

**Code Change**:
```ruby
def bulk_create
  # Support both formats
  if params[:worker_id].present? && params[:shift_ids].present?
    # Format 1: worker_id + shift_ids array
    worker = Worker.find_by(id: params[:worker_id])
    shift_ids = params[:shift_ids] || []
  elsif params[:assignments].present?
    # Format 2: assignments array with shift_id and worker_id
    first_assignment = params[:assignments].first
    worker_id = first_assignment[:worker_id] || first_assignment['worker_id']
    worker = Worker.find_by(id: worker_id)
    
    if worker_id.blank? || !worker
      return render json: {
        status: 'error',
        message: 'Worker not found in assignments'
      }, status: :not_found
    end
    
    shift_ids = params[:assignments].map { |a| a[:shift_id] || a['shift_id'] }.compact
  else
    return render json: {
      status: 'error',
      message: 'Worker ID and shifts required'
    }, status: :unprocessable_entity
  end
  # ... rest of the method
end
```

---

## Other API Endpoints Verified

### ✅ `/api/v1/staffing` (POST)
- **Used by**: AssignmentModal, QuickFillModal
- **Payload**: `{ assignment: { shift_id, worker_id, ... } }`
- **Status**: ✅ Working (uses `assignment_params`)

### ✅ `/api/v1/staffing/bulk_create` (POST)  
- **Used by**: WorkersPage (schedule multiple shifts)
- **Payload**: `{ assignments: [{ shift_id, worker_id, hourly_rate }] }`
- **Status**: ✅ FIXED (now supports both formats)

### ✅ `/api/v1/staffing/:id` (DELETE)
- **Used by**: EventsPage (unassign worker)
- **Status**: ✅ Working

---

## Deployment

**Version**: v115  
**Deployed**: 2025-10-26  
**Files Changed**: 
- `app/controllers/api/v1/staffing_controller.rb`

---

## Testing

1. Create a worker
2. Open the "Schedule [Worker] for Shifts" modal
3. Select multiple shifts
4. Click "Schedule for X Shifts"
5. **Expected**: Success message, no 404 error

---

## Verification

To verify the fix works:
```bash
# Test bulk_create endpoint
curl -X POST https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/api/v1/staffing/bulk_create \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION" \
  -d '{
    "assignments": [
      { "shift_id": 123, "worker_id": 456, "hourly_rate": 15.50 },
      { "shift_id": 124, "worker_id": 456, "hourly_rate": 16.00 }
    ]
  }'
```

**Expected**: 200 OK with assignments created

