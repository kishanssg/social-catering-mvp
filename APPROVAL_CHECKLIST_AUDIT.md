# Approval Workflow Checklist - Complete Audit Report

**Date:** 2025-01-27  
**Status:** ✅ MOSTLY COMPLETE - 1 Gap Found

---

## UI Functionality Checklist

### ✅ 1. See which events have unapproved hours
**Status:** ✅ **IMPLEMENTED**

**Location:** `social-catering-ui/src/pages/EventsPage.tsx` (lines 1425-1437)

**Implementation:**
- Fetches approval status for all completed events on load
- Shows badge on each event card:
  - "All Hours Approved" (green) when all approved
  - "X Pending Approval" (amber) when pending
- "Approve Hours" button shows pending count: "Approve Hours (X)"

**Code Evidence:**
```typescript
{event.approval_status && event.approval_status.total > 0 && (
  event.approval_status.approved === event.approval_status.total ? (
    <span className="...bg-emerald-100...">All Hours Approved</span>
  ) : (
    <span className="...bg-amber-100...">{event.approval_status.pending} Pending Approval</span>
  )
)}
```

---

### ✅ 2. Click into completed event
**Status:** ✅ **IMPLEMENTED**

**Location:** `social-catering-ui/src/pages/EventsPage.tsx` (line 1370)

**Implementation:**
- Click on event card header expands to show details
- `onToggleEvent(event.id)` handles expansion
- Shows all workers, hours, and approval status

**Code Evidence:**
```typescript
<div onClick={() => onToggleEvent(event.id)} className="...cursor-pointer">
```

---

### ✅ 3. See all workers for that shift
**Status:** ✅ **IMPLEMENTED**

**Location:** `social-catering-ui/src/pages/EventsPage.tsx` (lines 1548-1600)

**Implementation:**
- Expanded view shows all workers grouped by role
- Each worker shows: name, hours, rate, pay, shift time
- Approval status shown per worker

**Code Evidence:**
```typescript
{roleGroup.shifts.flatMap(shift => 
  shift.assignments.map(assignment => (
    <div key={assignment.id}>
      {/* Worker details */}
    </div>
  ))
)}
```

---

### ✅ 4. Edit individual worker hours
**Status:** ✅ **IMPLEMENTED**

**Location:** `social-catering-ui/src/components/ApprovalModal.tsx` (lines 84-104, 293-334)

**Implementation:**
- "Edit Hours" button opens edit mode
- Can edit: hours_worked, actual_start_time_utc, actual_end_time_utc, hourly_rate
- Saves via PATCH `/approvals/:id/update_hours`
- Shows scheduled vs actual hours comparison

**Code Evidence:**
```typescript
const handleEditHours = (assignment: AssignmentForApproval) => {
  setEditingId(assignment.id);
  setEditData({
    hours_worked: assignment.hours_worked || assignment.scheduled_hours,
    actual_start_time_utc: assignment.actual_start || assignment.scheduled_start,
    actual_end_time_utc: assignment.actual_end || assignment.scheduled_end,
    hourly_rate: assignment.hourly_rate
  });
};
```

---

### ✅ 5. Mark a worker as "no-show" (removes from payroll)
**Status:** ✅ **IMPLEMENTED**

**Location:** `social-catering-ui/src/components/ApprovalModal.tsx` (lines 106-127, 415-421)

**Implementation:**
- "No-Show" button with warning variant (amber)
- Custom confirmation dialog (no browser alerts)
- Sets status to 'no_show', hours_worked to 0
- POST `/approvals/:id/mark_no_show`
- Worker removed from payroll calculations

**Code Evidence:**
```typescript
const handleMarkNoShow = async (assignmentId: number, workerName: string) => {
  setConfirmDialog({
    open: true,
    title: 'Mark No-Show',
    message: `Mark ${workerName} as no-show? This will set hours to 0.`,
    variant: 'warning',
    // ... calls API
  });
};
```

**Backend:** `app/models/assignment.rb` (lines 267-285) - `mark_no_show!` method

---

### ✅ 6. See what's changed from original
**Status:** ✅ **IMPLEMENTED**

**Location:** 
- `social-catering-ui/src/components/ApprovalModal.tsx` (lines 337-361)
- `social-catering-ui/src/pages/EventsPage.tsx` (lines 1575-1583)

