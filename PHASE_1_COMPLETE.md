# ✅ PHASE 1 COMPLETE: Database Schema Updates

**Duration:** ~30 minutes  
**Date:** October 17, 2025

---

## 📋 Summary of Changes

### 1. Shifts Table Enhancements
Added columns to link shifts to jobs and track auto-generation:

| Column | Type | Purpose |
|--------|------|---------|
| `job_id` | bigint | Links shift to parent job (nullable for standalone shifts) |
| `job_skill_requirement_id` | bigint | Links to specific skill requirement from job |
| `auto_generated` | boolean | Flag indicating if shift was auto-generated from job publish |
| `required_skill` | string | Cached skill name from job_skill_requirement |
| `uniform_name` | string | Cached uniform requirement from job_skill_requirement |

**Foreign Keys:**
- `job_id` → `jobs.id` (CASCADE on delete)
- `job_skill_requirement_id` → `job_skill_requirements.id` (NULLIFY on delete)

**Indexes:**
- `index_shifts_on_job_id`
- `index_shifts_on_job_skill_requirement_id`
- `index_shifts_on_auto_generated`
- `index_shifts_on_required_skill`

---

### 2. Jobs Table Enhancements
Added columns to track publishing and shift generation status:

| Column | Type | Purpose |
|--------|------|---------|
| `published_at_utc` | timestamptz | Timestamp when job was published (shifts generated) |
| `shifts_generated` | boolean | Flag indicating if shifts have been generated |
| `total_shifts_count` | integer | Cached count of generated shifts |
| `assigned_shifts_count` | integer | Cached count of fully assigned shifts |

**Indexes:**
- `index_jobs_on_status` (already existed)
- `index_jobs_on_published_at_utc`
- `index_jobs_on_shifts_generated`

---

### 3. Assignments Table
Confirmed existing fields:

| Column | Type | Purpose |
|--------|------|---------|
| `hours_worked` | decimal(5,2) | Tracks actual hours worked (for CSV export) |
| `hourly_rate` | decimal(8,2) | Stores hourly pay rate (for reports) |

**Constraints:**
- `assignments_positive_hours`: Ensures `hours_worked` > 0 or NULL

---

## ✅ Verification Results

All checkpoints passed:

### Shift Columns
- ✓ `job_id`
- ✓ `job_skill_requirement_id`
- ✓ `auto_generated`
- ✓ `required_skill`
- ✓ `uniform_name`

### Job Columns
- ✓ `published_at_utc`
- ✓ `shifts_generated`
- ✓ `total_shifts_count`
- ✓ `assigned_shifts_count`

### Assignment Columns
- ✓ `hours_worked` (with validation & DB constraint)
- ✓ `hourly_rate`

### Indexes
- ✓ `index_shifts_on_job_id`
- ✓ `index_shifts_on_job_skill_requirement_id`
- ✓ `index_shifts_on_required_skill`
- ✓ `index_jobs_on_status`
- ✓ `index_jobs_on_published_at_utc`
- ✓ `index_jobs_on_shifts_generated`

### Constraints
- ✓ `assignments_positive_hours` (tested with both model validation and DB constraint)

---

## 🔧 Migrations Applied

1. **20251017110944_add_job_id_to_shifts.rb**
   - Added job relationship and metadata columns to shifts

2. **20251017111020_add_publishing_fields_to_jobs.rb**
   - Added publishing tracking fields to jobs

3. **20251017111118_rename_job_shift_count_fields.rb**
   - Renamed `shifts_count` → `total_shifts_count`
   - Renamed `filled_shifts_count` → `assigned_shifts_count`

---

## 📊 Database State After Phase 1

### Shifts Table Structure
```sql
CREATE TABLE shifts (
  -- Original columns
  id, client_name, role_needed, location, 
  start_time_utc, end_time_utc, pay_rate, 
  capacity, status, notes, created_by_id,
  required_cert_id, location_id,
  created_at, updated_at,
  
  -- NEW: Job integration
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  job_skill_requirement_id BIGINT REFERENCES job_skill_requirements(id) ON DELETE NULLIFY,
  auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  required_skill VARCHAR,
  uniform_name VARCHAR
);
```

### Jobs Table Structure
```sql
CREATE TABLE jobs (
  -- Original columns
  id, title, status, venue_id,
  check_in_instructions, supervisor_name, supervisor_phone,
  created_at_utc, updated_at_utc,
  
  -- NEW: Publishing tracking
  published_at_utc TIMESTAMPTZ,
  shifts_generated BOOLEAN NOT NULL DEFAULT FALSE,
  total_shifts_count INTEGER NOT NULL DEFAULT 0,
  assigned_shifts_count INTEGER NOT NULL DEFAULT 0
);
```

### Assignments Table Structure
```sql
CREATE TABLE assignments (
  -- Original columns
  id, shift_id, worker_id, assigned_by_id,
  assigned_at_utc, status,
  created_at, updated_at,
  
  -- Existing: Export fields
  hours_worked DECIMAL(5,2) CHECK (hours_worked IS NULL OR hours_worked > 0),
  hourly_rate DECIMAL(8,2)
);
```

---

## 🎯 Key Features Enabled

1. **Job → Shift Relationship**
   - Jobs can now generate multiple shifts
   - Shifts can be standalone OR linked to a job
   - Cascade delete: Deleting a job removes its shifts

2. **Publishing Workflow**
   - Track when jobs are published
   - Track if shifts have been generated
   - Cache shift counts for performance

3. **Shift Metadata**
   - Track which shifts were auto-generated
   - Cache required skill and uniform from job
   - Link back to specific skill requirement

4. **CSV Export Support**
   - `hours_worked` and `hourly_rate` ready for weekly CSV exports
   - Both model validation and DB constraint ensure data integrity

---

## 🚀 Next Steps: PHASE 2

With the schema updated, you're ready to:

1. **Update Models** (Job, Shift, Assignment)
   - Add associations
   - Add callbacks for counter caching
   - Add scopes for filtering

2. **Create Publishing Service**
   - `JobPublishingService.call(job)`
   - Auto-generate shifts from job skill requirements
   - Update job status and counters

3. **Update Controllers**
   - Add publish endpoint to JobsController
   - Enhance shifts index to filter by job_id
   - Add CSV export endpoint

4. **Update Frontend**
   - Show "Published" badge on jobs
   - Add staffing progress indicators
   - Add "View Shifts" button linking to assignments

---

## 📝 Notes

- All migrations are reversible
- No data loss (all new columns are nullable or have defaults)
- Foreign keys include proper `on_delete` behavior
- Indexes added for performance on common queries
- Constraints verified with both model and DB-level tests

**Status:** ✅ **PHASE 1 COMPLETE AND VERIFIED**

