# 🔄 WORKFLOW STATE - SOCIAL CATERING MVP

**Last Updated:** January 2025  
**Current Phase:** Phase 0 - Cleanup & Restructure  
**Days in Phase:** 0/5  
**Overall Progress:** 15% Complete  
**Deployment Target:** Heroku Staging

---

## 📍 CURRENT STATUS

### **Active Phase: PHASE 0 - CLEANUP & RESTRUCTURE**

**Start Date:** Today  
**Target Completion:** 5 days  
**Priority:** HIGH - Foundation for all future work

**Objectives:**
1. Remove all irrelevant/deprecated files
2. Consolidate database schema
3. Remove Job/Staffing aliases
4. Verify all model relationships
5. Add missing database indexes

---

## ✅ COMPLETED TASKS

### **Recent Accomplishments (Last 7 Days)**

#### **Events Page Unification** ✅
- [x] Merged Staffing page into Events page
- [x] Implemented three tabs (Draft/Active/Past)
- [x] Added inline worker assignment in Active tab
- [x] Removed Staffing navigation link
- [x] Added redirects from /staffing to /events?tab=active

#### **Bulk Worker Scheduling** ✅
- [x] Added "Schedule Worker" button on Workers page
- [x] Created bulk assignment modal
- [x] Implemented multi-select shifts functionality
- [x] Added search and filter in modal
- [x] Created backend bulk_create endpoint
- [x] Added conflict detection logic

#### **Documentation** ✅
- [x] Created implementation_context.md
- [x] Created workflow_state.md
- [x] Created project_config.md
- [x] Documented all API endpoints
- [x] Documented database schema

---

## 🎯 IMMEDIATE PRIORITIES (Next 48 Hours)

### **Priority 1: File Cleanup** 🔴
**Status:** Not Started  
**Owner:** Developer  
**Estimated Time:** 2-3 hours

**Tasks:**
```bash
# Delete backup files
- [ ] rm backup-before-cleanup-20251012-115900.tar.gz
- [ ] rm latest.dump
- [ ] rm cookies.txt frontend_cookies.txt

# Delete test files
- [ ] rm -rf social-catering-ui/src/components/Test*.tsx
- [ ] rm social-catering-ui/src/components/{DebugApi,SimpleTest,WorkingWizard,ApiTest}.tsx

# Delete shell scripts
- [ ] rm social-catering-ui/{bulk_create_shifts*,create_*_shifts*}.sh
- [ ] rm scripts/*.sh
- [ ] rm deploy.sh test_api.sh

# Clean logs
- [ ] rm log/*.log

# Delete duplicate seeds
- [ ] rm db/{seeds_basic,seeds_minimal,seeds_simple,seeds_tallahassee}.rb

# Archive docs
- [ ] mkdir -p docs/archive
- [ ] mv UNIFIED_EVENTS_IMPLEMENTATION.md docs/archive/
```

**Verification:**
```bash
# After cleanup, verify:
git status  # Should show deleted files
ls -lh .  # No large backup files
ls log/  # Only essential logs remain
ls db/  # Only seeds.rb and schema.rb
```

---

### **Priority 2: Database Schema Cleanup** 🔴
**Status:** Not Started  
**Owner:** Developer  
**Estimated Time:** 3-4 hours

**Tasks:**
```ruby
# 1. Remove deprecated models
- [ ] rm app/models/job.rb
- [ ] rm app/models/staffing.rb

# 2. Search and replace references
- [ ] Find all "Job" references, replace with "Event"
- [ ] Find all "Staffing" references, replace with "Assignment"
- [ ] Update all controllers
- [ ] Update all serializers

# 3. Create cleanup migration
- [ ] rails g migration CleanupSchema
- [ ] Add missing indexes (see below)
- [ ] Verify foreign key constraints

# 4. Add performance indexes
- [ ] add_index :assignments, [:worker_id, :shift_id], unique: true
- [ ] add_index :assignments, [:status, :created_at_utc]
- [ ] add_index :shifts, [:start_time_utc, :end_time_utc]
- [ ] add_index :shifts, [:event_id, :status]
- [ ] add_index :workers, :active
- [ ] add_index :events, [:status, :created_at_utc]

# 5. Run migration
- [ ] rails db:migrate
- [ ] Verify no errors
```

