# EDIT MODAL BUG DIAGNOSIS REPORT
Date: 2025-01-27
Diagnosed by: Cursor AI Assistant

## Executive Summary

The EditEventModal in the Active Events page has **3 critical bugs** preventing it from working correctly:

1. **Missing `displayEvent` variable definition** - Causes runtime errors when modal tries to display data
2. **Schedule updates not sent to backend** - Modal doesn't include schedule in PATCH request
3. **Modal doesn't allow schedule editing** - Schedule is read-only, forcing users to navigate to full wizard

**Overall Status:** ❌ **CRITICAL ISSUES FOUND - REQUIRES FIXES**

---

## Issue 1: Missing `displayEvent` Variable Definition

### ROOT CAUSE:
The modal uses `displayEvent` variable throughout the JSX (lines 292, 312, 317, 327, 332, 459) but it's **never defined**. The code defines `eventData` (line 107) but never creates `displayEvent`.

**Code:**
```typescript
// Line 107 - Defined but not used in JSX
const eventData = fullEventData || event;

// Line 292 - Uses undefined variable
title={`Edit Event: ${displayEvent.title}`}

// Line 312 - Uses undefined variable
<p className="text-sm font-semibold text-gray-900">{displayEvent.venue?.name}</p>
```

### EVIDENCE:
- **File:** `social-catering-ui/src/components/EditEventModal.tsx`
- **Lines:** 292, 312, 317, 327, 332, 459
- **Error:** `displayEvent` is undefined, causing fields to be blank

### PROPOSED FIX:
```typescript
// Add after line 107:
const displayEvent = fullEventData || event;
```

**OR** replace all `displayEvent` references with `eventData`.

---

## Issue 2: Schedule Updates Not Sent to Backend

### ROOT CAUSE:
The `handleSave` function (lines 197-224) only sends `roles` data but **does not send `schedule` data** to the backend, even though:
- The modal displays schedule information (read-only)
- The backend update endpoint accepts `schedule` params (line 247-253 in events_controller.rb)
- Users expect schedule changes to propagate to shifts

**Code:**
```typescript
// Line 213-223 - Missing schedule data
const response = await apiClient.patch(`/events/${eventToUpdate.id}`, {
  event: {
    roles: roles.map(role => ({
      skill_name: role.skill_name,
      needed: role.needed_workers,
      pay_rate: role.pay_rate,
      // ... other role fields
    }))
    // ❌ MISSING: schedule: { start_time_utc, end_time_utc, break_minutes }
  }
});
```

### EVIDENCE:
- **File:** `social-catering-ui/src/components/EditEventModal.tsx`
- **Line:** 213-223
- **Backend:** `app/controllers/api/v1/events_controller.rb:247-253` accepts schedule updates
- **Result:** Schedule changes don't propagate to shifts or event display

### PROPOSED FIX:
```typescript
const response = await apiClient.patch(`/events/${eventToUpdate.id}`, {
  event: {
    roles: roles.map(role => ({
      skill_name: role.skill_name,
      needed: role.needed_workers,
      pay_rate: role.pay_rate,
      description: role.description,
      uniform_id: role.uniform_id,
      cert_id: role.cert_id
    })),
    // ✅ ADD: Include schedule data if user can edit it
    schedule: eventToUpdate.schedule ? {
      start_time_utc: eventToUpdate.schedule.start_time_utc,
      end_time_utc: eventToUpdate.schedule.end_time_utc,
      break_minutes: eventToUpdate.schedule.break_minutes
    } : undefined
  }
});
```

**Note:** This fix assumes schedule editing is added to the modal. If schedule is read-only, this should still be sent to maintain consistency.

---

## Issue 3: Modal Doesn't Allow Schedule Editing

### ROOT CAUSE:
The modal displays schedule information as **read-only** (lines 312-343) with an "Edit" button that navigates to the full CreateEventWizard. This prevents users from making quick schedule changes within the modal.

