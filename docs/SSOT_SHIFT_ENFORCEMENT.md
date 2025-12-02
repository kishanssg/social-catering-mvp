# SSOT Enforcement: EventSkillRequirement.needed_workers → Shift Records

## Problem Description

### What Was Broken

**Symptom**: UI displayed "Bartender 1/3 hired" with a "2 needed" badge, but only rendered **1 shift row** in the expanded event card.

**Expected**: Should show **3 shift rows** (1 assigned to Jordan Moore, 2 open with "Assign Worker" buttons).

**Data State**:
- `EventSkillRequirement.needed_workers = 3` ✅ (correct)
- `Shift.where(event_id: X, event_skill_requirement_id: Y).count = 1` ❌ (wrong)
- Missing: 2 `Shift` records that should exist but don't

### Root Cause

**SSOT Violation**: `EventSkillRequirement.needed_workers` is the Single Source of Truth for how many shift slots should exist, but the actual `Shift` records in the database were out of sync.

**How It Happened**:

1. **Earlier orphan cleanup** (Nov 18, 2024):
   - We deleted 205 orphaned shifts with `event_skill_requirement_id = NULL`
   - We deleted extra shifts that exceeded `needed_workers`
   - But we **never backfilled** missing shifts where `existing < needed_workers`

2. **Publish bugs** (historical):
   - Some events may have been published with incomplete shift generation
   - `ensure_shifts_for_requirements!` may have failed silently or been skipped

3. **Manual edits**:
   - Admins editing `needed_workers` via `ApplyRoleDiff` or direct updates
   - If the update path didn't call `ensure_shifts_for_requirements!`, shifts could be left short

4. **No read-time repair**:
   - When loading event details, we **trusted the DB** and just serialized whatever `Shift` records existed
   - No safety net to detect and repair under-provisioned events

### Why This Matters

- **Users can't assign workers** to shifts that don't exist in the DB
- **Confusing UI**: "2 needed" badge implies 2 open slots, but they're not clickable
- **SSOT principle violated**: The "truth" (`needed_workers`) doesn't match reality (`Shift` records)
- **Asymmetric enforcement**: We fixed "too many shifts" (orphans) but not "too few shifts"

---

## Solution Architecture

### SSOT Principle

> `EventSkillRequirement.needed_workers` is the **Single Source of Truth** for how many shift slots should exist.
> 
> For every published event and every skill requirement:
> ```
> Shift.where(event_id: E, event_skill_requirement_id: R).count == R.needed_workers
> ```

### Three Layers of Enforcement

#### Layer 1: Model Method (`Event#ensure_shifts_for_requirements!`)

**Purpose**: Canonical repair method that creates missing shifts.

**Location**: `app/models/event.rb:251-273`

**Logic**:
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

**When it runs**:
- On publish (via `generate_shifts_if_published` callback)
- In controller update path (for non-ApplyRoleDiff edits)
- Manually via rake task or console
- **NEW**: Via controller safety guards on read

**What it creates**:
- `Shift` records with:
  - `event_id`, `event_skill_requirement_id` (proper FKs)
  - `role_needed`, `required_skill` (from requirement)
  - `start_time_utc`, `end_time_utc` (from event schedule)
  - `pay_rate` (from requirement)
  - `capacity: 1` (one worker per shift)
  - `status: 'published'`
  - `auto_generated: true`

**Idempotency**: Safe to call multiple times; only creates missing shifts.

---

#### Layer 2: Controller Safety Guards

**Purpose**: Auto-detect and repair under-provisioned events when loading details.

**Location**: `app/controllers/api/v1/events_controller.rb`

**Added to**:
1. `show` action (lines 135-154)
2. `update` action (lines 342-362)
3. `publish` action (lines 434-450)

**Logic**:
```ruby
if @event.status.in?(['published', 'active'])
  needs_repair = @event.event_skill_requirements.any? do |req|
    existing_count = @event.shifts.where(event_skill_requirement_id: req.id).count
    existing_count < req.needed_workers.to_i
  end
  
  if needs_repair
    Rails.logger.warn("[SSOT Repair] Event #{@event.id} has fewer shifts than needed_workers. Repairing...")
    @event.ensure_shifts_for_requirements!
    @event.reload # Get newly created shifts
  end
end
```

