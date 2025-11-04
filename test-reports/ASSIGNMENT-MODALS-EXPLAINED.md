# Assignment Modals Explained

**Last Updated**: 2025-10-26  
**Backend Version**: v119 (deployed)

---

## Overview

There are **3 different modal types** for assigning workers to shifts:

1. **AssignmentModal** - Assign one worker to one shift
2. **BulkAssignmentModal** (from WorkersPage) - Assign one worker to multiple shifts
3. **QuickFillModal** - Round-robin assign multiple workers to multiple shifts

---

## 1. AssignmentModal (`AssignmentModal.tsx`)

**Location**: `social-catering-ui/src/components/AssignmentModal.tsx`

### How it works:
- **Purpose**: Assign a single worker to a single shift
- **API Endpoint**: `POST /api/v1/staffing`
- **Payload Format**:
  ```json
  {
    "assignment": {
      "shift_id": 123,
      "worker_id": 456,
      "status": "assigned",
      "assigned_at_utc": "2025-10-27T09:00:00Z",
      "hourly_rate": 15.50
    }
  }
  ```

### Backend Handler:
- **Controller**: `app/controllers/api/v1/staffing_controller.rb`
- **Method**: `create` (lines 53-77)
- **Validation**: 
  - Time overlap check (via `worker_available_for_shift` callback)
  - Capacity check (via `shift_not_at_capacity` callback)
  - Skill requirement check (via `worker_has_required_skills` callback)
- **On Success**: Returns 201 with assignment data
- **On Error**: Returns 422 with validation errors

### Key Code:
```typescript
const response = await apiClient.post('/staffing', {
  assignment: {
    shift_id: shift.id,
    worker_id: selectedWorker.id,
    status: 'assigned',
    assigned_at_utc: new Date().toISOString(),
    hourly_rate: workerPayRates[selectedWorker.id] || Number(shift.pay_rate) || 0,
  }
});
```

---

## 2. BulkAssignmentModal (from WorkersPage)

**Location**: `social-catering-ui/src/pages/WorkersPage.tsx` (lines 513-723)

### How it works:
- **Purpose**: Assign one worker to multiple shifts at once
- **API Endpoint**: `POST /api/v1/staffing/bulk_create`
- **Payload Format**:
  ```json
  {
    "assignments": [
      { "shift_id": 123, "worker_id": 456, "hourly_rate": 13.00 },
      { "shift_id": 124, "worker_id": 456, "hourly_rate": 14.50 }
    ]
  }
  ```

### Backend Handler:
- **Controller**: `app/controllers/api/v1/staffing_controller.rb`
- **Method**: `bulk_create` (lines 80-285)
- **Logic**:
  1. Extract worker_id and shift_ids from `assignments` array
  2. Load EXISTING assignments for that worker
  3. For each shift in the batch:
     - Check time overlap with EXISTING assignments only (not batch items)
     - Check required skills
     - Check capacity
     - Use hourly_rate from frontend
     - Create assignment with status 'confirmed'
     - Add to existing_assignments to check against in next iteration
  4. Rollback entire transaction if ANY error
  5. Return success count or detailed errors