**Verification:**
```bash
# Check for Job/Staffing references
grep -r "class Job" app/
grep -r "class Staffing" app/
# Should return nothing

# Check indexes exist
rails dbconsole
\di  -- List all indexes
\q
```

---

### **Priority 3: Fix CSV Export Headers** 🔴
**Status:** Not Started  
**Owner:** Developer  
**Estimated Time:** 1-2 hours

**Current Issue:**
Headers might not match sample exactly (spaces vs underscores)

**Required Headers:**
```csv
JOB_ID,SKILL_NAME,WORKER_FIRSTNAME,WORKER_LASTNAME,SHIFT_DATE,SHIFT_START_TIME,SHIFT_END_TIME,UNPAID_BREAK,TOTAL_HOURS,SHIFT_SUPERVISOR,REMARKS
```

**Tasks:**
```ruby
# Update app/controllers/api/v1/reports_controller.rb

- [ ] Verify header names use UNDERSCORES (not spaces)
- [ ] Test date format: MM/DD/YYYY (e.g., 01/15/2025)
- [ ] Test time format: HH:MM AM/PM (e.g., 05:00 PM)
- [ ] Test break format: 0.5 (decimal hours, 1 decimal place)
- [ ] Test hours format: 7.50 (2 decimal places)
- [ ] Test with sample data
```

**Verification:**
```bash
# Generate test CSV
rails console
start_date = 1.week.ago
end_date = Date.today
# Call report generation
# Check output format

# Or test via API
curl "http://localhost:3000/api/v1/reports/timesheet?start_date=2025-01-01&end_date=2025-01-31" \
  -b cookies.txt \
  --output test_timesheet.csv

# Verify format
cat test_timesheet.csv | head -3
# Should match sample exactly
```

---

## 📊 PHASE 0 PROGRESS TRACKER

### **Day 1-2: File Cleanup**
- [x] Identify files to delete (documented)
- [ ] Execute deletion commands
- [ ] Verify cleanup successful
- [ ] Commit changes

**Blockers:** None  
**Risk Level:** Low

---

### **Day 2-3: Database Schema**
- [x] Identify schema issues (documented)
- [ ] Remove Job/Staffing models
- [ ] Create cleanup migration
- [ ] Add performance indexes
- [ ] Run migration and verify

**Blockers:** None  
**Risk Level:** Medium (database changes)

---

### **Day 3-4: CSV Export Fix**
- [x] Document required format (done)
- [ ] Update reports controller
- [ ] Test with sample data
- [ ] Verify against sample CSV
- [ ] Deploy fix

**Blockers:** Need completed assignments with hours  
**Risk Level:** Low

---

### **Day 4-5: Verification & Testing**
- [ ] Test all API endpoints
- [ ] Verify database integrity
- [ ] Check for broken references
- [ ] Document any issues found
- [ ] Create list for Phase 1

**Blockers:** Previous tasks must be complete  
**Risk Level:** Low

---

## 🚧 KNOWN BLOCKERS

### **Critical Blockers** 🔴
*None currently*

### **Non-Critical Blockers** 🟡
1. **Google Places API Key**
   - Status: Optional for Phase 0
   - Impact: Venue search won't use Google API
   - Workaround: Use cached venues only
   - Resolution: Add API key before Phase 6

---

## 🐛 OPEN ISSUES

### **High Priority Issues**

