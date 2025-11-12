# Approval Modal - Complete Status Logic & Design

## 📊 Status Determination Logic

### `getStatusValue()` Function
**Location:** `ApprovalModal.tsx` lines 1399-1424

**Priority Order:**
1. **Edited Status** (if user is editing) → Use `editedValues[assignmentId].status`
2. **Cancelled/Removed** → Return `'denied'` (overrides approved flag)
3. **No Show** → Return `'no_show'`
4. **Approved Flag** → Return `'approved'` (only if status is not cancelled/removed/no_show)
5. **Default** → Return `'pending'`

```typescript
const getStatusValue = (assignment: AssignmentForApproval): string => {
  const edited = editedValues[assignment.id];
  
  // 1. If edited, use edited status
  if (edited?.status) {
    return edited.status;
  }
  
  // 2. Check status first (cancelled/removed/no_show override approved flag)
  if (assignment.status === 'cancelled' || assignment.status === 'removed') {
    return 'denied';
  }
  if (assignment.status === 'no_show') {
    return 'no_show';
  }
  
  // 3. If approved flag is true and status is not cancelled/removed/no_show
  if (assignment.approved) {
    return 'approved';
  }
  
  // 4. Default to pending
  return 'pending';
};
```

---

## 🎯 Action Menu Logic (Desktop & Mobile)

### Menu Items Based on Current Status

**Location:** `ApprovalModal.tsx` lines 2179-2235 (Desktop), 1170-1267 (Mobile)

#### **If Status = "no_show":**
- ✅ **Only shows:** "Cancel No Show"
- Icon: `XCircle` (red)
- Color: `text-red-600`, `hover:bg-red-50`

#### **If Status = "approved":**
- ✅ **Shows:** "Reject" + "Unapprove"
- **Reject:**
  - Icon: `Ban` (gray)
  - Color: `text-gray-600`, `hover:bg-gray-50`
- **Unapprove:**
  - Icon: `Clock` (amber)
  - Color: `text-amber-600`, `hover:bg-amber-50`

#### **If Status = "pending" or "denied":**
- ✅ **Shows:** "Approve" + "Reject"
- **Approve:**
  - Icon: `CheckCircle` (green)
  - Color: `text-green-600`, `hover:bg-green-50`
- **Reject:**
  - Icon: `Ban` (gray)
  - Color: `text-gray-600`, `hover:bg-gray-50`

---

## 🔄 Status Change Handler Logic

### `handleStatusChange()` Function
**Location:** `ApprovalModal.tsx` lines 1557-1664

### Action Flow:

#### 1. **"Cancel No Show"** (`cancel_no_show`)
```typescript
// Restore from no_show to assigned/pending
1. Calculate hours from Time In/Time Out
2. Call: PATCH /approvals/:id/update_hours
   - Backend restores status from 'no_show' → 'assigned'
   - Sets hours_worked to calculated value
3. Reload assignments
4. Show success toast
```

#### 2. **"Approve"** (`approved`)
```typescript
// Two-step process if assignment was no_show/cancelled/removed:
1. If status is 'no_show'/'cancelled'/'removed':
   a. Calculate hours from Time In/Time Out
   b. Call: PATCH /approvals/:id/update_hours
      - Restores status to 'assigned'
      - Sets hours_worked
2. Call: POST /events/:event_id/approve_selected
   - Sets approved = true
   - Sets approved_by_id, approved_at_utc
3. Reload assignments
4. Show success toast
```

#### 3. **"Reject"** (`denied`)
```typescript
// Remove/deny the assignment
1. Call: DELETE /approvals/:id/remove
   - Backend sets status = 'cancelled'
   - Sets hours_worked = 0
   - Sets approved_by_id, approved_at_utc (for audit)
2. Reload assignments
3. Show success toast
```

#### 4. **"Unapprove"** (`pending`)
```typescript
// Un-approve by updating hours (resets approved flag)
1. Calculate hours from current Time In/Time Out
2. Call: PATCH /approvals/:id/update_hours
   - Backend un-approves (sets approved = false)
   - Updates hours_worked
3. Reload assignments
4. Show success toast
```

---

## 🎨 Status Badge Design

### Desktop Table View
**Location:** `ApprovalModal.tsx` lines 2667-2693

| Status | Badge Design | Icon | Colors |
|--------|-------------|------|--------|
| **Approved** | `bg-green-100 text-green-700` | `CheckCircle` (green) | Green |
| **Pending** | `bg-amber-100 text-amber-700` | `Clock` (amber) | Amber |
| **No Show** | `bg-red-100 text-red-700` | `XCircle` (red) | Red |
| **Denied** | `bg-gray-100 text-gray-700` | `Ban` (gray) | Gray |

**Code:**
```tsx
{currentStatus === 'approved' && (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
    <CheckCircle className="h-3.5 w-3.5" />
    Approved
  </span>
)}
{currentStatus === 'pending' && (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
    <Clock className="h-3.5 w-3.5" />
    Pending
  </span>
)}
{currentStatus === 'no_show' && (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
    <XCircle className="h-3.5 w-3.5" />
    No Show
  </span>
)}
{currentStatus === 'denied' && (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
    <Ban className="h-3.5 w-3.5" />
    Denied
  </span>
)}
```

### Mobile Card View
**Location:** `ApprovalModal.tsx` lines 1021-1026

Same badge design, but in card header:
```tsx
{currentStatus === 'denied' && (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
    <Ban className="h-3 w-3" />
    Denied
  </span>
)}
```

