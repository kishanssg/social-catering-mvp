# Milestone 2 - Manual E2E Testing in Progress

**Date**: 2025-10-26  
**Tester**: Starting manual E2E verification  
**Environment**: Heroku Staging (v114)  
**URL**: https://sc-mvp-staging-c6ef090c6c41.herokuapp.com

---

## Test Execution Plan

Following the E2E Testing Guide, we need to verify:

### Critical Scenarios
1. ✅ Authentication (login/logout)
2. ⚠️ Worker Management CRUD  
3. ⚠️ Shift Creation & Assignment
4. ⚠️ **Conflict Detection** (MOST CRITICAL)
5. ⚠️ Capacity Enforcement
6. ⚠️ Timesheet Report & CSV
7. ⚠️ Activity Log Verification
8. ⚠️ Responsive Design
9. ⚠️ Error/Loading States

---

## Current Status

### Backend Status ✅
- Health endpoint: 200 OK
- Database: Connected
- Workers: 53
- Events: 23
- Shifts: 108
- Activity Logs: 442

### Frontend Status ⚠️
- React app deployed to staging
- UI accessible at root URL
- Need to verify all UI flows work correctly

---

## Next Steps

### Immediate Actions Required:
1. **Login to staging app** and verify authentication
2. **Navigate to Dashboard** - verify stats match backend counts
3. **Create a test worker** - verify CRUD operations
4. **Create overlapping shifts** - verify conflict detection (CRITICAL)
5. **Assign workers with conflicts** - verify inline warnings appear
6. **Export timesheet CSV** - verify report generation
7. **Check activity log** - verify audit trail
8. **Test responsive layouts** - verify tablet/mobile views
9. **Document with screenshots** - collect evidence

### Evidence to Collect:
- Screenshot: Login success
- Screenshot: Dashboard with stats
- Screenshot: Workers list
- Screenshot: **Conflict warning** (MOST IMPORTANT)
- Screenshot: Capacity warning
- Screenshot: Timesheet report
- Screenshot: Exported CSV
- Screen recording: 5-10 min walkthrough

---

## Acceptance Criteria Checklist

### Core Functionality
- [ ] Authentication works (login/logout)
- [ ] Dashboard loads with correct stats
- [ ] Workers CRUD complete
- [ ] Worker search functional (server-side)
- [ ] Shifts CRUD complete
- [ ] **Conflict detection shows inline warnings**
- [ ] **Capacity limit enforced**
- [ ] Timesheet CSV export works
- [ ] Activity log displays correctly

### UI/UX
- [ ] Responsive on desktop
- [ ] Responsive on tablet
- [ ] Responsive on mobile
- [ ] Loading states visible
- [ ] Error messages display
- [ ] Empty states helpful

### Performance
- [ ] Dashboard loads < 3s
- [ ] API responses < 500ms
- [ ] No console errors
- [ ] No N+1 queries

### Bugs
- [ ] No Sev-1 bugs (crashes, data loss)
- [ ] No Sev-2 bugs (major features broken)
- [ ] Only Sev-3/4 bugs (minor polish)

---

## Notes
- Staging environment is v114 on Heroku
- Test credentials: natalie@socialcatering.com / password123
- All backend APIs verified and working
- Need to verify UI integration and conflict detection

---

**Status**: READY FOR MANUAL TESTING  
**Verdict**: PENDING