**Implementation:**
- Shows "Scheduled Hours" vs "Hours Worked" side-by-side
- Scheduled hours from `assignment.scheduled_hours` (calculated from shift duration)
- Actual hours from `assignment.effective_hours` or `assignment.hours_worked`
- Visual indicator (edit icon) when hours were edited
- Shows original_hours_worked in audit trail

**Code Evidence:**
```typescript
<div>
  <p className="text-xs text-gray-500 mb-1">Scheduled Hours</p>
  <p className="font-medium text-gray-900">{safeToFixed(assignment.scheduled_hours, 2, '0.00')}h</p>
</div>
<div>
  <p className="text-xs text-gray-500 mb-1">Hours Worked</p>
  <p className="font-medium text-gray-900">
    {safeToFixed(assignment.effective_hours, 2, '0.00')}h
    {assignment.edited_at && <Edit2 className="h-3 w-3 inline" />}
  </p>
</div>
```

---

### ✅ 7. Approve all hours for that event
**Status:** ✅ **IMPLEMENTED**

**Location:** `social-catering-ui/src/components/ApprovalModal.tsx` (lines 151-170, 458-466)

**Implementation:**
- "Approve All (X)" button in modal footer
- Only shows when there are unapproved assignments
- Custom confirmation dialog
- POST `/events/:id/approve_all`
- Approves all eligible assignments at once

**Code Evidence:**
```typescript
const handleApproveAll = async () => {
  const unapprovedCount = assignments.filter(a => !a.approved && a.can_approve).length;
  setConfirmDialog({
    open: true,
    title: 'Approve All Hours',
    message: `Approve hours for all ${unapprovedCount} eligible workers?`,
    onConfirm: async () => {
      await apiClient.post(`/events/${event.id}/approve_all`);
      // ...
    }
  });
};
```

**Backend:** `app/controllers/api/v1/approvals_controller.rb` (lines 97-131) - `approve_event` action

---

### ⚠️ 8. Go back and re-edit if needed after approval
**Status:** ⚠️ **PARTIALLY IMPLEMENTED - GAP FOUND**

**Current Behavior:**
- `can_edit_hours?` returns `false` if `approved?` is true
- Edit button is hidden when `assignment.approved` is true
- **CANNOT edit hours after approval**

**Location:** 
- `app/models/assignment.rb` (line 325-328)
- `social-catering-ui/src/components/ApprovalModal.tsx` (line 406)

**Code Evidence:**
```ruby
def can_edit_hours?
  # Can edit if shift has ended and not yet approved
  shift&.end_time_utc && shift.end_time_utc < Time.current && !approved?
end
```

```typescript
{!assignment.approved && assignment.can_edit_hours && ... && (
  <button onClick={() => handleEditHours(assignment)}>Edit Hours</button>
)}
```

**Gap:** Once hours are approved, they cannot be re-edited. This may be intentional (data integrity), but the checklist requires this functionality.

**Recommendation:** 
- Option A: Allow editing after approval (remove `!approved?` check, add "Re-edit" button)
- Option B: Document that approval is final (if intentional)

---

## Data Model Checklist

### ✅ 1. Original scheduled hours
**Status:** ✅ **IMPLEMENTED**

**Location:** `app/models/concerns/hours_calculations.rb` (lines 31-38)

**Implementation:**
- `scheduled_hours` method calculates from shift duration
- Uses `shift.duration_hours` (calculated from start_time_utc and end_time_utc)
- Stored in `original_hours_worked` when hours are first edited

**Code Evidence:**
```ruby
def scheduled_hours
  return 0.0 unless shift.present?
  shift.duration_hours
end
```

**Database:** `assignments.original_hours_worked` (decimal, nullable)

---

### ✅ 2. Actual/approved hours
**Status:** ✅ **IMPLEMENTED**

**Location:** 
- `app/models/concerns/hours_calculations.rb` (lines 11-29)
- `db/schema.rb` (line 19)

**Implementation:**
- `hours_worked` column stores actual logged hours
- `effective_hours` method (SSOT) returns: logged hours > scheduled hours > 0
- Used everywhere for calculations