#### **Issue #1: "Schedule" vs "Assign" Terminology**
- **Status:** Identified, not fixed
- **Location:** `social-catering-ui/src/pages/WorkersPage.tsx`
- **Description:** Button says "Assign" but should say "Schedule"
- **Fix Required:**
  ```typescript
  // Line ~250
  Change: "Assign" → "Schedule"
  Change: "Assign to Events" → "Schedule Worker"
  
  // Modal title
  Change: "Assign {name} to Shifts" → "Schedule {name} for Shifts"
  
  // Submit button
  Change: "Assign to X Shifts" → "Schedule for X Shifts"
  ```
- **Estimated Time:** 15 minutes
- **Priority:** High (user-facing terminology)

#### **Issue #2: Events Tab Filtering**
- **Status:** Implemented, needs verification
- **Location:** `app/controllers/api/v1/events_controller.rb`
- **Description:** Need to verify tab filtering works correctly
- **Test Required:**
  ```bash
  # Test each tab
  curl "http://localhost:3000/api/v1/events?tab=draft" -b cookies.txt
  curl "http://localhost:3000/api/v1/events?tab=active" -b cookies.txt
  curl "http://localhost:3000/api/v1/events?tab=past" -b cookies.txt
  
  # Verify counts match database
  rails console
  Event.draft.count
  Event.published.joins(:event_schedule).where('event_schedules.start_time_utc > ?', Time.current).count
  Event.completed.count
  ```
- **Estimated Time:** 30 minutes
- **Priority:** High (core functionality)

#### **Issue #3: Conflict Detection Verification**
- **Status:** Implemented, needs testing
- **Location:** `app/services/assign_worker_to_shift.rb`
- **Description:** Need to verify overlapping shift detection
- **Test Cases:**
  ```ruby
  # Test case 1: Overlapping shifts (should conflict)
  Worker A: Shift 2-6pm
  Assign to: Shift 4-8pm → EXPECT: Conflict error
  
  # Test case 2: Adjacent shifts (should succeed)
  Worker A: Shift 2-6pm
  Assign to: Shift 6-10pm → EXPECT: Success
  
  # Test case 3: Non-overlapping (should succeed)
  Worker A: Shift 2-6pm
  Assign to: Shift 7-10pm → EXPECT: Success
  ```
- **Estimated Time:** 1 hour
- **Priority:** High (data integrity)

### **Medium Priority Issues**

#### **Issue #4: Break Deduction Logic**
- **Status:** Implemented, needs verification
- **Description:** Verify break is properly deducted from hours
- **Formula:** `(end_time - start_time) - (break_minutes / 60.0)`
- **Test Cases:**
  ```ruby
  # Shift: 8:00 AM - 4:00 PM (8 hours)
  # Break: 30 minutes (0.5 hours)
  # Expected: 7.5 hours
  
  # Shift: 6:00 PM - 11:00 PM (5 hours)
  # Break: 30 minutes (0.5 hours)
  # Expected: 4.5 hours
  ```
- **Estimated Time:** 30 minutes
- **Priority:** Medium (affects payroll)

#### **Issue #5: Venue Google API Integration**
- **Status:** Backend ready, frontend not integrated
- **Description:** Search only returns cached venues
- **Future Enhancement:** Fallback to Google API if not in cache
- **Estimated Time:** 2-3 hours
- **Priority:** Medium (nice to have for MVP)

---

## 📅 UPCOMING PHASES

### **Phase 1: Seed Realistic Data** (2-3 days)
**Status:** Not Started  
**Dependencies:** Phase 0 complete

**Objectives:**
- Create comprehensive seed file
- Seed 25 workers with realistic names/skills
- Seed 10 Tallahassee venues
- Seed 15 events (5 draft, 5 active, 5 past)
- Generate 40+ shifts
- Create 60+ assignments with hours

**Key Deliverables:**
- `db/seeds.rb` with realistic data
- Seeded local database
- Verification checklist

---