---

## 🎛️ Action Menu Design

### Desktop (3-Dot Menu)
**Location:** `ApprovalModal.tsx` lines 2250-2322

**Trigger Button:**
- Icon: `MoreVertical` (3 vertical dots)
- Style: `p-1.5 rounded`, gray hover
- Position: Fixed to escape modal overflow

**Menu Dropdown:**
- Width: `w-56` (224px)
- Style: `bg-white rounded-lg shadow-lg border border-gray-200`
- Position: Fixed (calculated from button position)
- Z-index: `z-[101]` (above modal backdrop)

**Menu Items:**
- Full width buttons
- Icon + Label layout
- Hover states: `hover:bg-gray-50`
- Loading state: Spinner when `changingStatus === assignmentId`
- Disabled state: `opacity-40 cursor-not-allowed`

### Mobile (Expandable Card)
**Location:** `ApprovalModal.tsx` lines 1168-1268

**Trigger:**
- Button: "Change Status" with chevron
- Expands to show action menu

**Menu Items:**
- Full width buttons
- Larger touch targets: `px-4 py-3`
- Border between items: `border-t`
- Same icon + label layout as desktop

---

## 📐 Hours Calculation Logic

### `calculateHours()` Function
**Location:** `ApprovalModal.tsx` lines 1515-1540

**Rules:**
1. **No-show or Denied** → Always return `'0.00'`
2. **Other statuses** → Calculate: `(Time Out - Time In - Break) / 3600`
3. **Minimum:** `0.00` (can't be negative)

```typescript
const calculateHours = (
  timeIn: string, 
  timeOut: string, 
  breakMinutes: number,
  status: string
): string => {
  // No-show and denied = 0 hours
  if (status === 'no_show' || status === 'denied') {
    return '0.00';
  }
  
  // Calculate: (end - start - break) / 3600
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const breakHours = breakMinutes / 60;
  
  return Math.max(0, durationHours - breakHours).toFixed(2);
};
```

---

## 🔄 Complete Status Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    ASSIGNMENT STATUS                     │
└─────────────────────────────────────────────────────────┘

Initial State: PENDING
├─ Action: "Approve"
│  └─→ Status: APPROVED
│     ├─ Action: "Unapprove"
│     │  └─→ Status: PENDING
│     └─ Action: "Reject"
│        └─→ Status: DENIED (cancelled)
│
├─ Action: "Reject"
│  └─→ Status: DENIED (cancelled)
│     └─ Action: "Approve"
│        ├─ Step 1: Restore (update_hours) → assigned
│        └─ Step 2: Approve → APPROVED
│
└─ Action: "Mark No Show" (via other flow)
   └─→ Status: NO_SHOW
      └─ Action: "Cancel No Show"
         └─→ Status: PENDING (assigned)
            └─ Can then Approve or Reject
```

---

## 🎨 Color Scheme

| Status | Background | Text | Icon | Hover |
|--------|-----------|------|------|-------|
| **Approved** | `bg-green-100` | `text-green-700` | Green `CheckCircle` | `hover:bg-green-50` |
| **Pending** | `bg-amber-100` | `text-amber-700` | Amber `Clock` | `hover:bg-amber-50` |
| **No Show** | `bg-red-100` | `text-red-700` | Red `XCircle` | `hover:bg-red-50` |
| **Denied** | `bg-gray-100` | `text-gray-700` | Gray `Ban` | `hover:bg-gray-50` |

---

## 🔍 Key Design Decisions

1. **Status Priority:** Status field (`cancelled`/`removed`/`no_show`) overrides `approved` flag
2. **Context-Aware Menu:** Only shows relevant actions based on current status
3. **No-Show Special Case:** Only shows "Cancel No Show" when status is no_show
4. **Immediate Save:** All status changes save immediately (no "Save" button needed)
5. **Loading States:** Shows spinner during API calls to prevent double-clicks
6. **Fixed Positioning:** Menu uses fixed positioning to escape modal overflow
7. **Mobile Responsive:** Card-based layout on mobile, table on desktop

---

## 📱 Mobile vs Desktop Differences

| Feature | Desktop | Mobile |
|---------|---------|--------|
| **Layout** | Table with columns | Expandable cards |
| **Action Menu** | 3-dot menu (fixed position) | Expandable dropdown in card |
| **Touch Targets** | `px-4 py-2` | `px-4 py-3` (larger) |
| **Status Badge** | In table cell | In card header |
| **Menu Width** | `w-56` (224px) | Full width of card |

---

## 🚀 API Endpoints Used

1. **Approve:** `POST /events/:event_id/approve_selected`
2. **Reject:** `DELETE /approvals/:id/remove`
3. **No Show:** `POST /approvals/:id/mark_no_show`
4. **Update Hours (Restore/Unapprove):** `PATCH /approvals/:id/update_hours`
5. **Load Assignments:** `GET /events/:event_id/approvals`

---

## ✅ Testing Checklist

- [ ] Pending → Approve → Shows "Approved" badge
- [ ] Approved → Unapprove → Shows "Pending" badge
- [ ] Pending → Reject → Shows "Denied" badge
- [ ] No Show → Cancel No Show → Shows "Pending" badge
- [ ] Denied → Approve → Restores then approves → Shows "Approved" badge
- [ ] Mobile: All actions work in card view
- [ ] Desktop: All actions work in table view
- [ ] Loading states show during API calls
- [ ] Status badges update immediately after action
- [ ] Hours calculate correctly (0 for denied/no-show)