**Code Evidence:**
```ruby
def effective_hours
  if hours_worked.present? && hours_worked > 0
    hours_worked.to_f
  elsif shift.start_time_utc.present? && shift.end_time_utc.present?
    # Calculate from shift duration
  else
    0.0
  end
end
```

**Database:** `assignments.hours_worked` (decimal, nullable)

---

### ✅ 3. Approval status (pending/approved)
**Status:** ✅ **IMPLEMENTED**

**Location:** `db/schema.rb` (line 78)

**Implementation:**
- `approved` boolean column (default: false)
- Serialized in API response
- Shown in UI with badges

**Code Evidence:**
```ruby
t.boolean "approved", default: false, null: false
```

**API:** `app/controllers/api/v1/approvals_controller.rb` (line 186) - includes `approved: a.approved`

---

### ✅ 4. Approval timestamp + who approved
**Status:** ✅ **IMPLEMENTED**

**Location:** 
- `db/schema.rb` (lines 79-80)
- `app/controllers/api/v1/approvals_controller.rb` (lines 187, 378-382)

**Implementation:**
- `approved_at_utc` timestamp column
- `approved_by_id` foreign key to users
- Serialized as `approved_by_name` (email) and `approved_at` (ISO string)
- Displayed in ApprovalModal audit trail

**Code Evidence:**
```ruby
t.timestamptz "approved_at_utc"
t.integer "approved_by_id"
```

```typescript
{assignment.approved_by_name && (
  <p className="text-xs text-gray-500 mt-1">
    Approved by {assignment.approved_by_name} on{' '}
    {assignment.approved_at ? new Date(assignment.approved_at).toLocaleString() : ''}
  </p>
)}
```

---

### ✅ 5. No-show flag
**Status:** ✅ **IMPLEMENTED**

**Location:** 
- `app/models/assignment.rb` (line 18, 267-285)
- `db/schema.rb` - status column includes 'no_show'

**Implementation:**
- `status` column with validation: `['assigned', 'confirmed', 'completed', 'cancelled', 'no_show']`
- `mark_no_show!` method sets status to 'no_show' and hours_worked to 0
- Shown in UI with red badge

**Code Evidence:**
```ruby
validates :status, inclusion: { in: [ "assigned", "confirmed", "completed", "cancelled", "no_show" ] }

def mark_no_show!(updated_by_user, notes: nil)
  # Sets status: 'no_show', hours_worked: 0
end
```

```typescript
{assignment.status === 'no_show' && (
  <span className="...bg-red-100 text-red-800">No-Show</span>
)}
```

---

## Summary

### ✅ Complete (13/14 items)
1. See which events have unapproved hours
2. Click into completed event
3. See all workers for that shift
4. Edit individual worker hours
5. Mark worker as no-show
6. See what's changed from original
7. Approve all hours for event
8. Original scheduled hours (data model)
9. Actual/approved hours (data model)
10. Approval status (data model)
11. Approval timestamp + who approved (data model)
12. No-show flag (data model)

### ⚠️ Gap Found (1/14 items)
1. **Re-edit after approval** - Currently blocked by `can_edit_hours?` check

---

## Recommendations

### Priority 1: Fix Re-Edit After Approval
**File:** `app/models/assignment.rb`

**Current:**
```ruby
def can_edit_hours?
  shift&.end_time_utc && shift.end_time_utc < Time.current && !approved?
end
```

**Proposed Fix:**
```ruby
def can_edit_hours?
  # Allow editing if shift has ended (even after approval for corrections)
  shift&.end_time_utc && shift.end_time_utc < Time.current
end
```

**Also update UI:** `social-catering-ui/src/components/ApprovalModal.tsx` (line 406)
- Remove `!assignment.approved` check
- Add "Re-edit" label when approved
- Show warning that this will un-approve the assignment

---

## Test Checklist

After implementing the fix, verify:

1. ✅ Approve hours for an assignment
2. ✅ Click "Re-edit" button (should appear after approval)
3. ✅ Edit hours and save
4. ✅ Verify assignment is un-approved after edit
5. ✅ Re-approve the assignment
6. ✅ Verify audit trail shows both approval and re-edit timestamps

---

**Audit Completed:** 2025-01-27  
**Next Action:** Fix re-edit after approval functionality

