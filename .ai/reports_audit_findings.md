# Reports Audit Findings
**Date:** November 10, 2025  
**Scope:** All report generation code to verify it reflects recent changes

## Executive Summary

✅ **Good News:**
- Reports are using `effective_hours` and `effective_pay` (SSOT methods)
- Most reports correctly exclude `no_show` and `cancelled` assignments

⚠️ **Issues Found:**
- Reports are NOT using Event aggregate fields (`total_hours_worked`, `total_pay_amount`)
- Reports are NOT including approval information (`approved_by`, `approved_at`)
- Reports are NOT filtering inactive workers
- Reports are NOT using `Assignment.valid` scope (may include orphaned assignments)
- Event Summary report calculates totals manually instead of using denormalized fields

---

## Detailed Findings

### 1. ✅ Timesheet Report (`/api/v1/reports/timesheet`)

**File:** `app/controllers/api/v1/reports_controller.rb:8-39`

**Status:** ✅ **GOOD** - Using SSOT methods

**What's Working:**
- ✅ Uses `assignment.effective_hours` (line 159)
- ✅ Filters by status: `['assigned', 'confirmed', 'completed']` (line 15)
- ✅ Excludes `no_show` and `cancelled` correctly

**Missing:**
- ❌ No approval information (`approved_by`, `approved_at`)
- ❌ Not using `Assignment.valid` scope (may include orphaned assignments)
- ❌ Not filtering inactive workers

**Recommendation:**
```ruby
assignments = Assignment.valid  # Add this
  .includes(worker: [], shift: [event: :event_schedule])
  .for_date_range(start_date, end_date)
  .where(status: ['assigned', 'confirmed', 'completed'])
  .joins(:worker).where(workers: { active: true })  # Add this
```

---

### 2. ✅ Payroll Report (`/api/v1/reports/payroll`)

**File:** `app/controllers/api/v1/reports_controller.rb:43-72`

**Status:** ✅ **GOOD** - Using SSOT methods

**What's Working:**
- ✅ Uses `assignment.effective_hours` (line 215)
- ✅ Uses `assignment.effective_hourly_rate` (line 216)
- ✅ Uses `assignment.effective_pay` (line 217)
- ✅ Excludes `no_show` and `cancelled` via status filter

**Missing:**
- ❌ No approval information
- ❌ Not using `Assignment.valid` scope
- ❌ Not filtering inactive workers

**Recommendation:**
```ruby
assignments = Assignment.valid
  .for_date_range(start_date, end_date)
  .where(status: ['assigned', 'confirmed', 'completed'])
  .joins(:worker).where(workers: { active: true })
```

---

### 3. ✅ Worker Hours Report (`/api/v1/reports/worker_hours`)

**File:** `app/controllers/api/v1/reports_controller.rb:76-104`

**Status:** ⚠️ **PARTIAL** - Has explicit exclusion but not using valid scope

**What's Working:**
- ✅ Uses `assignment.effective_hours` (line 263)
- ✅ Uses `assignment.effective_pay` (line 265)
- ✅ Explicitly excludes `cancelled` and `no_show` (line 258)

**Missing:**
- ❌ Not using `Assignment.valid` scope (duplicate filtering)
- ❌ Not filtering inactive workers

**Recommendation:**
```ruby
assignments = Assignment.valid  # This already excludes cancelled/no_show
  .includes(:worker, shift: [:event])
  .for_date_range(start_date, end_date)
  .where(status: ['assigned', 'confirmed', 'completed'])
  .joins(:worker).where(workers: { active: true })
# Remove the .where.not(status: ['cancelled','no_show']) - redundant
```

---

### 4. ⚠️ Event Summary Report (`/api/v1/reports/event_summary`)

**File:** `app/controllers/api/v1/reports_controller.rb:108-123`

**Status:** ⚠️ **NEEDS FIX** - Not using Event aggregate fields

**What's Working:**
- ✅ Uses `assignment.effective_pay` (line 319)
- ✅ Excludes `no_show` and `cancelled` via status filter (line 317)

**Critical Issues:**
- ❌ **NOT using Event aggregate fields** (`total_hours_worked`, `total_pay_amount`)
- ❌ Manually calculating totals by iterating through all shifts and assignments
- ❌ This is inefficient and may be inconsistent with UI display

**Current Code (Inefficient):**
```ruby
event.shifts.each do |s|
  shifts_generated += 1
  needed += (s.capacity || 0)
  s.assignments.where(status: ['assigned','confirmed','completed']).each do |a|
    assigned += 1
    total_cost += a.effective_pay  # Manual calculation
  end
end
```

**Recommended Fix:**
```ruby
# Use denormalized aggregate fields from Event model
csv << [
  event.id,
  event.title,
  event.event_schedule&.start_time_utc&.strftime('%m/%d/%Y') || '',
  event.venue&.name || '',
  event.status,
  event.total_workers_needed,  # Already calculated
  event.assigned_workers_count || 0,  # Use method (counts unique workers)
  event.staffing_percentage || 0,
  event.shifts.count,
  event.total_pay_amount || 0.0,  # Use aggregate field (SSOT)
  event.supervisor_name || ''
]
```

---

### 5. ⚠️ Timesheets Controller (`/api/v1/reports/timesheets`)

**File:** `app/controllers/api/v1/reports/timesheets_controller.rb`

**Status:** ⚠️ **NEEDS FIX** - Not using SSOT methods consistently