**Code:**
```typescript
// Line 312-343 - Read-only schedule display
<div className="space-y-1">
  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Time</p>
  <p className="text-sm font-semibold text-gray-900">
    {displayEvent.schedule && (
      <>
        {new Date(displayEvent.schedule.start_time_utc).toLocaleTimeString(...)} - 
        {new Date(displayEvent.schedule.end_time_utc).toLocaleTimeString(...)}
      </>
    )}
  </p>
</div>
```

### EVIDENCE:
- **File:** `social-catering-ui/src/components/EditEventModal.tsx`
- **Lines:** 312-343
- **User Expectation:** Users want to edit schedule times in the modal
- **Current Behavior:** Must navigate to full wizard to edit schedule

### PROPOSED FIX:
Add editable schedule fields to the modal:

```typescript
// Add state for schedule editing
const [schedule, setSchedule] = useState<{
  start_time_utc: string;
  end_time_utc: string;
  break_minutes: number;
} | null>(null);

// Initialize from event data
useEffect(() => {
  if (eventData?.schedule) {
    setSchedule({
      start_time_utc: eventData.schedule.start_time_utc,
      end_time_utc: eventData.schedule.end_time_utc,
      break_minutes: eventData.schedule.break_minutes || 0
    });
  }
}, [eventData]);

// Update handleSave to include schedule
schedule: schedule ? {
  start_time_utc: schedule.start_time_utc,
  end_time_utc: schedule.end_time_utc,
  break_minutes: schedule.break_minutes
} : undefined
```

---

## Issue 4: Backend Response Doesn't Include Updated Schedule

### ROOT CAUSE:
The backend `update` method (line 255-258) returns `serialize_event(@event.reload)` which **does include schedule** (line 468-472), but the response may not include `skill_requirements` if using the basic serializer.

**Code:**
```ruby
# Line 255-258
render json: {
  status: 'success',
  data: serialize_event(@event.reload)  # Basic serializer
}
```

### EVIDENCE:
- **File:** `app/controllers/api/v1/events_controller.rb`
- **Line:** 255-258
- **Issue:** Uses `serialize_event` instead of `serialize_event_detailed`
- **Impact:** Frontend may not get all fields needed for display

### PROPOSED FIX:
```ruby
render json: {
  status: 'success',
  data: serialize_event_detailed(@event.reload)  # Detailed serializer with skill_requirements
}
```

---

## Issue 5: Event List Not Refetching After Update

### ROOT CAUSE:
The `onSuccess` callback (line 713-716 in EventsPage.tsx) calls `loadEvents()` which should refetch, but there may be a timing issue or the events list doesn't update properly.

**Code:**
```typescript
// Line 713-716
onSuccess={() => {
  loadEvents(); // Reload events to show changes
  setEditModal({ isOpen: false, event: undefined });
}}
```

### EVIDENCE:
- **File:** `social-catering-ui/src/pages/EventsPage.tsx`
- **Line:** 713-716
- **Issue:** May not wait for refetch to complete before closing modal

### PROPOSED FIX:
```typescript
onSuccess={async () => {
  await loadEvents(); // Wait for refetch
  setEditModal({ isOpen: false, event: undefined });
}}
```

---

## Verification Checklist

### Step 1: Modal Data Prefilling ✅ VERIFIED
- **File:** `social-catering-ui/src/pages/EventsPage.tsx`
- **Line:** 615 - Modal triggered with `onEdit={(event) => setEditModal({ isOpen: true, event })}`
- **Line:** 710 - Event passed as prop: `event={editModal.event as any}`
- **Issue:** `displayEvent` undefined causes blank fields

### Step 2: API Response Structure ✅ VERIFIED
- **Backend:** `app/controllers/api/v1/events_controller.rb`
- **Method:** `serialize_event_detailed` (line 549-566)
- **Includes:** ✅ `schedule` (start_time_utc, end_time_utc, break_minutes)
- **Includes:** ✅ `skill_requirements` (with pay_rate)
- **Status:** API response is correct

