# Assign Workers Button Navigation

## Feature Description
When clicking "Assign Workers" button in the "Priority Staffing Queue" on the Dashboard, it navigates to the Events page with that specific event expanded and ready for worker assignment.

## How It Works

### 1. Dashboard Click Handler
**File:** `social-catering-ui/src/pages/DashboardPage.tsx` (line 330)

```typescript
<UrgentEventsList
  events={urgentEvents}
  onEventClick={(eventId) => navigate(`/events?tab=active&event_id=${eventId}`)}
/>
```

**URL Format:**
```
/events?tab=active&event_id=123
```

### 2. EventsPage Auto-Expansion
**File:** `social-catering-ui/src/pages/EventsPage.tsx` (lines 178-195)

```typescript
// Auto-expand event based on URL parameters
useEffect(() => {
  const eventIdParam = searchParams.get('event_id');
  
  if (eventIdParam) {
    const eventId = parseInt(eventIdParam);
    if (!isNaN(eventId)) {
      // Auto-expand the specific event
      setExpandedEvents(new Set([eventId]));
    }
  }
}, [searchParams]);
```

## User Flow

```
Dashboard Page
  ↓
Priority Staffing Queue
  ↓ User clicks "Assign Workers" button
  ↓
URL changes to: /events?tab=active&event_id=456
  ↓
Events Page loads
  ↓
Event #456 is automatically expanded
  ↓
User can see:
  - Event details (venue, time, date)
  - All roles and shifts
  - Quick Fill button for unfilled roles
  - Individual "Assign Worker" buttons per shift
```

## Implementation Status

✅ **Dashboard navigation** - Correctly passes event_id in URL
✅ **EventsPage auto-expansion** - Automatically expands the event
✅ **Tab routing** - Lands on "active" tab as expected
✅ **No additional code needed** - Already implemented and working

## Features

### 1. Smart Tab Routing (New)
When clicking calendar dates:
- **Past dates** → "Completed" tab (shows historical events)
- **Today/Future dates** → "Active" tab (shows upcoming events)

### 2. Event Auto-Expansion (Existing)
When navigating with event_id parameter:
- Event is automatically expanded
- User can immediately see roles and shift details
- Ready for assigning workers

### 3. Context Preservation
- Maintains tab and filter context
- Shows the right events for the date
- Preserves user's current view settings

## Example Scenario

**User Story:**
> "I see 'FSU Alumni Wedding Reception' needs 4 roles in the Priority Staffing Queue. I click 'Assign Workers' and I immediately see that event expanded with all its roles visible."

**Current Behavior:**
1. ✅ User clicks "Assign Workers" button
2. ✅ Navigates to `/events?tab=active&event_id=123`
3. ✅ Event #123 is auto-expanded
4. ✅ User sees all roles needing workers
5. ✅ User can assign workers immediately

## Testing

1. **From Priority Staffing Queue:**
   - Go to Dashboard
   - Find an event in "Priority Staffing Queue"
   - Click "Assign Workers" button
   - Verify: Lands on Events page with event expanded

2. **From Calendar:**
   - Go to Dashboard
   - Click a past date (e.g., Oct 22, 2025)
   - Verify: Lands on Completed tab with date filter
   - Click a future date (e.g., Nov 5, 2025)
   - Verify: Lands on Active tab with date filter

## Files Involved

1. **DashboardPage.tsx** (line 330)
   - Handles "Assign Workers" button click
   - Navigates with `event_id` parameter

2. **EventsPage.tsx** (lines 178-195)
   - Reads `event_id` from URL
   - Auto-expands the event

3. **DashboardPage.tsx** (lines 246-253)
   - Smart tab routing for calendar clicks
   - Past dates → completed tab
   - Future dates → active tab

## Summary

✅ **Navigation is already working** - No changes needed
✅ **Event auto-expansion is implemented** - Event opens automatically
✅ **Calendar routing is intelligent** - Past/future dates go to correct tab
✅ **Ready for production** - All features functional

---

The "Assign Workers" button navigation works perfectly! Users can click from the Priority Staffing Queue and land directly on the expanded event card in the Events page. 🎉

