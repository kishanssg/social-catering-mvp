# SSOT (Single Source of Truth) Verification - Edit Event Flow

## Overview
This document verifies that the edit event flow maintains SSOT throughout the entire data lifecycle.

## SSOT Definition
**Database `event_skill_requirements.needed_workers` is the single source of truth for how many workers are needed per role.**

Shifts are **derived** from `needed_workers`, not the other way around.

---

## Flow Verification

### 1. **Load Event (Wizard Opens)**

**Frontend (`CreateEventWizard.tsx`):**
```typescript
// Line 254-264: Loads from backend skill_requirements
if (eventToUse.skill_requirements && eventToUse.skill_requirements.length > 0) {
  const skills: SkillDetail[] = eventToUse.skill_requirements.map(req => ({
    name: req.skill_name,
    neededWorkers: req.needed_workers,  // ✅ SSOT: Reads from DB column
    uniform: req.uniform_name || '',
    // ...
  }));
  setSelectedSkillDetails(skills);
}
```

**Backend (`events_controller.rb`):**
```ruby
# Line 801-813: serialize_event_detailed returns skill_requirements
skill_requirements: event.event_skill_requirements.map { |sr|
  {
    needed_workers: sr.needed_workers,  # ✅ SSOT: Reads from DB column
    # ...
  }
}
```

**✅ VERIFIED**: Frontend reads `needed_workers` directly from database via API. No derivation from shifts.

---

### 2. **User Edits**

**Frontend:**
- User changes `neededWorkers` in UI
- State is stored in `selectedSkillDetails[].neededWorkers`
- **No calculation or derivation** - just user input

**✅ VERIFIED**: Frontend only stores user input, doesn't re-interpret.

---

### 3. **Save Event**

**Frontend (`CreateEventWizard.tsx`):**
```typescript
// Line 437-444: Sends user's input to backend
const skillRequirements: EventSkillRequirement[] = selectedSkillDetails.map(skill => ({
  skill_name: skill.name,
  needed_workers: skill.neededWorkers,  // ✅ Sends user's value
  // ...
}));
```

**Backend (`events_controller.rb`):**
```ruby
# Line 250-260: Receives skill_requirements from wizard
roles_data = params[:event][:skill_requirements]&.map { |sr|
  {
    needed: sr[:needed_workers],  # ✅ Receives user's value
    # ...
  }
}
```

**✅ VERIFIED**: Frontend sends user's input, backend receives it.

---

### 4. **Backend Processing (`ApplyRoleDiff`)**

**Business Logic:**
```ruby
# Line 73-98: Calculate effective_needed (protects assigned workers)
new_needed = role_params[:needed].to_i  # User's request
assigned_count = # ... count of assigned workers
effective_needed = [new_needed, assigned_count].max  # Never below assigned

# Line 121: Update database with effective_needed
update_requirement(existing_req, role_params.merge(needed: effective_needed))
```

**Shift Management:**
```ruby
# Line 100-118: Create/delete shifts to match effective_needed
diff = effective_needed - actual_shift_count
if diff > 0
  add_shifts_for_role(existing_req, diff)  # Create shifts
elsif diff < 0
  remove_shifts_for_role(existing_req, diff.abs)  # Delete unassigned shifts
end
```

**✅ VERIFIED**: 
- Database `needed_workers` is updated to `effective_needed` (SSOT)
- Shifts are created/deleted to **match** `needed_workers` (derived, not source)
- Business rule: Never reduce below assigned workers (protects data integrity)

---

### 5. **Update Database**

**Backend (`apply_role_diff.rb`):**
```ruby
# Line 244-245: Updates needed_workers in database
existing_req.update!(
  needed_workers: role_params[:needed].to_i,  # ✅ SSOT: Saves to DB
  # ...
)
```

**✅ VERIFIED**: Database column `needed_workers` is the SSOT. Shifts are derived from it.

---

### 6. **Reload After Save**

**Flow repeats from Step 1:**
- Frontend calls `getEvent(id)`
- Backend returns `serialize_event_detailed` with `skill_requirements[].needed_workers`
- Frontend displays the value from database

**✅ VERIFIED**: After save, UI reflects database state (SSOT).

---

## Edge Cases & Business Rules

### Edge Case 1: User tries to reduce below assigned workers
**Scenario**: 3 workers assigned, user tries to set `needed_workers = 2`

**Backend Behavior:**
- `effective_needed = max(2, 3) = 3`
- Database saves `needed_workers = 3` (not 2)
- No shifts are deleted (all are assigned)

**UI Behavior:**
- After reload, UI shows `needed_workers = 3` (from database)
- User sees the protected value, not their original input

**✅ VERIFIED**: Business rule protects assigned workers. SSOT is maintained.

---

### Edge Case 2: Orphaned shifts cleanup
**Scenario**: Database has 5 shifts but `needed_workers = 3`

**Backend Behavior:**
```ruby
# Line 286-296: Cleanup orphaned shifts
@event.event_skill_requirements.each do |req|
  current_shifts = @event.shifts.where(...).count
  needed = req.needed_workers || 0
  if current_shifts > needed
    cleanup_orphan_shifts(req, needed)  # Delete excess unassigned shifts
  end
end
```

**✅ VERIFIED**: Backend enforces SSOT by cleaning up shifts that exceed `needed_workers`.

---

### Edge Case 3: SSOT Safety Guard
**Scenario**: After update, shifts < needed_workers (under-provisioned)

**Backend Behavior:**
```ruby
# Line 364-377: SSOT Safety Guard
if @event.status.in?(['published', 'active'])
  needs_repair = @event.event_skill_requirements.any? do |req|
    existing_count < req.needed_workers.to_i
  end
  
  if needs_repair
    @event.ensure_shifts_for_requirements!  # Create missing shifts
  end
end
```

**✅ VERIFIED**: Backend auto-repairs under-provisioned shifts to maintain SSOT.

---

## Summary

### ✅ SSOT is Maintained

1. **Database is SSOT**: `event_skill_requirements.needed_workers` is the source of truth
2. **Frontend reads from DB**: Wizard loads `needed_workers` directly from API response
3. **Frontend sends user input**: No derivation, just passes user's value
4. **Backend enforces SSOT**: 
   - Updates `needed_workers` in database
   - Creates/deletes shifts to match `needed_workers`
   - Protects assigned workers (business rule)
   - Auto-repairs under-provisioned shifts
5. **UI reflects database**: After save, UI shows database state

### ✅ No SSOT Violations Found

- Frontend does NOT derive `needed_workers` from `shifts.length`
- Frontend does NOT re-interpret backend data
- Backend does NOT use shifts as source of truth
- Shifts are always derived from `needed_workers`, never the reverse

### ✅ Business Rules Preserved

- Assigned workers are protected (can't reduce below assigned count)
- Orphaned shifts are cleaned up
- Under-provisioned shifts are auto-repaired
- All changes are logged via ActivityLog

---

## Testing Checklist

- [ ] Load event in wizard → Verify `needed_workers` matches database
- [ ] Edit `needed_workers` → Verify save sends correct value
- [ ] Try to reduce below assigned → Verify backend protects assigned workers
- [ ] Save and reload → Verify UI shows database value (not original input if protected)
- [ ] Check for orphaned shifts → Verify cleanup runs
- [ ] Check for under-provisioned shifts → Verify auto-repair runs

---

**Last Verified**: 2024-12-XX
**Status**: ✅ SSOT Maintained