### Key Features:
- **Transaction**: All assignments succeed or all fail
- **Conflict Detection**: Only checks against EXISTING assignments, not current batch
- **Hourly Rate**: Extracted from frontend payload
- **Status**: 'confirmed' (different from AssignmentModal's 'assigned')

### Key Code:
```typescript
const assignments = uniqueShiftIds.map(shiftId => {
  const shift = availableShifts.find(s => s.all_shift_ids?.includes(shiftId));
  const payRate = shiftPayRates[shiftId] || (Number(shift?.pay_rate) || 0);
  return {
    shift_id: shiftId,
    worker_id: worker.id,
    hourly_rate: payRate
  };
});

const response = await apiClient.post('/staffing/bulk_create', {
  assignments: assignments
});
```

---

## 3. QuickFillModal

**Location**: `social-catering-ui/src/components/QuickFillModal.tsx`

### How it works:
- **Purpose**: Round-robin assign multiple workers to multiple unfilled shifts
- **API Endpoint**: `POST /api/v1/staffing` (per assignment)
- **Method**: Makes individual API calls for each assignment (not bulk)
- **Algorithm**: Round-robin distributes workers across shifts

### Example:
- 3 workers selected
- 7 shifts need workers
- Result: Worker A → Shifts 1, 4, 7; Worker B → Shifts 2, 5; Worker C → Shifts 3, 6

### Backend Handler:
Same as **AssignmentModal** (uses `create` method)

### Key Code:
```typescript
const assignRoundRobin = async () => {
  const selectedWorkers = selected.map((id) => workers.find((w) => w.id === id)).filter(Boolean);
  const shifts = [...unfilledShiftIds];
  let wi = 0;
  while (shifts.length > 0 && selectedWorkers.length > 0) {
    const worker = selectedWorkers[wi % selectedWorkers.length];
    const shiftId = shifts.shift()!;
    try {
      const res = await apiClient.post('/staffing', {
        assignment: {
          shift_id: shiftId,
          worker_id: worker.id,
          status: 'assigned',
          assigned_at_utc: new Date().toISOString(),
          hourly_rate: payRate,
        },
      });
      // ... handle success/failure
    } catch (e) {
      // ... handle error
    }
    wi += 1;
  }
};
```

---

## Key Differences

| Feature | AssignmentModal | BulkAssignmentModal | QuickFillModal |
|---------|----------------|-------------------|----------------|
| **Workers** | 1 | 1 | Multiple |
| **Shifts** | 1 | Multiple | Multiple |
| **API Call** | Single POST | Single POST (bulk) | Multiple POSTs |
| **Transaction** | Single assignment | All-or-nothing | Independent |
| **Status** | 'assigned' | 'confirmed' | 'assigned' |
| **Conflict Check** | Against existing only | Against existing only | Per-call against existing |
| **Hourly Rate Source** | Worker pay rate or shift pay rate | Frontend payload | Worker pay rate or default |

---

## Validation Rules (All Modals)

All three modals use the same backend validation rules:

### 1. Time Overlap
- **Rule**: Two shifts overlap if `(shift1_start < shift2_end) AND (shift1_end > shift2_start)`
- **Check**: Assignment model's `worker_available_for_shift` callback
- **Exclusions**: Cancelled and no-show assignments are excluded

### 2. Capacity
- **Rule**: Shift cannot exceed its capacity
- **Check**: Assignment model's `shift_not_at_capacity` callback
- **Count**: Active assignments only (excludes cancelled/no-show)

### 3. Required Skills
- **Rule**: Worker must have the required skill for the shift
- **Check**: Assignment model's `worker_has_required_skills` callback
- **Skills**: Checked against `worker.skills_json` (can be String or Array)

### 4. Hourly Rate
- **Rule**: Assignment must have an hourly_rate
- **Source**: Frontend payload or shift.pay_rate
- **Validation**: Must be numeric and >= 0

---

## Error Handling

All modals display detailed error messages:

```typescript
if (error.response?.data?.details && error.response.data.details.length > 0) {
  errorMessage += '\n\nDetails:\n• ' + error.response.data.details.join('\n• ');
} else if (error.response?.data?.errors) {
  errorMessage += '\n\nDetails:\n• ' + error.response.data.errors.join('\n• ');
} else if (error.response?.data?.message) {
  errorMessage = error.response.data.message;
}
```

Example error format:
```
Some assignments could not be created

Details:
• Shift 896 (Downtown Party at The Hawkers): Worker has conflicting shift 'Event A' (09:00 AM - 03:00 PM)
• Shift 897 (Downtown Party at The Hawkers): Worker does not have required skill: Bartender
• Shift 900 (Downtown Party at The Hawkers): Shift is already at full capacity (5/5 workers assigned)
```

---

## Database Schema (Assignments Table)

```ruby
t.references :shift, null: false, foreign_key: true, on_delete: :cascade
t.references :worker, null: false, foreign_key: true, on_delete: :restrict
t.references :assigned_by, foreign_key: { to_table: :users }
t.datetime :assigned_at_utc
t.decimal :hourly_rate
t.decimal :hours_worked
t.integer :status # 'assigned', 'confirmed', 'completed', 'cancelled'
t.text :notes
# ... other fields (clock_in, clock_out, break, overtime, etc.)
```

---

## Common Issues & Solutions

### Issue 1: "Worker has conflicting shift" error
**Cause**: Worker already assigned to overlapping shift  
**Solution**: Check existing assignments before scheduling

### Issue 2: "Hourly rate required" error
**Cause**: `hourly_rate` is nil  
**Solution**: Ensure frontend sends `hourly_rate` in payload OR shift has `pay_rate`

### Issue 3: "Shift is already at full capacity" error
**Cause**: Too many workers already assigned  
**Solution**: Check `shift.assignments.count` before assigning

### Issue 4: "Worker does not have required skill" error
**Cause**: Worker's skills don't match shift requirement  
**Solution**: Add skill to worker or change shift requirement

---

## Testing

To test all three modal types:

1. **AssignmentModal**: Open any shift detail page → Click "Assign Worker" → Select worker → Confirm
2. **BulkAssignmentModal**: Open Workers page → Click on worker → Click "Schedule for Shifts" → Select multiple shifts → Confirm
3. **QuickFillModal**: Open Events page → Find event with unfilled shifts → Click "Quick Fill" → Select workers → Confirm

---

## Recent Changes (v119)

### Removed:
- Early `check_scheduling_conflicts` call that was comparing shifts in batch against each other

### Added:
- Per-shift conflict checking against EXISTING assignments only
- Hourly rate extraction from frontend payload
- Assignment status tracking within the loop

### Fixed:
- 422 errors caused by nil hourly_rate
- False conflict warnings when scheduling multiple shifts

