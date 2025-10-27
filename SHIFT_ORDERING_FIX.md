# Shift Ordering Fix - Fill First Available Slot

## Problem
When assigning workers to shifts, the system was not assigning to the first available slot (position 1), but instead filling slot 2 or later slots first. This was confusing for users.

**Example:**
- Bartender role needs 2 workers
- Position 1: Unassigned
- Position 2: Assigned to "Skylar T."
- System assigns new worker to Position 2 instead of Position 1

**Why this happened:**
Shifts were returned in database insertion order (random), not in a consistent order. The frontend displays them in the order they're received from the backend.

## Solution
Order shifts by `id` (ascending) so the first created shift is always displayed as position 1.

```ruby
# OLD (unordered)
shifts.each do |shift|
  # ...
end

# NEW (ordered by ID)
sorted_shifts = shifts.order(:id)
sorted_shifts.each do |shift|
  # ...
end
```

## How Shift Creation Works

When an event is published, shifts are created in a loop:

```ruby
# app/models/event.rb:166
event_skill_requirements.find_each do |skill_req|
  skill_req.needed_workers.times do
    generated << shifts.create!(
      role_needed: skill_req.skill_name,
      # ... other attributes
    )
  end
end
```

If a role needs 2 workers:
1. First worker slot gets `id = 100` (created first)
2. Second worker slot gets `id = 101` (created second)

Without ordering, database could return them as:
- `[id: 101, id: 100]` ← Position 1 would be the second shift created!

With ordering:
- `[id: 100, id: 101]` ← Position 1 is always the first shift created

## Implementation

**File:** `app/controllers/api/v1/events_controller.rb`

**Line 509:** Added ordering
```ruby
# ORDER shifts by ID ASC to ensure consistent ordering - first created = first displayed
sorted_shifts = shifts.order(:id)
```

**Line 516:** Use sorted_shifts instead of shifts
```ruby
sorted_shifts.each do |shift|
```

## Result

✅ **Consistent ordering** - First created shift is always position 1
✅ **Predictable behavior** - Users see shifts in creation order
✅ **Fill from left** - Position 1 gets filled before position 2
✅ **Works for large shifts** - Even with 10+ positions, ordering is consistent

## Testing

**Before fix:**
```
Bartender:
  1. Position 2: Assigned to Skylar T.
  2. Position 1: Unassigned ← This is confusing!
```

**After fix:**
```
Bartender:
  1. Position 1: Unassigned ← Assigns here first
  2. Position 2: Assigned to Skylar T.
```

## Files Modified

1. `app/controllers/api/v1/events_controller.rb` (line 509)
   - Added `.order(:id)` to ensure consistent shift ordering
   - Changed `shifts.each` to `sorted_shifts.each`

## Impact

✅ **User experience** - Shifts fill from left to right (position 1 → position 2 → ...)
✅ **Consistency** - Order is always predictable
✅ **Scalability** - Works for any number of positions
✅ **No breaking changes** - Only affects display order, not functionality

---

The fix is complete! Shifts will now be displayed and filled in creation order (by ID), ensuring position 1 is always the first available slot. 🎉

