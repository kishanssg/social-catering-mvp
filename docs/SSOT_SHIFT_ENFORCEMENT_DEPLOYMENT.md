# SSOT Shift Enforcement - Deployment Checklist

## Problem Summary

**Symptom**: UI shows "Bartender 1/3 hired" with "2 needed" badge, but only 1 shift row renders in the expanded card.

**Root Cause**: `EventSkillRequirement.needed_workers` (SSOT) was out of sync with actual `Shift` records in the database.

**Impact**: 
- 32 published events affected
- 168 missing shift records
- Users couldn't assign workers to non-existent shifts

---

## Solution Architecture

### Three-Layer Enforcement

1. **Rake Task** (`lib/tasks/backfill_shifts.rake`)
   - One-time backfill for existing data
   - Creates missing `Shift` records to match `needed_workers`
   - Safe: dry-run mode, per-event transactions, production confirmation

2. **Controller Safety Guards** (`app/controllers/api/v1/events_controller.rb`)
   - Auto-detects: `existing_shifts < needed_workers`
   - Auto-repairs: calls `ensure_shifts_for_requirements!`
   - Runs on: `show`, `update`, `publish` actions
   - Only for published/active events

3. **Monitoring/Assertions** (`group_shifts_by_role` method)
   - Logs `[SSOT Violation]` if `shifts.length < total_shifts`
   - Raises error in dev/staging to catch regressions early
   - Silent in production (already logged for monitoring)

---

## STAGING DEPLOYMENT ✅

### Step 1: Deploy Code Changes

```bash
# Already completed
git push origin dev
git push staging dev:main --force
# Deployed as v508-509
```

### Step 2: Run Backfill (Dry Run First)

```bash
heroku run 'rake shifts:backfill_missing DRY_RUN=true' -a sc-mvp-staging
```

**Expected Output**:
- Lists all events with missing shifts
- Shows: `Event X - Title: Role "Y": needed=N, existing=M, missing=K`
- Summary: `Shifts created: 168 (simulated)`

### Step 3: Run Actual Backfill

```bash
heroku run 'rake shifts:backfill_missing' -a sc-mvp-staging
```

**Result**: ✅ **Created 168 shifts across 32 events**

### Step 4: Verify in UI

**Test Event: Downtown Concert After-Party (Event 221)**

Before backfill:
- Header: "Bartender 1/3 hired"
- Rows shown: 1 (only the assigned one)

After backfill:
- Header: "Bartender 1/3 hired" (same)
- Rows shown: **3** (1 assigned to Jordan Moore, 2 open with "Assign Worker" buttons)

**Steps to verify**:
1. Hard refresh (Cmd+Shift+R)
2. Go to Active Events
3. Find "Downtown Concert After-Party"
4. Expand the event card
5. Check Bartender role: should show **3 shift rows**
6. Check Banquet Server/Runner: should show **2 shift rows**

### Step 5: Check Logs for SSOT Violations

```bash
heroku logs --tail -a sc-mvp-staging | grep "SSOT"
```

**Expected**: No `[SSOT Violation]` errors after backfill

### Step 6: Test Editing an Event

1. Edit an event and change `needed_workers` for a role
2. Save changes
3. Verify shifts adjust correctly:
   - Increase: new shifts created
   - Decrease: only unassigned shifts removed
4. No SSOT violations logged

---

## PRODUCTION DEPLOYMENT 🚀

### Pre-Deployment Checklist

- [ ] Staging verification passed (all 6 steps above)
- [ ] No SSOT violations in staging logs for 24+ hours
- [ ] Client approved the fix on staging
- [ ] Database backup confirmed

### Step 1: Backup Database

```bash
heroku pg:backups:capture -a sc-mvp-production
heroku pg:backups:info -a sc-mvp-production
```

### Step 2: Deploy Code to Production

```bash
git checkout main
git merge dev -m "merge: SSOT shift enforcement from staging"
git push origin main
git push production main
```

### Step 3: Run Backfill (Dry Run First)

```bash
heroku run 'rake shifts:backfill_missing DRY_RUN=true' -a sc-mvp-production
```

**Review output with client**:
- How many shifts will be created?
- Which events will be affected?
- Any unexpected numbers?

### Step 4: Run Actual Backfill (Requires CONFIRM=true)

```bash
heroku run 'CONFIRM=true rake shifts:backfill_missing' -a sc-mvp-production
```

### Step 5: Verify in Production UI

Same verification steps as staging:
1. Hard refresh
2. Check affected events
3. Verify all roles show correct number of shift rows
4. Test assigning workers to newly created shifts

### Step 6: Monitor Logs (24 Hours)

```bash
# Watch for SSOT violations
heroku logs --tail -a sc-mvp-production | grep "SSOT"

# Watch for errors
heroku logs --tail -a sc-mvp-production | grep "ERROR"
```

**Expected**: Zero `[SSOT Violation]` errors