### **Phase 2: Events Page Audit** (3-4 days)
**Status:** Not Started  
**Dependencies:** Phase 1 complete

**Objectives:**
- Test backend event controller endpoints
- Test frontend Draft/Active/Past tabs
- Verify event creation/editing workflow
- Test publish workflow (shift generation)
- Test inline worker assignment
- Verify conflict detection

**Critical Tests:**
- [ ] Draft tab shows only draft events
- [ ] Active tab shows only upcoming published events
- [ ] Past tab shows only completed events
- [ ] Filters work (All/Needs Workers/Partial/Ready)
- [ ] Event publish generates correct number of shifts
- [ ] Worker assignment modal opens correctly
- [ ] Conflict detection prevents double-booking
- [ ] Hours display correctly in Past tab

---

### **Phase 3: Workers Page Audit** (2-3 days)
**Status:** Not Started  
**Dependencies:** Phase 2 complete

**Objectives:**
- Test workers CRUD operations
- Test skills management
- Test bulk "Schedule Worker" feature
- Verify conflict detection in bulk assignment
- Test worker detail page

**Critical Tests:**
- [ ] Can create worker with skills
- [ ] Can edit worker
- [ ] "Schedule" button opens modal
- [ ] Modal shows only shifts matching worker skills
- [ ] Can select multiple shifts
- [ ] Conflict detection works in bulk mode
- [ ] Success message shows after assignment

---

### **Phase 4: Dashboard Audit** (2 days)
**Status:** Not Started  
**Dependencies:** Phase 3 complete

**Objectives:**
- Test stats card accuracy
- Test calendar functionality
- Test urgent events list
- Verify navigation links

**Critical Tests:**
- [ ] Stats show accurate counts
- [ ] Calendar shows events for current month
- [ ] Urgent events list shows unfilled events
- [ ] Click stats navigates to filtered views
- [ ] Click calendar day shows events

---

### **Phase 5: Reports Audit** (2-3 days)
**Status:** Not Started  
**Dependencies:** Phase 4 complete

**Objectives:**
- Verify CSV export format matches sample
- Test date range filters
- Test worker/event filters
- Verify hours calculation
- Test payroll export

**Critical Tests:**
- [ ] Timesheet headers match sample EXACTLY
- [ ] Date format: MM/DD/YYYY
- [ ] Time format: HH:MM AM/PM
- [ ] Break format: 0.5 (decimal)
- [ ] Hours format: 7.50 (2 decimals)
- [ ] Payroll includes rate and total pay
- [ ] CSV opens correctly in Excel/Google Sheets

---

### **Phase 6: Polish & Deploy** (3-5 days)
**Status:** Not Started  
**Dependencies:** Phase 5 complete

**Objectives:**
- Add loading states everywhere
- Improve error handling
- Polish empty states
- Optimize performance
- Deploy to Heroku staging
- User acceptance testing

**Key Deliverables:**
- All loading spinners working
- All errors handled gracefully
- Responsive on mobile/tablet/desktop
- Deployed to Heroku staging
- UAT feedback collected

---

## 🎯 SUCCESS CRITERIA

### **Phase 0 Success Criteria**
- [ ] All irrelevant files deleted (verified with git status)
- [ ] No Job/Staffing model references (verified with grep)
- [ ] All database indexes added (verified in pgAdmin)
- [ ] CSV headers match sample (verified with test export)
- [ ] No broken references in codebase
- [ ] All migrations run successfully
- [ ] Database integrity verified

---

## 📊 METRICS & KPIs

### **Development Velocity**
- **Target:** 1 phase per week
- **Current:** Phase 0 (Day 0 of 5)
- **Burn Rate:** On track

### **Code Quality**
- **Backend:** No deprecated aliases remaining
- **Frontend:** Consistent naming (Event, Assignment)
- **Database:** All foreign keys properly constrained
- **Tests:** Manual testing documented

