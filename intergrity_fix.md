# BACKEND DATA INTEGRITY FIX - SINGLE SOURCE OF TRUTH IMPLEMENTATION

## OBJECTIVE

Fix all data integrity issues identified in the backend audit while:
1. ✅ Preserving all existing functionality (NO breaking changes)
2. ✅ Reusing existing code (NO reinventing the wheel)
3. ✅ Establishing Single Source of Truth for ALL calculations
4. ✅ Eliminating ALL duplicate logic
5. ✅ Preventing stale/inconsistent data

## CRITICAL BUSINESS CONTEXT

This application handles PAYROLL data. Incorrect calculations result in:
- Workers paid wrong amounts (LEGAL LIABILITY)
- Reports don't match reality (COMPLIANCE VIOLATION)
- Client loses trust (BUSINESS FAILURE)

**Zero tolerance for data inconsistency.**

---

## EXECUTION PRINCIPLES

### 1. Code Reuse First
- ✅ Check if logic already exists before creating new
- ✅ Extract existing logic to shared modules
- ✅ Use concerns for shared behavior
- ✅ Centralize calculations in models, NOT controllers

### 2. Single Source of Truth
- ✅ ONE method to calculate hours
- ✅ ONE method to calculate pay
- ✅ ONE method to determine rates
- ✅ ONE place to store authoritative data

### 3. Preserve Functionality
- ✅ All existing API endpoints must work identically
- ✅ All existing features must behave the same
- ✅ All tests must pass (or be updated if calculation logic intentionally changes)
- ✅ NO user-facing changes

### 4. Data Integrity
- ✅ Cascading updates via callbacks
- ✅ Validations prevent divergence
- ✅ Transactions ensure atomicity
- ✅ Audit logs track changes

---

## PHASE 1: CREATE SINGLE SOURCE OF TRUTH CONCERNS

### Step 1.1: Create HoursCalculations Concern

**Create new file: `app/models/concerns/hours_calculations.rb`**

```ruby
# app/models/concerns/hours_calculations.rb
module HoursCalculations
  extend ActiveSupport::Concern

  # ═══════════════════════════════════════════════════════════
  # SINGLE SOURCE OF TRUTH - Hours Calculations
  # All hours logic must use these methods
  # ═══════════════════════════════════════════════════════════

  # Calculate effective hours for a single assignment
  # Priority: logged hours > scheduled hours > 0
  def effective_hours
    return 0.0 unless shift.present?

    # Use logged hours if present (after timesheet approval)
    if hours_worked.present? && hours_worked > 0
      hours_worked.to_f
    # Otherwise use scheduled hours (shift duration)
    elsif shift.start_time_utc.present? && shift.end_time_utc.present?
      duration_seconds = shift.end_time_utc - shift.start_time_utc
      hours = duration_seconds / 3600.0
      [hours, 0.0].max.round(2) # Ensure non-negative
    else
      0.0
    end
  rescue => e
    Rails.logger.error "Error calculating effective_hours for assignment #{id}: #{e.message}"
    0.0
  end

  # Calculate scheduled hours only (for display purposes)
  def scheduled_hours
    return 0.0 unless shift.present?
    shift.duration_hours
  rescue => e
    Rails.logger.error "Error calculating scheduled_hours for assignment #{id}: #{e.message}"
    0.0
  end

  # Check if hours have been manually logged
  def hours_logged?
    hours_worked.present? && hours_worked > 0
  end

  class_methods do
    # Calculate total hours for a collection of assignments
    def total_effective_hours
      sum { |assignment| assignment.effective_hours }
    end
  end
end
```

**Instructions:**
1. Create this file exactly as shown
2. This becomes the ONLY place hours are calculated
3. All other hours calculations will be replaced with calls to these methods

---

### Step 1.2: Create PayCalculations Concern

**Create new file: `app/models/concerns/pay_calculations.rb`**

