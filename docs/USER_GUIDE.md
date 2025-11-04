# Social Catering MVP - User Guide

**Purpose:** End-user instructions for the Social Catering MVP application  
**Audience:** Operations team (Natalie, Madison, Sarah) and administrators  
**Last Updated:** November 2025

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Workers](#managing-workers)
5. [Managing Events](#managing-events)
6. [Creating Assignments](#creating-assignments)
7. [Understanding Conflict Warnings](#understanding-conflict-warnings)
8. [Activity Logs](#activity-logs)
9. [Reports](#reports)
10. [Common Workflows](#common-workflows)
11. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## 👋 Introduction

### What is Social Catering MVP?

Social Catering MVP is a workforce management system designed to help you:
- **Create and manage events** with specific skill requirements
- **Assign workers to shifts** based on their skills and certifications
- **Track hours and generate payroll reports**
- **Avoid scheduling conflicts** with automatic conflict detection

### Who Should Use This Guide?

This guide is for:
- **Operations team members** (Natalie, Madison, Sarah)
- **Administrators** managing the workforce scheduling system
- **Anyone** responsible for assigning workers to events

### How to Access the Application

**Production URL:** https://sc-mvp-production-6b7a268cc8ad.herokuapp.com  
**Staging URL:** https://sc-mvp-staging.herokuapp.com

**Note:** Use production for daily operations. Staging is for testing.

---

## 🚀 Getting Started

### Login Instructions

1. **Navigate to the application URL** (see above)
2. **Enter your email and password:**
   - Email: `gravyadmin@socialcatering.com`
   - Password: `gravyadmin@sc_mvp`
   
   Or use admin accounts:
   - `natalie@socialcatering.com` / `natalie@sc`
   - `madison@socialcatering.com` / `madison@sc`
   - `sarah@socialcatering.com` / `sarah@sc`

3. **Click "Sign In"**

**If you forget your password:** Contact your system administrator.

### Dashboard Overview

After logging in, you'll see the **Dashboard** with:

- **Active Events** - Events currently accepting worker assignments
- **Unfilled Roles** - Events that need more workers
- **Priority Staffing Queue** - Events requiring immediate attention
- **Completed Events** - Past events with full staffing
- **Calendar View** - Monthly calendar showing event dates

**Navigation:**
- Click **Dashboard** to return to the main view
- Click **Events** to view all events
- Click **Workers** to manage workers
- Click **Reports** to generate timesheets and payroll
- Click **Activity Log** to view system audit trail

---

## 👥 Managing Workers

### How to Add a New Worker

1. **Navigate to Workers page** (click "Workers" in the sidebar)
2. **Click "Add Worker"** button (top right)
3. **Fill in Worker Details:**
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required, must be unique)
   - **Phone** (required, 10-15 digits only, no hyphens)
   - **Address** (optional)
4. **Click "Continue"**
5. **Add Skills:**
   - Click "Add Skill" dropdown
   - Select skills the worker has (e.g., "Bartender", "Server", "Event Helper")
   - Skills can be added multiple times
6. **Add Certifications (optional):**
   - Click "Add Certification" dropdown
   - Select certification type (e.g., "Food Handler", "ServSafe")
   - Enter expiration date (if applicable)
7. **Click "Create Worker"**

**Note:** Workers must have at least one skill to be assigned to shifts.

### How to Search for Workers

**On the Workers page:**

1. **Use the search bar** at the top
2. **Enter search terms:**
   - Worker name (first or last name)
   - Email address
   - Phone number
   - Skill name (e.g., "Bartender")
   - Certification name (e.g., "Food Handler")

3. **Results update automatically** as you type

**Search Tips:**
- Search is case-insensitive
- You can search by partial names (e.g., "Alex" finds "Alex Williams")
- Skills are highlighted in the results

### How to Edit Worker Details

1. **Navigate to Workers page**
2. **Click on a worker's name** to view their profile
3. **Click "Edit" button** (top right)
4. **Update any fields:**
   - Name, email, phone
   - Skills (add/remove)
   - Certifications (add/remove/update expiry)
5. **Click "Update Worker"** to save

### How to View Worker Status

**On the Worker Profile page:**

- **Active Status:** Green checkmark = Active, Red X = Inactive
- **Skills:** List of all skills the worker has
- **Certifications:** List of certifications with expiration dates
- **Upcoming Assignments:** Shifts the worker is assigned to
- **Past Assignments:** Completed shifts

**To Deactivate a Worker:**
1. Go to worker profile
2. Click "Deactivate" button
3. Confirm deactivation

**Note:** Inactive workers won't appear in assignment lists but can still be viewed.

---

## 🎉 Managing Events

### How to Create an Event

1. **Navigate to Events page** (click "Events" in sidebar)
2. **Click "Create Event"** button
3. **Fill in Event Details:**
   - **Event Name** (e.g., "Wedding Reception")
   - **Venue** - Search for venue using Google Places or enter manually
   - **Date** - Select event date
   - **Start Time** - Event start time (e.g., 4:00 PM)
   - **End Time** - Event end time (e.g., 9:00 PM)
4. **Add Required Workers:**
   - Click "Add Role" for each role needed
   - Select role/skill (e.g., "Bartender", "Server")
   - Enter number of workers needed
   - Set pay rate per hour (e.g., $15.00)
   - Add certification requirement (optional)
5. **Review Summary** - Check all details
6. **Click "Save as Draft"** or **"Publish Event"**

**Publish vs. Draft:**
- **Draft:** Event is saved but not yet available for assignments
- **Publish:** Event is created and shifts are immediately available for worker assignments

### How to Edit an Event

**For Draft Events:**
1. Go to Events page → **Draft** tab
2. Click on the event card
3. Click "Edit" button
4. Make changes and click "Save"

**For Published Events:**
1. Go to Events page → **Active** tab
2. Click on the event card
3. Click "Edit" button (⚙️ icon) next to the trash icon
4. **Note:** You can only edit:
   - Number of workers needed per role
   - Add new roles
   - Remove empty roles (if no workers assigned)
5. Click "Save" to update

**⚠️ Important:** You cannot remove roles that already have workers assigned unless you unassign them first.

### How to View Event Details

1. **Navigate to Events page**
2. **Click on an event card** to view details
3. **Event Details show:**
   - Event name, venue, date, time
   - Total roles needed vs. filled
   - Breakdown by role (e.g., "3/5 Bartenders assigned")
   - List of assigned workers per role
   - Pay rates for each role

### How to Delete an Event

1. **Navigate to Events page**
2. **Click on the event card**
3. **Click trash icon** (🗑️) in the top right
4. **Confirm deletion** in the popup

**⚠️ Warning:** Deleting an event will:
- Cancel all worker assignments
- Move the event to "Deleted" status
- This action cannot be undone

---

## 🔗 Creating Assignments

### Assign Single Worker to Single Shift

**Method 1: From Event Card**
1. Go to Events page → **Active** tab
2. Click on an event card
3. Find the role that needs workers
4. Click **"Assign Worker"** button next to the role
5. **Select a worker** from the list
6. **Review pay rate** (default from event, can be customized)
7. Click **"Assign"**

**Method 2: From Workers Page**
1. Go to Workers page
2. Click on a worker's name
3. Click **"Schedule Worker"** button
4. **Select shifts** to assign the worker to
5. **Set pay rate** for each shift (if different from default)
6. Click **"Schedule"**

### Assign Worker to Multiple Shifts (Bulk Assignment)

**Using Quick Fill:**
1. Go to Events page → **Active** tab
2. Click on an event card
3. Find a role that needs workers
4. Click **"Quick Fill"** button
5. **Select workers** from the list (multiple allowed)
6. **Review pay rates** (default from event, can be customized per worker)
7. Click **"Assign"**

**Result:** System will assign all selected workers to the role, skipping any that have conflicts.

### Understanding Assignment Status

**Assignment Statuses:**
- **Assigned** - Worker is assigned but not yet confirmed
- **Confirmed** - Worker has confirmed they will attend
- **Completed** - Shift is finished, hours tracked
- **Cancelled** - Assignment was cancelled
- **No Show** - Worker did not show up

**How to Update Status:**
1. Go to worker's profile → **Assignments** tab
2. Click on an assignment
3. Update status as needed

---

## ⚠️ Understanding Conflict Warnings

The system automatically detects conflicts when assigning workers. Here's what each warning means:

### 1. Time Overlap Conflict

**Message:** "Worker has conflicting shift 'Event Name' (2:00 PM - 7:00 PM)"

**What it means:** The worker is already assigned to another shift that overlaps with this one.

**Example:**
- Worker is assigned to "Wedding Reception" (2:00 PM - 7:00 PM)
- You try to assign them to "Birthday Party" (4:00 PM - 9:00 PM)
- **Conflict:** Times overlap (4:00 PM - 7:00 PM)

**How to resolve:**
1. Unassign the worker from the conflicting shift first
2. Or assign a different worker to the new shift

### 2. Capacity Conflict

**Message:** "Shift is fully staffed (2 workers)"

**What it means:** The shift already has the maximum number of workers assigned.

**Example:**
- Shift needs 2 Bartenders
- 2 workers are already assigned
- You try to assign a 3rd worker
- **Conflict:** Shift is at capacity

**How to resolve:**
1. Unassign one of the existing workers
2. Or increase the shift capacity (edit event)

### 3. Certification Expired

**Message:** "Worker's Food Handler expires on 10/20/2025, before shift ends 11/15/2025"

**What it means:** The worker's required certification will expire before the shift ends.

**Example:**
- Shift requires "Food Handler" certification
- Worker's certification expires on October 20
- Shift ends on November 15
- **Conflict:** Certification not valid for entire shift

**How to resolve:**
1. Update the worker's certification expiration date
2. Or assign a different worker with a valid certification

### 4. Missing Skill

**Message:** "Worker does not have required skill: Bartender"

**What it means:** The worker doesn't have the skill required for this shift.

**How to resolve:**
1. Add the skill to the worker's profile (edit worker)
2. Or assign a different worker with the required skill

### 5. Worker Inactive

**Message:** "Worker is inactive"

**What it means:** The worker has been deactivated and cannot be assigned.

**How to resolve:**
1. Reactivate the worker (edit worker profile)
2. Or assign a different worker

---

## 📜 Activity Logs

### How to View Activity Logs

1. **Navigate to Activity Log page** (click "Activity Log" in sidebar)
2. **View recent activity:**
   - All actions (create, update, delete, assign, unassign)
   - Who performed the action (admin user)
   - When it happened (timestamp)
   - What changed (before/after values)

### Filtering Activity Logs

**Use filters to narrow down results:**
- **Entity Type:** Worker, Shift, Assignment, Event
- **Action:** Created, Updated, Deleted, Assigned, Unassigned
- **Date Range:** Filter by start and end dates
- **Search:** Search by worker name, event name, etc.

### Understanding Activity Log Entries

**Color-Coded Actions:**
- 🟢 **Green** - Created (new record)
- 🔵 **Blue** - Updated (record modified)
- 🔴 **Red** - Deleted (record removed)
- 🟣 **Purple** - Assigned (worker assigned to shift)
- 🟠 **Orange** - Unassigned (worker removed from shift)

**Example Entry:**
```
🟢 Created | Worker
Alex Williams was created by gravyadmin@socialcatering.com
Nov 4, 2025 at 10:00 AM
```

---

## 📊 Reports

### How to Generate Reports

1. **Navigate to Reports page** (click "Reports" in sidebar)
2. **Select a report type:**
   - **Payroll Summary** - Total hours and pay per worker
   - **Event Summary** - Costs per event
   - **Weekly Timesheet** - Detailed time tracking
   - **Worker Hours Report** - Individual worker breakdown

3. **Click the report card** or **download icon** to generate
4. **CSV file downloads automatically**

### Report Types

#### Payroll Summary Report
**Use for:** Processing payroll payments  
**Shows:**
- Worker name
- Total hours worked
- Total payout amount

**Example:**
```
Worker Name,Total Hours,Total Payout
Alex Williams,25.0,375.00
John Doe,20.0,300.00
```

#### Weekly Timesheet Report
**Use for:** Detailed time tracking  
**Shows:**
- Worker name
- Event name
- Date
- Role
- Hours worked
- Pay rate
- Payout

#### Event Summary Report
**Use for:** Tracking event costs  
**Shows:**
- Event name
- Date
- Workers per event
- Total labor cost

#### Worker Hours Report
**Use for:** Individual worker breakdown  
**Shows:**
- All shifts for specific workers
- Hours per shift
- Total hours and payout

---

## 🔄 Common Workflows

### Weekly Shift Planning Workflow

1. **Monday Morning:**
   - Review upcoming events for the week
   - Check "Unfilled Roles" on Dashboard
   - Identify gaps in staffing

2. **Assign Workers:**
   - Use "Quick Fill" for events needing multiple workers
   - Assign workers to shifts based on skills
   - Review conflict warnings

3. **Confirm Assignments:**
   - Contact workers to confirm availability
   - Update assignment status to "Confirmed"

4. **Monitor Throughout Week:**
   - Check "Priority Staffing Queue" daily
   - Fill any remaining gaps
   - Handle cancellations promptly

### Emergency Worker Replacement

**If a worker cancels:**
1. Go to worker's profile → **Assignments** tab
2. Find the upcoming assignment
3. Click **"Unassign"** or **"Cancel"**
4. Go back to the event
5. Click **"Assign Worker"** for the role
6. Select a replacement worker
7. System will check for conflicts automatically

**If you need to find a replacement:**
1. Go to Workers page
2. Search for workers with the required skill
3. Filter by availability (check their assignments)
4. Assign the replacement worker

### Reviewing Daily Assignments

1. **Go to Dashboard**
2. **Check "Today's Shifts"** section
3. **Review assignments:**
   - Who is assigned to what
   - Which roles are still unfilled
   - Any conflicts or issues

4. **Take action:**
   - Fill any gaps
   - Confirm workers are aware of their assignments
   - Handle any last-minute changes

---

## ❓ FAQ & Troubleshooting

### Frequently Asked Questions

**Q: Can I assign a worker to two shifts at the same time?**  
A: No. The system prevents double-booking. If you try, you'll see a conflict warning.

**Q: What happens if a worker's certification expires?**  
A: The system will prevent assigning them to shifts requiring that certification. Update their certification expiry date to continue assigning them.

**Q: Can I delete a worker who has assignments?**  
A: No. Workers with assignment history cannot be deleted. Instead, deactivate them (set `active=false`).

**Q: How do I change the pay rate for an assignment?**  
A: When assigning a worker, you can customize the pay rate in the assignment modal. The default is the event's pay rate for that role.

**Q: Can I edit an event after it's published?**  
A: Yes, but with limitations:
- You can add more roles or workers needed
- You can remove empty roles (no workers assigned)
- You cannot remove roles with assigned workers (unassign first)

**Q: What if I make a mistake assigning a worker?**  
A: Go to the worker's profile → Assignments tab → Find the assignment → Click "Unassign" or "Cancel".

**Q: How do I see all workers available for a specific shift?**  
A: Click "Assign Worker" on the shift. The list shows only workers who:
- Have the required skill
- Have valid certifications (if required)
- Are active
- Don't have conflicting assignments

**Q: What does "Partial" mean in event status?**  
A: Some roles are filled but not all. The event needs more workers.

**Q: What does "Ready" mean in event status?**  
A: All roles are filled. The event is fully staffed and ready to go.

### Troubleshooting Common Issues

**Problem: Worker not appearing in assignment list**

**Possible causes:**
- Worker is inactive → Check worker status, reactivate if needed
- Worker doesn't have required skill → Add skill to worker profile
- Worker's certification expired → Update certification expiry
- Worker has conflicting assignment → Check their existing assignments

**Solution:** Review the worker's profile and fix any issues above.

---

**Problem: Can't assign worker - conflict warning**

**Solution:**
1. Read the conflict message carefully
2. Identify the conflicting shift
3. Unassign the worker from the conflicting shift first
4. Try assigning again

---

**Problem: Event shows wrong staffing percentage**

**Possible causes:**
- Workers were unassigned but count wasn't updated
- Event was edited but shifts weren't recalculated

**Solution:**
1. Refresh the page
2. Check individual role counts in event details
3. If still wrong, contact support

---

**Problem: Report not downloading**

**Solution:**
1. Check your browser's download settings
2. Try a different browser
3. Check if popup blocker is enabled
4. Contact support if issue persists

---

**Problem: Can't log in**

**Solution:**
1. Verify email and password are correct
2. Check for typos (email is case-sensitive)
3. Try clearing browser cookies
4. Contact administrator to reset password

---

## 📞 Support & Contacts

### Who to Contact for Help

**For Technical Issues:**
- Contact your system administrator
- Check Activity Logs for error details
- Review this user guide

**For Data Questions:**
- Review reports for payroll questions
- Check Activity Logs for audit trail
- Contact operations team lead

### Emergency Procedures

**If the system is down:**
1. Check the health endpoint: `/healthz`
2. Try refreshing the page
3. Wait a few minutes and try again
4. Contact system administrator if issue persists

**If you made a mistake:**
1. Check Activity Logs to see what changed
2. Use "Unassign" or "Cancel" to reverse assignments
3. Edit records to correct information
4. Contact administrator if you need to restore deleted data

---

## 📚 Additional Resources

- **API Documentation:** See `docs/API_DOCUMENTATION.md` for technical details
- **Operations Manual:** See `docs/RUNBOOK.md` for deployment and maintenance
- **Environment Config:** See `docs/ENV_CONFIG.md` for configuration details

---

**Last Updated:** November 2025  
**Version:** 1.0

**Need Help?** Contact your system administrator or refer to the Activity Logs for detailed action history.