### **Technical Debt**
- **High Priority:** 3 items (CSV format, terminology, conflict detection)
- **Medium Priority:** 2 items (break logic, venue API)
- **Low Priority:** 0 items
- **Total:** 5 open issues

---

## 🚀 DEPLOYMENT PIPELINE

### **Local Development** ✅
**Current Stage**  
**Status:** Active

**Checklist:**
- [x] Rails server running (port 3000)
- [x] Frontend dev server running (port 5173)
- [x] PostgreSQL running
- [x] Database seeded
- [ ] All tests passing
- [ ] No console errors

---

### **Heroku Staging** 🔄
**Next Stage**  
**Target Date:** End of Phase 6

**Prerequisites:**
- [ ] Phase 0-5 complete
- [ ] All critical bugs fixed
- [ ] CSV export verified
- [ ] Realistic seed data in place
- [ ] Environment variables configured

**Deployment Steps:**
```bash
# 1. Create Heroku app
heroku create sc-mvp-staging --region us

# 2. Add PostgreSQL
heroku addons:create heroku-postgresql:mini -a sc-mvp-staging

# 3. Set environment variables
heroku config:set RAILS_ENV=production -a sc-mvp-staging
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key) -a sc-mvp-staging
heroku config:set SECRET_KEY_BASE=$(rails secret) -a sc-mvp-staging

# 4. Deploy
git push heroku main

# 5. Run migrations and seeds
heroku run rails db:migrate -a sc-mvp-staging
heroku run rails db:seed -a sc-mvp-staging

# 6. Verify deployment
curl https://sc-mvp-staging.herokuapp.com/healthz
```

---

### **Heroku Production** 📅
**Future Stage**  
**Target Date:** After successful staging testing

**Prerequisites:**
- [ ] Staging tested for 1 week
- [ ] All UAT feedback addressed
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Backup strategy defined

**Setup:**
```bash
# 1. Create production app
heroku create sc-mvp-production --region us

# 2. Add PostgreSQL with backups
heroku addons:create heroku-postgresql:standard-0 -a sc-mvp-production

# 3. Configure daily backups
heroku pg:backups:schedule --at '02:00 America/New_York' -a sc-mvp-production

# 4. Deploy and verify
git push heroku main
heroku run rails db:migrate -a sc-mvp-production
heroku run rails db:seed -a sc-mvp-production
```

---

## 📝 DAILY STANDUP TEMPLATE

### **Today's Focus**
*What are you working on today?*

### **Progress Since Yesterday**
*What did you complete?*

### **Blockers**
*What's preventing progress?*

### **Tomorrow's Plan**
*What's next?*

---

## 🔄 WEEKLY REVIEW TEMPLATE

### **Week of [DATE]**

**Phase Progress:**
- Current Phase: Phase X
- Days Completed: X/Y
- Percentage: X%

**Completed Tasks:**
- [x] Task 1
- [x] Task 2

**Open Issues:**
- [ ] Issue 1 (Priority: High)
- [ ] Issue 2 (Priority: Medium)

**Blockers Resolved:**
- Blocker 1: [How it was resolved]

**New Blockers:**
- None / [Description]

**Next Week's Goals:**
1. Goal 1
2. Goal 2
3. Goal 3

---

## 🎓 LESSONS LEARNED

### **Technical Decisions**

#### **✅ What Worked Well**
1. **Unified Events Page**: Merging Staffing into Events simplified navigation
2. **Bulk Assignment**: "Schedule Worker" feature is intuitive
3. **Skills-based Filtering**: JSONB column with GIN index performs well
4. **Venue Caching**: Google Places + local cache reduces API costs
5. **Realistic Seed Data**: Tallahassee venues make demos feel real

#### **⚠️ What Could Be Improved**
1. **Job/Staffing Aliases**: Should have removed earlier to avoid confusion
2. **Test Coverage**: Should have added automated tests from start
3. **Documentation**: Should have created context files sooner
4. **File Cleanup**: Should have cleaned up test files more regularly