```ruby
# app/models/concerns/pay_calculations.rb
module PayCalculations
  extend ActiveSupport::Concern

  # ═══════════════════════════════════════════════════════════
  # SINGLE SOURCE OF TRUTH - Pay Rate Calculations
  # All pay rate logic must use these methods
  # ═══════════════════════════════════════════════════════════

  # Minimum wage constant (single place to update)
  DEFAULT_PAY_RATE = 12.0

  # Calculate effective hourly rate for an assignment
  # Priority: assignment rate > shift rate > requirement rate > default
  def effective_hourly_rate
    return DEFAULT_PAY_RATE unless shift.present?

    hourly_rate.presence ||
    shift.pay_rate.presence ||
    shift.event_skill_requirement&.pay_rate ||
    DEFAULT_PAY_RATE
  end

  # Calculate effective pay for this assignment
  def effective_pay
    (effective_hours * effective_hourly_rate).round(2)
  end

  # Get the source of the current rate (for debugging/auditing)
  def rate_source
    if hourly_rate.present?
      'assignment'
    elsif shift.pay_rate.present?
      'shift'
    elsif shift.event_skill_requirement&.pay_rate.present?
      'requirement'
    else
      'default'
    end
  end

  class_methods do
    # Calculate total pay for a collection of assignments
    def total_effective_pay
      sum { |assignment| assignment.effective_pay }
    end
  end
end
```

**Instructions:**
1. Create this file exactly as shown
2. This becomes the ONLY place pay rates are determined
3. All hardcoded `12.0` values will be replaced with `DEFAULT_PAY_RATE`

---

### Step 1.3: Update Assignment Model to Include Concerns

**Update: `app/models/assignment.rb`**

**FIND these lines (near top of file):**
```ruby
class Assignment < ApplicationRecord
  belongs_to :shift
  belongs_to :worker
```

**REPLACE with:**
```ruby
class Assignment < ApplicationRecord
  # Include Single Source of Truth concerns
  include HoursCalculations
  include PayCalculations

  belongs_to :shift
  belongs_to :worker
```

**THEN DELETE these old methods (if they exist):**
```ruby
# DELETE this method (replaced by HoursCalculations#effective_hours):
def effective_hours
  # ... old code
end

# DELETE this method (replaced by PayCalculations#effective_hourly_rate):
def effective_hourly_rate
  hourly_rate || shift.pay_rate
end

# KEEP set_default_hours (it uses shift.duration_hours which is fine)
def set_default_hours
  return if hours_worked.present?
  return unless shift.present?
  
  self.hours_worked = shift.duration_hours
end
```