**When it fires**:
- Every time a published/active event is loaded for detail view
- After updates that might have changed `needed_workers`
- After publishing a draft event

**Performance impact**: Minimal
- Only runs for published/active events
- Only fires if violation detected
- Typical case: 0-5 shifts created per repair
- Runs in same transaction as the request

---

#### Layer 3: Monitoring & Assertions

**Purpose**: Detect violations that slip through and alert developers.

**Location**: `app/controllers/api/v1/events_controller.rb` (in `group_shifts_by_role` method, lines 949-967)

**Logic**:
```ruby
grouped.each do |role, data|
  actual_shift_count = data[:shifts].length
  expected_count = data[:total_shifts]
  
  if actual_shift_count < expected_count
    error_msg = "[SSOT Violation] Event #{event.id}, Role '#{role}': " \
                "total_shifts=#{expected_count} but actual shifts=#{actual_shift_count}. " \
                "This should have been repaired by the safety guard."
    Rails.logger.error(error_msg)
    
    # Raise in dev/staging to catch regressions early
    if Rails.env.development? || Rails.env.staging?
      raise StandardError, "SSOT violation detected for Event #{event.id}, Role '#{role}'"
    end
  end
end
```

**When it runs**: Every time `shifts_by_role` is serialized (detail views, expanded cards)

**Behavior**:
- **Development/Staging**: Raises exception → forces immediate fix
- **Production**: Logs error → alerts monitoring, doesn't crash user request

**Why this catches regressions**:
- If the safety guard fails or is bypassed
- If a new code path creates requirements without shifts
- If a bug in `ensure_shifts_for_requirements!` itself

---

## Usage

### Manual Backfill (One-Time or Recovery)

**Dry run** (see what would happen):
```bash
# Staging
heroku run 'rake shifts:backfill_missing DRY_RUN=true' -a sc-mvp-staging

# Production
heroku run 'CONFIRM=true rake shifts:backfill_missing DRY_RUN=true' -a sc-mvp-production
```

**Actual run**:
```bash
# Staging (no confirmation needed)
heroku run 'rake shifts:backfill_missing' -a sc-mvp-staging

# Production (requires CONFIRM=true)
heroku run 'CONFIRM=true rake shifts:backfill_missing' -a sc-mvp-production
```

**Output**:
```
=== Shifts Backfill: Missing Shift Records ===
Environment : production
Dry run    : NO (changes will be persisted)

Event 221 - Downtown Concert After-Party (status: published)
  Role "Bartender": needed=3, existing=1, missing=2
  Role "Banquet Server/Runner": needed=2, existing=1, missing=1
  >> Created 3 shift(s) via ensure_shifts_for_requirements!

=== Shifts Backfill Summary ===
Events processed : 32
Shifts created   : 168
Done.
```

---

### When the Controller Guard Fires

**Automatically**, every time you:
- View an event detail page (`GET /api/v1/events/:id`)
- Edit and save an event (`PATCH /api/v1/events/:id`)
- Publish a draft event (`POST /api/v1/events/:id/publish`)

**What happens**:
1. Controller checks if `existing_shifts < needed_workers` for any role
2. If yes: calls `ensure_shifts_for_requirements!`
3. Reloads event to get fresh shifts
4. Logs: `[SSOT Repair] Event X has fewer shifts than needed_workers. Repairing...`
5. Returns complete data to frontend

**User experience**: Transparent
- No error messages
- No extra latency (shift creation is fast)
- UI always shows correct number of rows

---

### How to Check for Violations

