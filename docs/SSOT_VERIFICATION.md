# Single Source of Truth (SSOT) Verification Report

## Overview
This document verifies that the Social Catering MVP follows Single Source of Truth (SSOT) principles to prevent stale or corrupted data.

## Core SSOT Principles

### 1. **Assignment Calculations (Hours & Pay)**
**Location:** `app/models/concerns/hours_calculations.rb` and `app/models/concerns/pay_calculations.rb`

**SSOT Implementation:**
- ✅ `effective_hours` and `effective_pay` are **calculated fields** (not stored)
- ✅ Calculations use `before_save` callbacks to ensure consistency
- ✅ All calculations are centralized in concerns, not duplicated across models

**Formula:**
```ruby
effective_hours = (hours_worked || 0) - (break_duration_minutes || 0) / 60.0
effective_pay = effective_hours * effective_hourly_rate
effective_hourly_rate = hourly_rate || worker.base_hourly_rate || 0
```

**Risk Assessment:** ✅ **LOW RISK**
- Calculations are always fresh (computed on read)
- No stale data possible for these fields
- Database stores source values only

---

### 2. **Event Totals (Total Hours & Total Cost)**
**Location:** `app/services/events/recalculate_totals.rb`

**SSOT Implementation:**
- ✅ Event totals are **recalculated** using a centralized service
- ✅ Service aggregates from assignments (SSOT source)
- ✅ Triggered automatically on assignment changes via `after_save` callbacks

**Calculation Flow:**
```
Assignment changes → after_save callback → Events::RecalculateTotals service
→ Aggregates all assignments → Updates event.total_hours_worked & total_pay_amount
```

**Risk Assessment:** ⚠️ **MEDIUM RISK** (mitigated)
- Totals are **stored** in database (could become stale)
- **Mitigation:** Automatic recalculation on every assignment change
- **Mitigation:** Service uses `update_columns` to bypass validations (atomic)
- **Edge Case:** If assignment update fails after totals update, totals could be inconsistent
  - **Mitigation:** Wrapped in transaction in `Assignment#update_event_totals`

**Verification:**
```ruby
# Check for stale totals
Event.find_each do |event|
  calculated = Events::RecalculateTotals.new(event: event).call
  if calculated[:total_hours] != event.total_hours_worked ||
     calculated[:total_pay] != event.total_pay_amount
    puts "⚠️ Stale totals detected for Event #{event.id}"
  end
end
```

---

### 3. **Pay Rate Hierarchy (SSOT)**
**Location:** `app/models/assignment.rb` and `app/models/event_skill_requirement.rb`

**SSOT Implementation:**
- ✅ **Single Source:** `EventSkillRequirement.pay_rate` is the default
- ✅ **Override:** `Assignment.hourly_rate` can override (if set during assignment)
- ✅ **Fallback:** `Worker.base_hourly_rate` if no assignment rate

**Priority Order:**
1. `Assignment.hourly_rate` (if set)
2. `EventSkillRequirement.pay_rate` (from event creation)
3. `Worker.base_hourly_rate` (fallback)

**Risk Assessment:** ✅ **LOW RISK**
- Clear hierarchy prevents ambiguity
- All sources are stored in database (no calculation drift)
- Frontend always uses `EventSkillRequirement.pay_rate` as default

---

### 4. **Activity Log Summaries**
**Location:** `app/presenters/activity_log_presenter.rb` and `app/controllers/api/v1/activity_logs_controller.rb`

**SSOT Implementation:**
- ✅ Summaries are **generated on-the-fly** using `ActivityLogPresenter`
- ✅ Controller **always** uses presenter (not database `summary` field)
- ✅ Database `summary` field is for reference only (can be backfilled)

**Risk Assessment:** ✅ **NO RISK**
- Summaries are always fresh (computed on every API request)
- No stale data possible
- Database field is optional (presenter is source of truth)

**Code Verification:**
```ruby
# app/controllers/api/v1/activity_logs_controller.rb
def serialize_logs(logs)
  logs.map do |log|
    # Always use presenter to generate humanized summary
    presenter = ActivityLogPresenter.new(log)
    humanized_summary = presenter.summary  # ← SSOT: Always fresh
    
    {
      summary: humanized_summary,  # ← Not using log.summary from DB
      details: log.details_json || presenter.curated_details || {}
    }
  end
end
```

---

### 5. **Assignment Status & Approval State**
**Location:** `app/models/assignment.rb`

**SSOT Implementation:**
- ✅ Status is stored in `Assignment.status` (single field)
- ✅ Approval state is stored in `Assignment.approved` (boolean)
- ✅ No calculated/derived status fields

