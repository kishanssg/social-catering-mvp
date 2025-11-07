# SSOT Refactoring Summary - Event Aggregates

## Overview

This document describes the Single Source of Truth (SSOT) implementation for event aggregates (total hours, estimated cost, hired/required counts) and when totals change.

## Counted Statuses

### Included in Totals
The following assignment statuses **are included** in event totals:
- `assigned` - Worker assigned but not yet started
- `confirmed` - Worker confirmed attendance
- `completed` - Shift completed successfully
- `checked_out` - Worker checked out (if applicable)

### Excluded from Totals
The following assignment statuses **are excluded** from event totals:
- `cancelled` - Assignment was cancelled
- `no_show` - Worker did not show up

**Implementation:** The `Events::RecalculateTotals` service filters assignments using:
```ruby
.reject { |a| a.status.in?(['cancelled', 'no_show']) }
```

## When Totals Change

Event totals are automatically recalculated when:

### 1. Assignment Changes
- **Create:** New assignment added (`after_create` callback)
- **Update:** Changes to:
  - `hours_worked` - Actual hours worked
  - `hourly_rate` - Worker's pay rate
  - `status` - Assignment status (e.g., assigned → completed)
  - `shift_id` - Moving assignment to different shift
- **Destroy:** Assignment removed (`after_destroy` callback)

### 2. Shift Changes
- **Pay Rate:** When `shift.pay_rate` changes (affects assignments using shift rate)

### 3. Event Skill Requirement Changes
- **Pay Rate Cascade:** When `EventSkillRequirement.pay_rate` changes, it cascades to related shifts and triggers recalculation

### 4. Event Completion
- **Complete Event:** When event status changes to `completed`, totals are recalculated before completion

## Implementation Details

### Service: `Events::RecalculateTotals`

**Location:** `app/services/events/recalculate_totals.rb`

**Responsibilities:**
- Calculate `total_hours_worked` using `Assignment#effective_hours` (SSOT)
- Calculate `total_pay_amount` (estimated cost) using `Assignment#effective_pay` (SSOT)
- Calculate `assigned_shifts_count` (shifts with valid assignments)
- Update `total_shifts_count`
- Log activity for audit trail

**Usage:**
```ruby
result = Events::RecalculateTotals.new(event: event).call
# Returns: { success: true, event: event } or { success: false, error: message }
```

### Model Method: `Event#recalculate_totals!`

**Location:** `app/models/event.rb`

**Usage:**
```ruby
event.recalculate_totals!  # Delegates to Events::RecalculateTotals service
```

### Callbacks

**Assignment Model:**
- `after_create :update_event_totals`
- `after_destroy :update_event_totals`
- `after_update :update_event_totals, if: :should_update_event_totals?`

**Shift Model:**
- `after_update :recalculate_event_totals_if_pay_rate_changed, if: :saved_change_to_pay_rate?`

**EventSkillRequirement Model:**
- `after_update :cascade_pay_rate_to_shifts, if: :saved_change_to_pay_rate?` (also triggers recalculation)

## API Response

### Events Index (`GET /api/v1/events`)

**Lightweight Serializer** includes:
- `total_hours` - Total hours worked (excludes no-show/cancelled)
- `total_cost` - Total cost (excludes no-show/cancelled)
- `estimated_cost` - Alias for total_cost
- `hired_count` - Alias for assigned_workers_count
- `required_count` - Alias for total_workers_needed
- `assigned_workers_count` - Number of workers assigned
- `total_workers_needed` - Number of workers required
- `unfilled_roles_count` - Number of unfilled roles
- `staffing_percentage` - Percentage of staffing complete

**All aggregates are included in the initial fetch** - no lazy loading required.

## Frontend Usage

### Event Interface
```typescript
interface Event {
  // Aggregates (SSOT - always included from API, never lazy)
  total_hours?: number;  // From lightweight serializer
  total_hours_worked?: number;  // From detailed serializer
  total_cost?: number;  // From lightweight serializer
  total_pay_amount?: number;  // From detailed serializer
  estimated_cost?: number;  // Alias for total_pay_amount/total_cost
  hired_count?: number;  // Alias for assigned_workers_count
  required_count?: number;  // Alias for total_workers_needed
  // ... other fields
}
```

### Displaying Aggregates
```typescript
// Use aggregates directly from API (no calculation needed)
const totalHours = event.total_hours ?? event.total_hours_worked ?? 0;
const estimatedCost = event.estimated_cost ?? event.total_cost ?? event.total_pay_amount ?? 0;
const hired = event.hired_count ?? event.assigned_workers_count ?? 0;
const required = event.required_count ?? event.total_workers_needed ?? 0;
```

### Reactive Updates

After mutations (add/remove worker, status changes, no-show/cancel), the frontend:
1. Calls `loadEvents()` to refetch all events with updated aggregates
2. Backend automatically recalculates totals via callbacks
3. UI updates immediately with correct values

## Transaction Safety

All recalculation operations are wrapped in transactions:
- Assignment updates and event recalculation are atomic
- If recalculation fails, assignment update is rolled back
- Cascading updates (e.g., pay_rate changes) are transactional

## Performance

- **Denormalized Columns:** Totals are stored in `events` table (`total_hours_worked`, `total_pay_amount`)
- **Eager Loading:** Events index API preloads all associations to avoid N+1 queries
- **Efficient Calculation:** Service uses `includes(:assignments)` to load all assignments in one query
- **No Live Computation:** Frontend uses pre-calculated aggregates, never computes on the fly

## Testing

### Service Tests
- `spec/services/events/recalculate_totals_spec.rb`
  - Mixed statuses (includes/excludes)
  - Large datasets (performance)
  - Edge cases (nil values, zero hours)

### Callback Tests
- `spec/models/assignment_callbacks_spec.rb`
  - Triggers on create/update/destroy
  - Transaction safety
  - Status exclusions

### API Tests
- `spec/requests/events_index_aggregates_spec.rb`
  - Aggregates included in response
  - Correct values (matches ground truth)
  - No N+1 queries

## Migration Notes

### Before
- Totals calculated on-the-fly in views/controllers
- Inconsistent calculation logic
- Completed events showed "0 hours"
- Active events showed "Est. Cost: $0.00" until assignments opened

### After
- Single source of truth: `Events::RecalculateTotals` service
- Totals stored in denormalized columns
- Always included in API responses
- Automatically updated on assignment changes
- Consistent across all views

## Maintenance

### Adding New Aggregate Fields

1. Add column to `events` table (migration)
2. Update `Events::RecalculateTotals` service to calculate new field
3. Update `serialize_event_lightweight` to include new field
4. Update frontend `Event` interface
5. Add tests

### Changing Counted Statuses

1. Update `Events::RecalculateTotals#fetch_valid_assignments` method
2. Update tests to verify new status behavior
3. Update this documentation

---

**Last Updated:** 2025-01-27  
**Version:** 1.0