### Step 3: Update API Call ❌ ISSUE FOUND
- **File:** `social-catering-ui/src/components/EditEventModal.tsx`
- **Line:** 213-223
- **Issue:** Only sends `roles`, missing `schedule`
- **Status:** ❌ Needs fix

### Step 4: Backend Update Endpoint ✅ VERIFIED
- **File:** `app/controllers/api/v1/events_controller.rb`
- **Line:** 169-258
- **Accepts:** ✅ `schedule` params (line 247-253)
- **Updates:** ✅ EventSchedule model
- **Triggers:** ✅ Shift sync via EventSchedule callback (Phase 5)
- **Status:** Backend is correct

### Step 5: Worker Schedule Updates ✅ VERIFIED
- **Backend:** EventSchedule callback triggers `Events::SyncShiftTimes` (Phase 5)
- **Shifts:** Automatically sync when schedule updates
- **Status:** Backend cascade logic is correct

---

## PRIORITY

- [x] **P0 - Critical** - Missing `displayEvent` variable (blocks all modal functionality)
- [x] **P0 - Critical** - Schedule not sent to backend (updates don't apply)
- [ ] **P1 - High** - Modal doesn't allow schedule editing (UX issue)
- [ ] **P2 - Medium** - Backend response could be more detailed

## ESTIMATED FIX TIME
- **P0 Fixes:** 30 minutes
- **P1 Enhancement:** 1-2 hours (add schedule editing UI)
- **Total:** 2-3 hours

---

## RECOMMENDED FIXES

### Fix 1: Define `displayEvent` Variable (P0 - Critical)
**File:** `social-catering-ui/src/components/EditEventModal.tsx`
**Line:** After line 107

```typescript
const eventData = fullEventData || event;
const displayEvent = fullEventData || event; // ✅ ADD THIS
```

### Fix 2: Include Schedule in PATCH Request (P0 - Critical)
**File:** `social-catering-ui/src/components/EditEventModal.tsx`
**Line:** 213-223

```typescript
const response = await apiClient.patch(`/events/${eventToUpdate.id}`, {
  event: {
    roles: roles.map(role => ({
      skill_name: role.skill_name,
      needed: role.needed_workers,
      pay_rate: role.pay_rate,
      description: role.description,
      uniform_id: role.uniform_id,
      cert_id: role.cert_id
    })),
    schedule: eventToUpdate.schedule ? {
      start_time_utc: eventToUpdate.schedule.start_time_utc,
      end_time_utc: eventToUpdate.schedule.end_time_utc,
      break_minutes: eventToUpdate.schedule.break_minutes || 0
    } : undefined
  }
});
```

### Fix 3: Use Detailed Serializer in Backend Response (P2 - Medium)
**File:** `app/controllers/api/v1/events_controller.rb`
**Line:** 255-258

```ruby
render json: {
  status: 'success',
  data: serialize_event_detailed(@event.reload)  # Instead of serialize_event
}
```

---

## TESTING PLAN

After fixes are applied, test:

1. **Modal Prefilling:**
   - Open edit modal on Active Events tab
   - Verify all fields are prefilled (title, venue, date, time, roles)
   - ✅ Should pass after Fix 1

2. **Role Updates:**
   - Change role pay rate
   - Click "Save Changes"
   - Verify event updates in Active Events list
   - Verify shifts' pay rates update (via cascade)
   - ✅ Should pass after Fix 2

3. **Schedule Updates:**
   - [If schedule editing added] Change start/end time
   - Click "Save Changes"
   - Verify event schedule updates
   - Verify all shifts sync to new times
   - Verify workers' schedules update
   - ✅ Should pass after Fix 2 + schedule editing UI

4. **Event List Refresh:**
   - After update, verify events list shows new data
   - Verify no stale data displayed
   - ✅ Should pass with current onSuccess callback

---

## NEXT STEPS

1. **Immediate:** Apply Fix 1 and Fix 2 (P0 fixes)
2. **Short-term:** Add schedule editing UI to modal (P1)
3. **Optional:** Enhance backend response (P2)

---

**Status:** ✅ **DIAGNOSIS COMPLETE - READY FOR FIXES**