**In Rails console**:
```ruby
# Check a specific event
event = Event.find(221)
event.event_skill_requirements.each do |req|
  actual = event.shifts.where(event_skill_requirement_id: req.id).count
  needed = req.needed_workers
  puts "#{req.skill_name}: needed=#{needed}, actual=#{actual} #{actual == needed ? '✓' : '❌'}"
end

# Check all published events
violations = []
Event.where(status: ['published', 'active']).find_each do |event|
  event.event_skill_requirements.each do |req|
    actual = event.shifts.where(event_skill_requirement_id: req.id).count
    needed = req.needed_workers
    
    if actual != needed
      violations << {
        event_id: event.id,
        event_title: event.title,
        role: req.skill_name,
        needed: needed,
        actual: actual,
        missing: needed - actual
      }
    end
  end
end

if violations.any?
  puts "❌ Found #{violations.count} violations:"
  violations.each do |v|
    puts "  Event #{v[:event_id]} (#{v[:event_title]}): #{v[:role]} needs #{v[:needed]}, has #{v[:actual]} (missing #{v[:missing]})"
  end
else
  puts "✅ All events in sync!"
end
```

---

## Monitoring

### Metrics to Track

**After backfill** (expected values):
- SSOT violations detected: **0**
- Events repaired by safety guard: **0** (all should be fixed by backfill)
- Shifts created per week: **< 50** (only for new events or edits)

**Weekly audit** (run in console):
```ruby
# Count total violations
violation_count = 0
Event.where(status: ['published', 'active']).find_each do |event|
  event.event_skill_requirements.each do |req|
    actual = event.shifts.where(event_skill_requirement_id: req.id).count
    needed = req.needed_workers
    violation_count += 1 if actual != needed
  end
end

puts "SSOT Violations: #{violation_count}"
# Expected: 0
```

### Alert Setup (Recommended)

If using Sentry or log monitoring:

**Alert on**: `[SSOT Violation]` in production logs

**Severity**: High (indicates data integrity issue)

**Response**:
1. Check which event/role is affected
2. Run backfill task for that event
3. Investigate why safety guard didn't fire
4. Check for new code paths that bypass guards

---

## Related Documentation

- **Orphaned Shifts Fix**: `ORPHANED_SHIFTS_FIX_SUMMARY.md`
- **ApplyRoleDiff Service**: `app/services/events/apply_role_diff.rb`
- **Deployment Checklist**: `SSOT_SHIFT_ENFORCEMENT_DEPLOYMENT.md`
- **Event Model**: `app/models/event.rb`
- **Events Controller**: `app/controllers/api/v1/events_controller.rb`

---

## History of SSOT Work

### Phase 1: Orphaned Shifts (Nov 18, 2024)
- **Problem**: Shifts with `event_skill_requirement_id = NULL` or exceeding `needed_workers`
- **Fix**: Cleanup rake task + `ApplyRoleDiff` refactor
- **Result**: Deleted 205 orphaned shifts, enforced `actual ≤ needed`

### Phase 2: Frontend SSOT (Nov 18, 2024)
- **Problem**: `EditEventModal` deriving `needed_workers` from `shifts.length`
- **Fix**: Use `event.skill_requirements.needed_workers` as SSOT
- **Result**: Frontend no longer creates "second source of truth"

### Phase 3: Under-Provisioned Shifts (Nov 19, 2024) ← **THIS FIX**
- **Problem**: `Shift` records fewer than `needed_workers`
- **Fix**: Backfill task + controller safety guards + monitoring
- **Result**: Enforced `actual == needed` (bidirectional SSOT)

---

## Code Examples

### Creating a New Event with Roles

```ruby
# In controller or service
event = Event.create!(
  title: "Wedding Reception",
  status: 'draft',
  # ... other fields
)

# Add skill requirements
event.event_skill_requirements.create!(
  skill_name: 'Bartender',
  needed_workers: 3,
  pay_rate: 18.0
)

# Publish (this triggers shift generation)
event.update!(status: 'published')
# Callback fires: generate_shifts_if_published → ensure_shifts_for_requirements!

# Now:
event.shifts.where(role_needed: 'Bartender').count
# => 3 ✅
```

### Editing needed_workers