#### **🚫 What Didn't Work**
1. **Separate Staffing Page**: Too confusing to have two places for assignments
2. **Multiple Seed Files**: Having 4+ seed files caused confusion

---

## 🔮 FUTURE ENHANCEMENTS (Post-MVP)

### **Phase 7+: Advanced Features**
- [ ] CSV import (workers and shifts)
- [ ] Worker reliability score
- [ ] Saved views/filters
- [ ] Email notifications
- [ ] SMS reminders
- [ ] Mobile app (React Native)
- [ ] Automated scheduling suggestions
- [ ] Integration with accounting software
- [ ] Multi-tenant support
- [ ] Advanced reporting (charts, graphs)

---

## 🆘 ESCALATION PATHS

### **Technical Issues**
1. **Search Documentation** (implementation_context.md, project_config.md)
2. **Check Debugging Tips** (implementation_context.md)
3. **Review Code Examples** (project_config.md)
4. **Consult External Resources** (Rails Guides, React Docs)
5. **Ask for Help** (Team, Stack Overflow, AI Assistant)

### **Blocker Resolution**
1. **Document the blocker** (add to Open Issues)
2. **Assess impact** (Critical/High/Medium/Low)
3. **Find workaround** (if possible)
4. **Escalate if needed** (to tech lead/product owner)
5. **Update status** (when resolved)

---

## 📞 TEAM COMMUNICATION

### **Status Updates**
- **Daily:** Update workflow_state.md
- **Weekly:** Review progress and adjust timeline
- **Monthly:** Retrospective and planning

### **Documentation Updates**
- **implementation_context.md:** Update when features change
- **workflow_state.md:** Update daily with progress
- **project_config.md:** Update when tech stack changes

---

## 🎯 CURRENT SPRINT GOALS

### **Sprint: Phase 0 Cleanup** (5 Days)

**Goal 1: Clean Codebase** ✅ 0% Complete
- [ ] Delete all irrelevant files
- [ ] Remove deprecated models
- [ ] Verify no broken references

**Goal 2: Optimize Database** ✅ 0% Complete
- [ ] Add missing indexes
- [ ] Verify foreign key constraints
- [ ] Test query performance

**Goal 3: Fix Critical Issues** ✅ 0% Complete
- [ ] Fix CSV export format
- [ ] Fix "Schedule" terminology
- [ ] Verify tab filtering

**Sprint Success Criteria:**
- All files cleaned up
- All indexes added
- All critical issues fixed
- Database integrity verified
- Ready for Phase 1 seed data

---

## 📈 PROGRESS VISUALIZATION

```
Phase 0: Cleanup & Restructure       [░░░░░░░░░░] 0%
Phase 1: Seed Realistic Data         [░░░░░░░░░░] 0%
Phase 2: Events Page Audit           [░░░░░░░░░░] 0%
Phase 3: Workers Page Audit          [░░░░░░░░░░] 0%
Phase 4: Dashboard Audit             [░░░░░░░░░░] 0%
Phase 5: Reports Audit               [░░░░░░░░░░] 0%
Phase 6: Polish & Deploy             [░░░░░░░░░░] 0%

Overall Progress:                    [█░░░░░░░░░] 15%
(Initial setup and documentation complete)
```

---

## 🏁 PHASE COMPLETION CHECKLIST

### **Phase 0 Exit Criteria**
- [ ] All irrelevant files deleted
- [ ] Job/Staffing models removed
- [ ] All database indexes added
- [ ] CSV export format verified
- [ ] "Schedule" terminology fixed
- [ ] Tab filtering tested
- [ ] Conflict detection verified
- [ ] Database integrity checked
- [ ] Documentation updated
- [ ] Ready for Phase 1

**Sign-off:** ____________  
**Date:** ____________

---

**END OF WORKFLOW STATE**