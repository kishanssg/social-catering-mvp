# SSOT & Integrity Implementation Summary

## Branch
`chore/ssot-integrity-locking-idempotency`

## Commits

1. **feat(assignments): add optimistic locking + 409 conflict handling**
   - Added `lock_version` column to assignments
   - Enabled `lock_optimistically` on Assignment model
   - Added `stale_object_error` handler in BaseController (returns 409)

2. **feat(approvals): make approve_selected idempotent and log only changed rows**
   - Made `approve_selected` idempotent (skips already approved)
   - Uses row-level locking (`FOR UPDATE`) to prevent race conditions
   - Only logs changed assignments (not duplicates)

3. **chore(api): add strong params for approvals and reports**
   - Added `approval_params` method to ApprovalsController
   - Added `approve_selected_params` method
   - Added `report_params` method to ReportsController
   - Replaced all direct `params[...]` usage

4. **feat(events): audit bulk assignment cancel on event destroy**
   - Added ActivityLog entry for bulk cancellation
   - Logs cancelled_count for audit trail

5. **perf(activity_logs): add concurrent index on (entity_type, created_at_utc)**
   - Added concurrent index migration (safe for production)
   - Uses `disable_ddl_transaction!` and `algorithm: :concurrently`

6. **feat(totals): add optional SQL aggregation behind USE_SQL_TOTALS flag**
   - Added feature flag `config.x.use_sql_totals` (from ENV)
   - SQL aggregation path for large events
   - Ruby path remains default (backward compatible)

7. **fix(ui): invalidate events/approvals/dashboard caches after mutations; handle 409s**
   - Added `approval-updated` custom event dispatch
   - Calls `onSuccess()` callback to trigger parent refresh
   - Handles 409 conflicts with user-friendly message

8. **chore(staging): enable Bullet for N+1 detection via ENABLE_BULLET env var**
   - Added Bullet configuration in production.rb
   - Enabled via `ENABLE_BULLET=true` env var (for staging)

9. **feat(db): add CHECK constraint for assignments.hours_worked range**
   - Added constraint: `hours_worked IS NULL OR (hours_worked >= 0 AND hours_worked <= 24)`

10. **test: add idempotent approvals, optimistic locking, and totals parity specs**
    - `spec/requests/api/v1/approvals_spec.rb` - Idempotency tests
    - `spec/integration/optimistic_locking_spec.rb` - Concurrent edit tests
    - `spec/services/events/recalculate_totals_parity_spec.rb` - SQL vs Ruby parity

## Migration Checklist

Before deploying:

1. **Run migrations** (in order):
   ```bash
   bin/rails db:migrate
   ```
   - `add_lock_version_to_assignments` - Adds lock_version column
   - `add_idx_activity_logs_entity_type_created_at` - Concurrent index (safe)
   - `add_hours_range_check_to_assignments` - CHECK constraint

2. **Set environment variables** (staging):
   ```bash
   ENABLE_BULLET=true  # Enable N+1 detection
   USE_SQL_TOTALS=false  # Keep Ruby path initially, test SQL in staging first
   ```

3. **Verify data integrity**:
   ```bash
   # Check for assignments with invalid hours
   bin/rails audit:hours  # (if rake task exists)
   
   # Recalculate all event totals
   bin/rails events:recalculate_totals
   ```

## Testing Checklist

- [ ] Run RSpec tests: `bundle exec rspec spec/requests/api/v1/approvals_spec.rb`
- [ ] Run optimistic locking test: `bundle exec rspec spec/integration/optimistic_locking_spec.rb`
- [ ] Run totals parity test: `bundle exec rspec spec/services/events/recalculate_totals_parity_spec.rb`
- [ ] Manual test: Two browsers edit same assignment → second gets 409
- [ ] Manual test: Approve Selected twice → no duplicate logs
- [ ] Manual test: Invalid hours (<0 or >24) rejected by DB
- [ ] Manual test: Deleting event → single audit log entry
- [ ] Manual test: After approvals, events & dashboard totals refresh

## Known Issues / TODOs

1. **AppConstants::DEFAULT_PAY_RATE** - Used in SQL aggregation, but PayCalculations uses it via constant. Should be consistent.

2. **React Query** - Codebase doesn't use React Query yet. Cache invalidation uses custom events + callbacks. Consider migrating to React Query for better cache management.

3. **SQL Aggregation** - Default rate hardcoded in SQL. Consider using a subquery or function for better maintainability.

4. **Bullet in Production** - Only enabled via ENV flag. Should be enabled in staging by default.

## Sign-Off Status

### ✅ Completed
- [x] Optimistic locking on Assignment
- [x] Idempotent `approve_selected`
- [x] Strong params in ApprovalsController and ReportsController
- [x] Audit log for bulk cancellation
- [x] Concurrent index on activity_logs
- [x] SQL aggregation feature flag
- [x] Cache invalidation events
- [x] 409 error handling in UI
- [x] Hours range CHECK constraint
- [x] Test coverage for key flows

### ⚠️ Needs Verification
- [ ] Run migrations in staging first
- [ ] Test SQL aggregation parity in staging
- [ ] Verify Bullet catches N+1s in staging
- [ ] Test concurrent edits with 2 admins
- [ ] Verify cache invalidation works in UI

## Next Steps

1. **Deploy to staging** and run acceptance tests
2. **Enable `USE_SQL_TOTALS=true`** in staging after parity verified
3. **Monitor Bullet logs** for N+1 queries
4. **Deploy to production** after staging validation
5. **Consider** migrating to React Query for better cache management