**Instructions:**
1. Include the two concerns at the top of the Assignment class
2. Delete any old `effective_hours` or `effective_hourly_rate` methods
3. Keep the `set_default_hours` method (it's used on creation)

---

## PHASE 2: FIX EVENT MODEL CALCULATIONS

### Step 2.1: Update Event Model to Use SSOT

**Update: `app/models/event.rb`**

**FIND this method:**
```ruby
def calculate_total_hours_worked
  shifts.joins(:assignments).where.not(assignments: { hours_worked: nil }).sum('assignments.hours_worked')
end
```

**REPLACE with:**
```ruby
def calculate_total_hours_worked
  # Use SSOT: sum effective_hours from all valid assignments
  shifts.includes(:assignments).flat_map(&:assignments)
    .reject { |a| a.status.in?(['cancelled', 'no_show']) }
    .sum(&:effective_hours)
    .round(2)
end
```

**FIND this method:**
```ruby
def calculate_total_pay_amount
  shifts.joins(:assignments).where.not(assignments: { hours_worked: nil }).sum('assignments.hours_worked * COALESCE(assignments.hourly_rate, shifts.pay_rate)')
end
```

**REPLACE with:**
```ruby
def calculate_total_pay_amount
  # Use SSOT: sum effective_pay from all valid assignments
  shifts.includes(:assignments).flat_map(&:assignments)
    .reject { |a| a.status.in?(['cancelled', 'no_show']) }
    .sum(&:effective_pay)
    .round(2)
end
```

**Instructions:**
1. Replace both calculation methods
2. Now they use the SSOT from Assignment model
3. Consistent with all reports and UI

---

### Step 2.2: Fix Event Totals Update Triggers

**Update: `app/models/event.rb`**

**FIND this method:**
```ruby
def should_update_completion_metrics?
  status == 'completed' && (saved_change_to_status? || assignments.any?)
end
```

**REPLACE with:**
```ruby
def should_update_completion_metrics?
  # Update metrics for completed events OR when recalculation requested
  status == 'completed' || @force_recalculate
end
```

**ADD this new public method (before private section):**
```ruby
# Force recalculation of totals (called by callbacks)
def recalculate_totals!
  @force_recalculate = true
  update_completion_metrics
  @force_recalculate = false
end
```

**FIND this method:**
```ruby
def update_completion_metrics
  return unless status == 'completed'
  
  update_columns(
    total_hours_worked: calculate_total_hours_worked,
    total_pay_amount: calculate_total_pay_amount
  )
end
```

**REPLACE with:**
```ruby
def update_completion_metrics
  # Recalculate totals (works for both completed and active events now)
  update_columns(
    total_hours_worked: calculate_total_hours_worked,
    total_pay_amount: calculate_total_pay_amount,
    updated_at: Time.current
  )
end
```

**Instructions:**
1. Events can now recalculate totals even when not completed
2. Adds `recalculate_totals!` method that assignments can call
3. This fixes stale totals issue

---

## PHASE 3: FIX ASSIGNMENT CALLBACKS

### Step 3.1: Update Assignment Callbacks to Trigger Event Recalculation

**Update: `app/models/assignment.rb`**

**FIND this callback:**
```ruby
after_update :update_event_counts, if: :saved_change_to_hours_worked?
```

**REPLACE with:**
```ruby
after_update :update_event_totals, if: :should_update_event_totals?
after_destroy :update_event_totals
```

**FIND this method:**
```ruby
def update_event_counts
  return unless shift&.event
  shift.event.update_columns(
    assigned_shifts_count: shift.event.shifts.joins(:assignments).count
  )
end
```

**REPLACE with:**
```ruby
# Determine if event totals need updating
def should_update_event_totals?
  saved_change_to_hours_worked? || 
  saved_change_to_hourly_rate? || 
  saved_change_to_status?
end

# Update event totals when assignment changes
def update_event_totals
  return unless shift&.event
  
  event = shift.event
  
  # Update counts AND totals
  event.update_columns(
    assigned_shifts_count: event.shifts.joins(:assignments)
      .where.not(assignments: { status: ['cancelled', 'no_show'] })
      .count,
    total_hours_worked: event.calculate_total_hours_worked,
    total_pay_amount: event.calculate_total_pay_amount,
    updated_at: Time.current
  )
end
```

**Instructions:**
1. Now triggers on hours, rate, OR status changes
2. Also triggers on destroy (removes from totals)
3. Updates BOTH counts AND totals (not just counts)
4. Fixes stale data issue

---

## PHASE 4: FIX REPORTS CONTROLLER

### Step 4.1: Replace All Hours/Pay Calculations with SSOT

**Update: `app/controllers/api/v1/reports_controller.rb`**

**FIND all instances of manual hours calculation like:**
```ruby
sched_hours = 0.0
if shift&.start_time_utc.present? && shift&.end_time_utc.present? && shift.end_time_utc > shift.start_time_utc
  sched_hours = (shift.end_time_utc - shift.start_time_utc) / 3600.0
  sched_hours = sched_hours.positive? ? sched_hours : 0.0
end

effective_hours = assignment.hours_worked.present? ? assignment.hours_worked.to_f : sched_hours
```

**REPLACE ALL instances with:**
```ruby
effective_hours = assignment.effective_hours
```

**FIND all instances of manual rate calculation like:**
```ruby
rate = assignment.hourly_rate || shift&.pay_rate || 12.0
```

**REPLACE ALL instances with:**
```ruby
rate = assignment.effective_hourly_rate
```

**FIND all instances of manual pay calculation like:**
```ruby
pay = effective_hours * rate
```

**REPLACE ALL instances with:**
```ruby
pay = assignment.effective_pay
```

**Specific locations to update:**

1. **Timesheet CSV (around line 157-165):**
```ruby
# OLD:
total_hours = if staffing.hours_worked.present?
  staffing.hours_worked
else
  shift_duration = calculate_duration(shift.start_time_utc, shift.end_time_utc)
  [shift_duration - break_hours_numeric, 0].max
end

# NEW:
total_hours = staffing.effective_hours
# Note: Break time handling moved to shift model if needed
```

2. **Payroll CSV (around line 220-227):**
```ruby
# OLD:
sched_hours = 0.0
if shift&.start_time_utc.present? && shift&.end_time_utc.present? && shift.end_time_utc > shift.start_time_utc
  sched_hours = (shift.end_time_utc - shift.start_time_utc) / 3600.0
  sched_hours = sched_hours.positive? ? sched_hours : 0.0
end
effective_hours = assignment.hours_worked.present? ? assignment.hours_worked.to_f : sched_hours
rate = assignment.hourly_rate || shift&.pay_rate || 12.0

# NEW:
effective_hours = assignment.effective_hours
rate = assignment.effective_hourly_rate
```

3. **Worker Hours CSV (around line 272-279):**
```ruby
# Same replacement as Payroll CSV
```

4. **Event Summary CSV (around line 352-362):**
```ruby
# Same replacement as Payroll CSV
```

**Instructions:**
1. Search the entire reports_controller.rb file
2. Replace ALL manual hours calculations with `assignment.effective_hours`
3. Replace ALL manual rate calculations with `assignment.effective_hourly_rate`
4. Replace ALL manual pay calculations with `assignment.effective_pay`
5. This ensures reports match UI exactly

---

## PHASE 5: ADD TIME SYNCHRONIZATION CALLBACKS

### Step 5.1: Add EventSchedule Callback to Sync Shift Times

**Update: `app/models/event_schedule.rb`**

**FIND:**
```ruby
class EventSchedule < ApplicationRecord
  belongs_to :event
  
  before_create :set_created_at_utc
  before_save :set_updated_at_utc
```

**ADD after existing callbacks:**
```ruby
  # Sync shift times when schedule changes
  after_update :sync_shift_times, if: :times_changed?
  
  private
  
  def times_changed?
    saved_change_to_start_time_utc? || saved_change_to_end_time_utc?
  end
  
  def sync_shift_times
    return unless event.present?
    
    # Only sync event-owned shifts (not standalone shifts)
    event_shifts = event.shifts.where.not(event_id: nil)
    
    return if event_shifts.empty?
    
    # Update all shifts to match new schedule times
    updated_count = event_shifts.update_all(
      start_time_utc: start_time_utc,
      end_time_utc: end_time_utc,
      updated_at: Time.current
    )
    
    # Log the sync
    Rails.logger.info "EventSchedule #{id}: Synced times to #{updated_count} shifts"
    
    # Trigger event totals recalculation (hours may have changed)
    event.recalculate_totals! if event.respond_to?(:recalculate_totals!)
    
    # Log activity
    ActivityLog.create!(
      user_id: Current.user&.id,
      action: 'event_schedule_time_sync',
      resource_type: 'EventSchedule',
      resource_id: id,
      details: "Synced #{updated_count} shifts to new times: #{start_time_utc} - #{end_time_utc}"
    )
  rescue => e
    Rails.logger.error "Error syncing shift times for EventSchedule #{id}: #{e.message}"
  end
```

**Instructions:**
1. Add this callback after existing callbacks
2. Now when event schedule times change, ALL child shifts update automatically
3. Also recalculates event totals (because hours may change)
4. Logs the change for auditing

---

### Step 5.2: Add Shift Validation Against Event Schedule

**Update: `app/models/shift.rb`**

**FIND the existing validation:**
```ruby
validate :same_calendar_day_as_event, if: -> { event_id.present? }
```

**ADD this new validation after it:**
```ruby
validate :times_match_event_schedule, if: -> { event_id.present? && event&.event_schedule.present? }

private

def times_match_event_schedule
  return unless event&.event_schedule
  
  schedule = event.event_schedule
  
  # Allow some tolerance for setup/breakdown shifts (optional - remove if not needed)
  # For now, enforce exact match for event-owned shifts
  unless start_time_utc == schedule.start_time_utc && end_time_utc == schedule.end_time_utc
    errors.add(:base, 
      "Shift times must match event schedule. " \
      "Expected: #{schedule.start_time_utc.strftime('%Y-%m-%d %H:%M')} - #{schedule.end_time_utc.strftime('%Y-%m-%d %H:%M')}, " \
      "Got: #{start_time_utc.strftime('%Y-%m-%d %H:%M')} - #{end_time_utc.strftime('%Y-%m-%d %H:%M')}"
    )
  end
end
```

**Instructions:**
1. This prevents shifts from being manually updated to different times than event
2. Maintains data integrity
3. Users must update event schedule, which then syncs to shifts

---

### Step 5.3: Block Independent Shift Time Updates (Optional - Recommended)

**Update: `app/controllers/api/v1/shifts_controller.rb`**

**FIND the shift_params method:**
```ruby
def shift_params
  params.require(:shift).permit(
    :client_name, :role_needed, :start_time_utc, :end_time_utc, :capacity, :location_id, :pay_rate, :notes
  )
end
```

**REPLACE with:**
```ruby
def shift_params
  permitted = params.require(:shift).permit(
    :client_name, :role_needed, :capacity, :location_id, :pay_rate, :notes
  )
  
  # For event-owned shifts, do NOT allow time updates
  # (times must be updated via event schedule)
  if @shift.event_id.present?
    # Block time updates for event shifts
    permitted.except(:start_time_utc, :end_time_utc)
  else
    # Standalone shifts can update times
    permitted.merge(
      params.require(:shift).permit(:start_time_utc, :end_time_utc)
    )
  end
end
```

**Instructions:**
1. Event-owned shifts can NO LONGER have times updated directly
2. Standalone shifts (no event_id) can still update times
3. Prevents data divergence
4. Times MUST be updated via EventSchedule (which then syncs)

---

## PHASE 6: ADD PAY RATE CASCADE

### Step 6.1: Add EventSkillRequirement Callback

**Update: `app/models/event_skill_requirement.rb`**

**FIND:**
```ruby
class EventSkillRequirement < ApplicationRecord
  belongs_to :event
  belongs_to :certification, optional: true
```

**ADD after belongs_to:**
```ruby
  # Cascade pay rate changes to existing shifts
  after_update :cascade_pay_rate_to_shifts, if: :saved_change_to_pay_rate?
  
  private
  
  def cascade_pay_rate_to_shifts
    return unless event.present? && pay_rate.present?
    
    # Find all shifts for this skill that don't have a custom pay_rate
    # (if shift has custom rate, respect it)
    matching_shifts = event.shifts.where(role_needed: skill_name)
      .where(pay_rate: [nil, saved_change_to_pay_rate[0]]) # nil or old requirement rate
    
    updated_count = matching_shifts.update_all(
      pay_rate: pay_rate,
      updated_at: Time.current
    )
    
    Rails.logger.info "EventSkillRequirement #{id}: Cascaded pay_rate #{pay_rate} to #{updated_count} shifts"
    
    # Recalculate event totals
    event.recalculate_totals! if event.respond_to?(:recalculate_totals!)
    
    # Log activity
    ActivityLog.create!(
      user_id: Current.user&.id,
      action: 'requirement_pay_rate_cascade',
      resource_type: 'EventSkillRequirement',
      resource_id: id,
      details: "Cascaded pay_rate #{pay_rate} to #{updated_count} shifts for role '#{skill_name}'"
    )
  rescue => e
    Rails.logger.error "Error cascading pay_rate for EventSkillRequirement #{id}: #{e.message}"
  end
```

**Instructions:**
1. When requirement pay_rate changes, update all related shifts
2. Only updates shifts that have nil rate OR old requirement rate
3. Respects custom shift rates (if manually set)
4. Recalculates event totals
5. Logs the change

---

## PHASE 7: FIX FRONTEND CALCULATION DUPLICATION

### Step 7.1: Remove Frontend Hours Calculation

**Update: `social-catering-ui/src/pages/EventsPage.tsx`**

**FIND (around line 1281-1286):**
```typescript
const shiftDuration = (new Date(shift.end_time_utc).getTime() - new Date(shift.start_time_utc).getTime()) / (1000 * 60 * 60);
shift.assignments.forEach(assignment => {
  const logged = assignment.hours_worked ? parseFloat(assignment.hours_worked.toString()) : undefined;
  const hours = typeof logged === 'number' && !isNaN(logged) ? logged : shiftDuration;
  totalHours += hours;
});
```

**REPLACE with:**
```typescript
// Use backend-calculated effective_hours (if available in API response)
// If not available, add to API response
shift.assignments.forEach(assignment => {
  // Backend should provide effective_hours in API response
  const hours = assignment.effective_hours || 0;
  totalHours += hours;
});
```

**THEN UPDATE API response to include effective_hours:**

**Update: `app/controllers/api/v1/events_controller.rb` (in serialize methods)**

**FIND assignment serialization:**
```ruby
# Probably something like:
assignments: shift.assignments.map { |a| {
  id: a.id,
  worker_id: a.worker_id,
  hours_worked: a.hours_worked,
  hourly_rate: a.hourly_rate,
  # ...
}}
```

**ADD effective_hours and effective_pay:**
```ruby
assignments: shift.assignments.map { |a| {
  id: a.id,
  worker_id: a.worker_id,
  hours_worked: a.hours_worked,
  hourly_rate: a.hourly_rate,
  effective_hours: a.effective_hours,         # ← ADD THIS
  effective_hourly_rate: a.effective_hourly_rate, # ← ADD THIS
  effective_pay: a.effective_pay,             # ← ADD THIS
  # ...
}}
```

**Instructions:**
1. Frontend should NOT calculate hours - use backend value
2. Backend provides `effective_hours`, `effective_hourly_rate`, `effective_pay`
3. Ensures frontend always matches backend
4. Single source of truth

---

## PHASE 8: ADD TRANSACTION WRAPPERS

### Step 8.1: Wrap Assignment Updates in Transactions

**Update: `app/controllers/api/v1/assignments_controller.rb`**

**FIND the update method:**
```ruby
def update
  if @assignment.update(assignment_params)
    render json: { status: 'success', data: serialize_assignment(@assignment) }
  else
    render json: { status: 'error', errors: @assignment.errors.full_messages }, status: :unprocessable_entity
  end
end
```

**REPLACE with:**
```ruby
def update
  ActiveRecord::Base.transaction do
    if @assignment.update!(assignment_params)
      # Callbacks will update event totals automatically
      render json: { status: 'success', data: serialize_assignment(@assignment) }
    end
  end
rescue ActiveRecord::RecordInvalid => e
  render json: { status: 'error', errors: e.record.errors.full_messages }, status: :unprocessable_entity
end
```

**Instructions:**
1. Wraps update in transaction
2. If event total update fails, assignment update rolls back
3. Ensures atomicity

---

## PHASE 9: ADD CONSTANTS FILE

### Step 9.1: Create Constants for Default Values

**Create new file: `config/initializers/app_constants.rb`**

```ruby
# config/initializers/app_constants.rb

module AppConstants
  # Pay rate defaults
  DEFAULT_PAY_RATE = 12.0 # Minimum wage fallback
  
  # Assignment statuses that exclude from calculations
  EXCLUDED_ASSIGNMENT_STATUSES = ['cancelled', 'no_show'].freeze
  
  # Valid assignment statuses
  VALID_ASSIGNMENT_STATUSES = ['assigned', 'confirmed', 'completed'].freeze
  
  # Event statuses
  EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'].freeze
  
  # Add other constants as needed
end

# Make constants globally available
Object.const_set(:AppConstants, AppConstants)
```

**THEN update PayCalculations concern:**

**Update: `app/models/concerns/pay_calculations.rb`**

**FIND:**
```ruby
DEFAULT_PAY_RATE = 12.0
```

**REPLACE with:**
```ruby
DEFAULT_PAY_RATE = AppConstants::DEFAULT_PAY_RATE
```

**Instructions:**
1. All default values in ONE place
2. Easy to update across entire app
3. No more hardcoded values scattered everywhere

---

## VERIFICATION STEPS

After implementing all changes, verify:

1. ✅ All tests pass (or are updated for new logic)
2. ✅ No duplicate hours calculation code exists
3. ✅ No duplicate pay rate calculation code exists
4. ✅ Event totals update when assignments change
5. ✅ Shift times sync when event schedule changes
6. ✅ Pay rates cascade when requirement changes
7. ✅ Frontend uses backend calculations (no duplication)
8. ✅ All reports show identical totals for same data
9. ✅ No stale data in event totals
10. ✅ All constants centralized

Run this verification script:

**Create: `scripts/verify_ssot_implementation.rb`**

```ruby
# scripts/verify_ssot_implementation.rb

puts "🔍 Verifying Single Source of Truth Implementation...\n"

# Test 1: Hours calculation consistency
puts "\n1. Testing Hours Calculation Consistency..."
event = Event.completed_scope.includes(shifts: { assignments: :worker }).first

if event
  # Calculate via different paths
  event_total = event.calculate_total_hours_worked
  manual_total = event.shifts.flat_map(&:assignments)
    .reject { |a| a.status.in?(['cancelled', 'no_show']) }
    .sum(&:effective_hours)
  
  if (event_total - manual_total).abs < 0.01
    puts "   ✅ Event totals match manual calculation"
  else
    puts "   ❌ MISMATCH: Event=#{event_total}, Manual=#{manual_total}"
  end
else
  puts "   ⚠️  No completed events found to test"
end

# Test 2: Pay rate fallback chain
puts "\n2. Testing Pay Rate Fallback Chain..."
assignment = Assignment.includes(:shift).first

if assignment
  rate = assignment.effective_hourly_rate
  puts "   ✅ Effective rate: $#{rate}"
  puts "   Source: #{assignment.rate_source}"
  
  # Verify fallback
  if assignment.hourly_rate.nil? && assignment.shift.pay_rate.nil?
    if rate == AppConstants::DEFAULT_PAY_RATE
      puts "   ✅ Correctly using DEFAULT_PAY_RATE"
    else
      puts "   ❌ Default rate mismatch"
    end
  end
else
  puts "   ⚠️  No assignments found to test"
end

# Test 3: Event totals update on assignment change
puts "\n3. Testing Event Totals Update..."
assignment = Assignment.includes(:shift).where.not(hours_worked: nil).first

if assignment && assignment.shift&.event
  event = assignment.shift.event
  old_total = event.total_hours_worked
  
  # Change hours
  assignment.update(hours_worked: assignment.hours_worked + 1)
  
  event.reload
  new_total = event.total_hours_worked
  
  if new_total != old_total
    puts "   ✅ Event totals updated automatically"
    puts "   Old: #{old_total}, New: #{new_total}"
    
    # Revert change
    assignment.update(hours_worked: assignment.hours_worked - 1)
  else
    puts "   ❌ Event totals NOT updated"
  end
else
  puts "   ⚠️  No suitable assignment found to test"
end

# Test 4: No hardcoded pay rates in code
puts "\n4. Checking for Hardcoded Pay Rates..."
hardcoded_found = false

Dir.glob('app/**/*.rb').each do |file|
  content = File.read(file)
  if content.match(/\|\|\s*12\.0/) && !file.include?('app_constants')
    puts "   ❌ Found hardcoded 12.0 in #{file}"
    hardcoded_found = true
  end
end

unless hardcoded_found
  puts "   ✅ No hardcoded pay rates found (using constants)"
end

# Test 5: Frontend receives backend calculations
puts "\n5. Checking API Response Structure..."
# This would require making actual API call
# For now, just verify serializer includes effective_hours

puts "   ⚠️  Manual verification required: Check that API responses include:"
puts "      - effective_hours"
puts "      - effective_hourly_rate"
puts "      - effective_pay"

puts "\n" + "="*70
puts "✅ SSOT Verification Complete"
puts "="*70
```

---

## ROLLBACK PLAN

If anything breaks:

1. **Rollback Git Commits:**
```bash
git log --oneline -10  # Find commit before changes
git revert <commit-hash>
git push origin main
```

2. **Specific Rollbacks:**
   - Remove concern includes from Assignment model
   - Restore old calculation methods
   - Remove callbacks from EventSchedule/EventSkillRequirement

3. **Database Rollback:**
```bash
# No schema changes made, so no migrations to rollback
```

---

## SUCCESS CRITERIA

Implementation is complete when:

1. ✅ Assignment#effective_hours exists and is used everywhere
2. ✅ Assignment#effective_hourly_rate exists and is used everywhere
3. ✅ Assignment#effective_pay exists and is used everywhere
4. ✅ Event totals update when assignments change
5. ✅ Shift times sync when event schedule changes
6. ✅ Pay rates cascade when requirements change
7. ✅ No duplicate calculation logic anywhere
8. ✅ No hardcoded default values (uses constants)
9. ✅ Frontend uses backend calculations only
10. ✅ All reports show identical totals
11. ✅ verification script passes all checks

---

## EXECUTE NOW

Follow phases in order:
1. Phase 1: Create concerns (15 min)
2. Phase 2: Update Event model (10 min)
3. Phase 3: Update Assignment callbacks (10 min)
4. Phase 4: Update Reports controller (20 min)
5. Phase 5: Add time sync (15 min)
6. Phase 6: Add pay cascade (10 min)
7. Phase 7: Fix frontend (15 min)
8. Phase 8: Add transactions (5 min)
9. Phase 9: Add constants (5 min)

**Total estimated time: 2 hours**

**DO NOT skip any phase. Execute in order. Test after each phase.**

BEGIN IMPLEMENTATION.