# RESPONSIVE DESIGN AUDIT
Date: 2025-11-06

## Pages to Audit

### Dashboard (/)
- [ ] Event cards stack vertically on mobile
- [ ] Stats cards stack vertically on mobile
- [ ] Charts/graphs adapt to mobile width
- [ ] Navigation accessible on mobile
- [ ] Touch targets minimum 44px x 44px

### Events Page (/events)
#### Active Events Tab
- [ ] Event cards responsive
- [ ] Table converts to cards on mobile
- [ ] Filters collapsible on mobile
- [ ] Search bar full-width on mobile
- [ ] Action buttons accessible

#### Completed Events Tab
- [ ] Same as Active Events
- [ ] Approve Hours button accessible

### Event Detail Page (/events/:id)
- [ ] Event info stacks on mobile
- [ ] Shifts table → cards on mobile
- [ ] Worker list scrollable
- [ ] Assign worker button accessible
- [ ] Edit button accessible

### Workers Page (/workers)
- [ ] Worker grid: 1 col mobile, 2-3 desktop
- [ ] Search/filters collapsible
- [ ] Worker cards touch-friendly
- [ ] Add worker button accessible

### Reports Page (/reports)
- [ ] Report cards stack on mobile
- [ ] Date pickers full-width
- [ ] Export buttons full-width
- [ ] Forms adapt to mobile

### Modals
- [ ] EditEventModal responsive
- [ ] ApprovalModal responsive
- [ ] CreateEventWizard responsive
- [ ] All modals scrollable on small screens

## Issues Found

### Critical (blocks mobile use):
1. 

### High (poor mobile UX):
1. 

### Medium (works but suboptimal):
1. 

## Breakpoints to Use

- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

Tailwind breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px