```ruby
# Via ApplyRoleDiff (recommended)
result = Events::ApplyRoleDiff.new(
  event: event,
  roles: [
    { skill_name: 'Bartender', needed: 5, pay_rate: 18.0 }
  ]
).call

# ApplyRoleDiff handles:
# - If needed increases: creates new shifts
# - If needed decreases: removes only unassigned shifts
# - Respects assigned workers: won't reduce below assigned count

# Result:
event.reload
event.shifts.where(role_needed: 'Bartender').count
# => 5 ✅
```

### Manual Repair (Console)

```ruby
# For a specific event
event = Event.find(221)
event.ensure_shifts_for_requirements!

# For all published events
Event.where(status: ['published', 'active']).find_each do |event|
  event.ensure_shifts_for_requirements!
end
```

---

## Testing

### Unit Test (Model)

```ruby
# spec/models/event_spec.rb
describe '#ensure_shifts_for_requirements!' do
  let(:event) { create(:event, status: 'published') }
  let(:requirement) { create(:event_skill_requirement, event: event, needed_workers: 3) }
  
  context 'when shifts are under-provisioned' do
    before do
      # Create only 1 shift instead of 3
      create(:shift, event: event, event_skill_requirement: requirement)
    end
    
    it 'creates missing shifts' do
      expect {
        event.ensure_shifts_for_requirements!
      }.to change { event.shifts.where(event_skill_requirement_id: requirement.id).count }.from(1).to(3)
    end
    
    it 'sets correct attributes on new shifts' do
      event.ensure_shifts_for_requirements!
      
      new_shifts = event.shifts.where(event_skill_requirement_id: requirement.id).order(id: :desc).limit(2)
      
      new_shifts.each do |shift|
        expect(shift.role_needed).to eq(requirement.skill_name)
        expect(shift.pay_rate).to eq(requirement.pay_rate)
        expect(shift.event_skill_requirement_id).to eq(requirement.id)
        expect(shift.auto_generated).to be true
      end
    end
  end
  
  context 'when shifts are already complete' do
    before do
      3.times { create(:shift, event: event, event_skill_requirement: requirement) }
    end
    
    it 'does not create extra shifts' do
      expect {
        event.ensure_shifts_for_requirements!
      }.not_to change { event.shifts.count }
    end
  end
end
```

### Integration Test (Controller)

```ruby
# spec/requests/api/v1/events_controller_spec.rb
describe 'SSOT enforcement for shifts' do
  let!(:event) { create(:event, status: 'published') }
  let!(:skill_requirement) do
    create(:event_skill_requirement, 
           event: event, 
           skill_name: 'Bartender',
           needed_workers: 3)
  end
  
  context 'when shifts are under-provisioned' do
    before do
      # Create only 1 shift instead of 3
      create(:shift, 
             event: event, 
             event_skill_requirement: skill_requirement,
             role_needed: 'Bartender')
    end
    
    it 'auto-repairs missing shifts on show action' do
      expect(event.shifts.count).to eq(1) # Before repair
      
      get "/api/v1/events/#{event.id}", headers: auth_headers
      
      expect(response).to have_http_status(:success)
      
      # After fetching, shifts should be backfilled
      event.reload
      expect(event.shifts.where(event_skill_requirement_id: skill_requirement.id).count).to eq(3)
      
      # Response should include all 3 shifts
      json = JSON.parse(response.body)
      bartender_role = json['data']['shifts_by_role'].find { |r| r['role_name'] == 'Bartender' }
      expect(bartender_role['shifts'].length).to eq(3)
      expect(bartender_role['total_shifts']).to eq(3)
    end
    
    it 'logs the repair action' do
      expect(Rails.logger).to receive(:warn).with(/SSOT Repair.*Event #{event.id}/)
      
      get "/api/v1/events/#{event.id}", headers: auth_headers
    end
  end
  
  context 'when monitoring detects violation after guard' do
    before do
      # Stub ensure_shifts to fail silently (simulate guard failure)
      allow_any_instance_of(Event).to receive(:ensure_shifts_for_requirements!).and_return(true)
      
      # Create only 1 shift
      create(:shift, event: event, event_skill_requirement: skill_requirement, role_needed: 'Bartender')
    end
    
    it 'logs SSOT violation error' do
      expect(Rails.logger).to receive(:error).with(/SSOT Violation.*Event #{event.id}/)
      
      # In staging, this would raise; in production, just logs
      if Rails.env.staging?
        expect {
          get "/api/v1/events/#{event.id}", headers: auth_headers
        }.to raise_error(StandardError, /SSOT violation detected/)
      else
        get "/api/v1/events/#{event.id}", headers: auth_headers
        expect(response).to have_http_status(:success)
      end
    end
  end
end
```