**Issues:**
- ❌ Uses `assignment.hours_worked` directly (line 11, 105, 147)
- ❌ Uses `assignment.total_pay` directly (line 12, 149)
- ❌ Manual calculation of hours instead of `effective_hours` (lines 105-112)
- ❌ Should use `effective_hours` and `effective_pay` for consistency

**Current Code:**
```ruby
total_hours = if assignment.hours_worked
  assignment.hours_worked  # ❌ Not using effective_hours
else
  # Manual calculation
end
```

**Recommended Fix:**
```ruby
# Always use SSOT methods
total_hours = assignment.effective_hours
total_pay = assignment.effective_pay
```

---

## Missing Features Across All Reports

### 1. ❌ Approval Information Not Included

**Impact:** Reports don't show who approved hours and when

**Missing Fields:**
- `approved_by` (user email/name)
- `approved_at` (timestamp)
- `approval_notes`

**Recommendation:** Add optional columns to CSV exports:
```ruby
csv << [
  # ... existing columns ...
  assignment.approved_by&.email || '',
  assignment.approved_at_utc&.iso8601 || '',
  assignment.approval_notes || ''
]
```

---

### 2. ❌ Inactive Workers Not Filtered

**Impact:** Reports may include workers who have been deactivated

**Current Behavior:** No filtering on `workers.active`

**Recommendation:** Add to all report queries:
```ruby
.joins(:worker).where(workers: { active: true })
```

---

### 3. ❌ Not Using `Assignment.valid` Scope

**Impact:** Reports may include orphaned assignments (deleted events, archived shifts)

**Current Behavior:** No use of `Assignment.valid` scope

**Recommendation:** Use at the start of all queries:
```ruby
assignments = Assignment.valid  # Filters out orphaned assignments
  .includes(...)
  .where(...)
```

---

### 4. ❌ Event Summary Not Using Aggregate Fields

**Impact:** 
- Inconsistent with UI (which uses `total_pay_amount`)
- Inefficient (N+1 queries, manual calculations)
- May show different totals than what's displayed in the app

**Recommendation:** Use Event's denormalized fields:
- `event.total_hours_worked`
- `event.total_pay_amount`
- `event.assigned_shifts_count`

---

## Summary of Required Changes

### High Priority (Data Consistency)

1. **Event Summary Report:** Use `event.total_pay_amount` instead of manual calculation
2. **Timesheets Controller:** Use `effective_hours` and `effective_pay` instead of direct field access
3. **All Reports:** Add `Assignment.valid` scope to filter orphaned assignments
4. **All Reports:** Filter inactive workers with `.joins(:worker).where(workers: { active: true })`

### Medium Priority (Feature Completeness)

5. **All Reports:** Add approval information columns (optional, can be behind a flag)
6. **Worker Hours Report:** Remove redundant status filter (already handled by `valid` scope)

### Low Priority (Nice to Have)

7. **All Reports:** Add option to include/exclude no-show/cancelled assignments
8. **All Reports:** Add date range validation and error handling

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Timesheet report excludes inactive workers
- [ ] Timesheet report excludes orphaned assignments
- [ ] Payroll report totals match UI display
- [ ] Event Summary report uses `total_pay_amount` from Event
- [ ] Event Summary report totals match what's shown in Events page
- [ ] Worker Hours report excludes cancelled/no-show correctly
- [ ] All reports use `effective_hours` and `effective_pay` consistently
- [ ] Reports handle edge cases (null values, missing data)

---

### 6. ✅ Exports Controller (`/api/v1/exports/timesheet`)

**File:** `app/controllers/api/v1/exports_controller.rb`

**Status:** ✅ **GOOD** - Already using SSOT methods!

**What's Working:**
- ✅ Uses `assignment.effective_hours` (line 50)
- ✅ Uses `assignment.effective_hourly_rate` (line 51)
- ✅ Uses `assignment.effective_pay` (line 52)
- ✅ Uses SSOT methods in summary totals (lines 58-59)

**Missing:**
- ❌ Not using `Assignment.valid` scope
- ❌ Not filtering inactive workers
- ❌ Only includes `status: 'completed'` (may miss other valid statuses)

**Recommendation:**
```ruby
assignments = Assignment.valid
  .joins(:shift, :worker)
  .includes(shift: :location, worker: {})
  .where(shifts: { start_time_utc: start_date.beginning_of_day..end_date.end_of_day })
  .where.not(hours_worked: nil)
  .where(status: ['assigned', 'confirmed', 'completed'])  # Include all valid statuses
  .where(workers: { active: true })  # Filter inactive workers
  .order('shifts.start_time_utc ASC')
```

---

## Files to Update

1. `app/controllers/api/v1/reports_controller.rb`
   - Add `Assignment.valid` scope to all methods
   - Add inactive worker filter to all methods
   - Fix Event Summary to use aggregate fields
   - Add approval columns (optional)

2. `app/controllers/api/v1/reports/timesheets_controller.rb`
   - Replace `hours_worked` with `effective_hours` (line 11)
   - Replace `total_pay` with `effective_pay` (line 12)
   - Replace manual calculation with `effective_hours` (lines 105-112)
   - Add `Assignment.valid` scope
   - Add inactive worker filter

3. `app/controllers/api/v1/exports_controller.rb`
   - Add `Assignment.valid` scope
   - Add inactive worker filter
   - Include all valid statuses (not just 'completed')

---

## Estimated Impact

**Performance:**
- Event Summary will be faster (uses denormalized fields)
- All reports will be more efficient (valid scope reduces query size)

**Data Accuracy:**
- Reports will match UI display exactly
- No orphaned assignments in reports
- No inactive workers in reports

**Feature Completeness:**
- Approval tracking available in reports (if implemented)