---

## MONITORING

### Log Patterns to Watch

**Success patterns** (normal):
```
[SSOT Repair] Event 123 has fewer shifts than needed_workers. Repairing...
```
This is the safety guard working correctly.

**Failure patterns** (regression):
```
[SSOT Violation] Event 123, Role 'Bartender': total_shifts=3 but actual shifts=1
```
This means the safety guard didn't fire or failed.

### Weekly Audit

Run this in Rails console to check for violations:

```ruby
Event.where(status: ['published', 'active']).find_each do |event|
  event.event_skill_requirements.each do |req|
    actual = event.shifts.where(event_skill_requirement_id: req.id).count
    needed = req.needed_workers
    
    if actual != needed
      puts "❌ Event #{event.id} (#{event.title}): Role #{req.skill_name}"
      puts "   Needed: #{needed}, Actual: #{actual}"
    end
  end
end
```

**Expected output**: Nothing (all events should be in sync)

### Manual Recovery (if needed)

If you ever see SSOT violations in logs:

```bash
# For a specific event
heroku run 'rails runner "Event.find(EVENT_ID).ensure_shifts_for_requirements!"' -a APP_NAME

# For all published events
heroku run 'rake shifts:backfill_missing' -a APP_NAME
```

---

## SUCCESS CRITERIA ✅

**Before** considering this fixed:

- [x] Backfill rake task created and tested
- [x] Controller safety guards added to show/update/publish
- [x] Monitoring/assertions added to detect violations
- [x] Backfill ran successfully on staging (168 shifts created)
- [ ] **UI verification**: Bartender shows 3 rows, Banquet Server shows 2 rows
- [ ] No SSOT violations in staging logs
- [ ] Client approved on staging
- [ ] Deployed to production
- [ ] Production backfill completed
- [ ] No SSOT violations in production logs

---

## Related Fixes

- **Orphaned Shifts Cleanup** (Nov 18, 2024)
  - Fixed: shifts with `event_skill_requirement_id = NULL`
  - Deleted: 205 orphaned shifts across 27 events
  - See: `ORPHANED_SHIFTS_FIX_SUMMARY.md`

- **ApplyRoleDiff Refactor** (Nov 18, 2024)
  - Fixed: duplicate shift generation on edit
  - Enforced: `effective_needed = max(new_needed, assigned_count)`
  - Prevented: reducing shifts below assigned workers

- **Frontend SSOT Compliance** (Nov 18, 2024)
  - Fixed: `EditEventModal` deriving `needed_workers` from `shifts.length`
  - Changed: use `event.skill_requirements.needed_workers` as SSOT

---

## Technical Details

### What `ensure_shifts_for_requirements!` Does

```ruby
def ensure_shifts_for_requirements!
  return unless status == 'published'
  return unless can_be_published?

  event_skill_requirements.find_each do |skill_req|
    existing = shifts.where(event_skill_requirement_id: skill_req.id).count
    missing = skill_req.needed_workers.to_i - existing
    
    next unless missing.positive?

    missing.times do
      create_shift_for_requirement(skill_req)
    end
  end
end
```

**Key points**:
- Only runs for published events
- Counts shifts per `event_skill_requirement_id` (not by role name)
- Creates exactly `missing` shifts with correct FK, times, pay rate
- Idempotent: safe to run multiple times

### Where Safety Guards Fire

1. **GET /api/v1/events/:id** (show action)
   - Before serializing detailed event
   - Checks all requirements
   - Repairs if any `existing < needed_workers`

2. **PATCH /api/v1/events/:id** (update action)
   - After standard update path (non-ApplyRoleDiff)
   - Before returning response
   - Repairs if needed

3. **POST /api/v1/events/:id/publish** (publish action)
   - After setting status to published
   - After initial `ensure_shifts_for_requirements!`
   - Double-checks and repairs if still short

### Monitoring Logic

In `group_shifts_by_role`:

```ruby
grouped.each do |role, data|
  actual_shift_count = data[:shifts].length
  expected_count = data[:total_shifts]
  
  if actual_shift_count < expected_count
    Rails.logger.error("[SSOT Violation] Event #{event.id}, Role '#{role}': ...")
    
    # Raise in dev/staging to catch regressions
    if Rails.env.development? || Rails.env.staging?
      raise StandardError, "SSOT violation detected..."
    end
  end
end
```

This catches any case where the safety guard didn't fire or failed.

---

## Next Steps

1. **Verify UI on staging** (you should do this now)
2. **Monitor logs for 24 hours**
3. **Deploy to production** (follow production deployment steps above)
4. **Set up weekly audit** (add to cron or monitoring)

---

## Questions?

If you see:
- SSOT violations in logs → run backfill task
- Missing shifts after edit → check `ApplyRoleDiff` logic
- Duplicate shifts → check orphan cleanup is still working

All three systems (backfill, safety guard, monitoring) should prevent this from recurring.