---

## Deployment History

### Staging (Nov 19, 2024)

- **v508**: Deployed controller safety guards + monitoring
- **v509**: Fixed rake task to allow staging runs without `CONFIRM`
- **Backfill**: Created 168 missing shifts across 32 events

**Key events repaired**:
- Event 221 (Downtown Concert After-Party): +3 shifts
- Event 255 (Halloween): +100 shifts (Captain role)
- Event 216 (Garden Wedding): +13 shifts (all roles missing)

### Production (Pending)

- [ ] Deploy code changes
- [ ] Backup database
- [ ] Run dry-run backfill
- [ ] Review with client
- [ ] Run actual backfill
- [ ] Monitor for 24 hours

---

## Troubleshooting

### "Still seeing only 1 shift row after backfill"

**Possible causes**:
1. **Browser cache**: Hard refresh (Cmd+Shift+R) with DevTools "Disable cache"
2. **Safety guard didn't fire**: Check logs for `[SSOT Repair]` message
3. **Backfill didn't run**: Verify in Rails console:
   ```ruby
   Event.find(221).shifts.where(role_needed: 'Bartender').count
   # Should be 3
   ```

### "SSOT Violation errors in logs after backfill"

**This means**:
- Backfill ran but didn't fix all events, OR
- A new code path is creating requirements without shifts

**Fix**:
1. Find the affected event ID from the log
2. Run: `Event.find(ID).ensure_shifts_for_requirements!`
3. Investigate why the backfill or safety guard missed it

### "Too many shifts created"

**This shouldn't happen** because:
- `ensure_shifts_for_requirements!` only creates `missing` shifts (never duplicates)
- `ApplyRoleDiff` removes extras when reducing `needed_workers`

**If it does**:
- Check for orphaned shifts: `Shift.where(event_skill_requirement_id: nil)`
- Run orphan cleanup: `rake events:fix_orphaned_shifts`

---

## Future Improvements

### Database Constraint (Deferred)

We considered adding a NOT NULL constraint on `shifts.event_skill_requirement_id`:

```ruby
change_column_null :shifts, :event_skill_requirement_id, false
```

**Why deferred**:
- Some shifts with assignments had NULL FK (couldn't delete without losing history)
- Safety guard + backfill solve the problem without schema change
- Can revisit after ensuring all shifts have proper FK

### Scheduled Audit

Add a weekly cron job or Heroku Scheduler task:

```bash
# Every Monday at 9 AM
rake shifts:audit_ssot_violations
```

Task would:
- Check all published events for violations
- Send alert if any found
- Auto-repair or notify admins

### Performance Optimization

If `ensure_shifts_for_requirements!` becomes a bottleneck:
- Batch insert shifts instead of `missing.times { create! }`
- Use `insert_all` for bulk creation
- Only reload if shifts were actually created

---

## Conclusion

This fix establishes **bidirectional SSOT enforcement**:

- **Too many shifts** → Orphan cleanup + `ApplyRoleDiff` removes extras
- **Too few shifts** → Backfill + safety guards create missing ones
- **Monitoring** → Catches any violations that slip through

The system now guarantees:
```
∀ published events E, ∀ skill requirements R:
  Shift.where(event_id: E.id, event_skill_requirement_id: R.id).count == R.needed_workers
```

This is the **Single Source of Truth** principle fully enforced at the data layer.

