# Certification Assignment Test Checklist

## Backend Tests
- [ ] Run: rails runner db/scripts/verify_certifications.rb
- [ ] Run: rails runner db/scripts/test_certification_flow.rb
- [ ] Verify no PG::UniqueViolation errors
- [ ] Check rails logs show UTC timestamps for expires_at_utc

## Frontend Tests
- [ ] Open worker edit page in browser
- [ ] Check Network tab → see existing worker_certifications in GET response
- [ ] Add a new certification with date
- [ ] Click Update → Network tab shows nested attributes with certification_id
- [ ] Verify 200 response (not 422 or 500)
- [ ] Refresh page → certification still shows with correct date
- [ ] Edit same certification date → Update again → no duplicate error
- [ ] Remove certification (uncheck) → Update → verify _destroy: true sent

## Assignment Tests
- [ ] Create shift with required certification
- [ ] Try assigning worker without cert → see clear error message
- [ ] Add cert to worker with future expiry
- [ ] Assign same worker → success
- [ ] Edit cert to expire before shift ends
- [ ] Try assigning → see "expires on [date], before shift ends" error

## Edge Cases
- [ ] Worker with multiple certifications saves correctly
- [ ] Updating multiple certs at once works
- [ ] Cannot create duplicate cert on same worker via UI
- [ ] Date-only input (YYYY-MM-DD) converts to UTC end-of-day
- [ ] Expired cert blocks assignment but doesn't break worker save