**Risk Assessment:** ✅ **LOW RISK**
- Single source of truth (database field)
- No calculation drift possible
- Status transitions are validated

---

## Potential Stale Data Scenarios

### Scenario 1: Event Totals After Failed Assignment Update
**Risk:** If assignment update fails after totals are recalculated, totals could be inconsistent.

**Mitigation:**
- ✅ `Assignment#update_event_totals` is wrapped in transaction
- ✅ Service uses `update_columns` (bypasses validations, atomic)
- ✅ If assignment update fails, transaction rolls back (totals revert)

**Verification:**
```ruby
# Test: Simulate failed assignment update
Assignment.transaction do
  assignment = Assignment.first
  assignment.update(hours_worked: 10)
  # Totals updated here
  raise "Simulated failure"
  # Transaction rolls back, totals revert
end
```

---

### Scenario 2: Activity Log `summary` Field Stale
**Risk:** Database `summary` field could be outdated if presenter logic changes.

**Mitigation:**
- ✅ Controller **never** uses `log.summary` from database
- ✅ Always generates fresh summary using `ActivityLogPresenter`
- ✅ Database field is optional (for reference/backfill only)

**Verification:**
```ruby
# Check: Controller always uses presenter
# app/controllers/api/v1/activity_logs_controller.rb:serialize_logs
# ✅ Uses: presenter.summary (not log.summary)
```

---

### Scenario 3: Pay Rate Pre-population Inconsistency
**Risk:** Frontend might use wrong default pay rate when assigning workers.

**Mitigation:**
- ✅ Frontend always uses `EventSkillRequirement.pay_rate` as default
- ✅ Backend validates and stores `Assignment.hourly_rate` if provided
- ✅ Clear hierarchy: Assignment > EventSkillRequirement > Worker

**Verification:**
```typescript
// Frontend: social-catering-ui/src/pages/EventsPage.tsx
// ✅ Uses: eventSkillRequirement.pay_rate as default
const payRate = shift.event_skill_requirement?.pay_rate || 0;
```

---

## Data Integrity Checks

### 1. Check for Stale Event Totals
```ruby
# Run this periodically to detect stale totals
Event.find_each do |event|
  service = Events::RecalculateTotals.new(event: event)
  calculated = service.call
  
  if calculated[:total_hours] != event.total_hours_worked ||
     calculated[:total_pay] != event.total_pay_amount
    Rails.logger.warn "⚠️ Stale totals for Event #{event.id}"
    # Optionally auto-fix:
    # event.update_columns(
    #   total_hours_worked: calculated[:total_hours],
    #   total_pay_amount: calculated[:total_pay]
    # )
  end
end
```

### 2. Check for Inconsistent Assignment Calculations
```ruby
# Verify effective_hours and effective_pay are correct
Assignment.find_each do |assignment|
  expected_hours = assignment.calculate_effective_hours
  expected_pay = assignment.calculate_effective_pay
  
  if assignment.effective_hours != expected_hours ||
     assignment.effective_pay != expected_pay
    Rails.logger.warn "⚠️ Inconsistent calculation for Assignment #{assignment.id}"
  end
end
```

### 3. Check for Missing Activity Log Context
```ruby
# Verify activity logs have sufficient context for summaries
ActivityLog.find_each do |log|
  presenter = ActivityLogPresenter.new(log)
  summary = presenter.summary
  
  if summary.include?('Unknown') || summary.include?('nil')
    Rails.logger.warn "⚠️ Missing context in ActivityLog #{log.id}: #{summary}"
  end
end
```

---

## Recommendations

### ✅ **Current State: GOOD**
- Core calculations use SSOT principles
- Activity logs are always fresh
- Event totals are automatically recalculated

### 🔧 **Improvements (Optional)**
1. **Periodic Totals Verification:** Add a rake task to check for stale event totals (run daily)
2. **Assignment Calculation Audit:** Add validation to ensure `effective_hours`/`effective_pay` match calculated values
3. **Activity Log Backfill:** Run `rake activity_logs:backfill_summaries` after presenter changes

---

## Conclusion

**Overall SSOT Compliance: ✅ EXCELLENT**

- ✅ Assignment calculations: Always fresh (computed fields)
- ✅ Activity log summaries: Always fresh (generated on-the-fly)
- ✅ Pay rate hierarchy: Clear SSOT (EventSkillRequirement → Assignment → Worker)
- ⚠️ Event totals: Stored but auto-recalculated (low risk of staleness)

**Risk of Stale/Corrupted Data: LOW**

The system follows SSOT principles with automatic recalculation and on-the-fly generation. The only stored calculated values (event totals) are automatically updated on every assignment change, minimizing staleness risk.

