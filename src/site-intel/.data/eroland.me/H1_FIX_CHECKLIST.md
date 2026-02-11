# H1 Fix Checklist - eroland.me

Based on fast authenticated scan completed 2026-02-09.

---

## Critical: Missing H1s (4 pages)

These pages have NO H1 element and must be fixed immediately:

- [ ] `/vibe-remote/cli` - Add H1: "CLI Integration" or "Vibe Remote CLI"
- [ ] `/app/reports` - Add H1: "Reports" or "Analytics Dashboard"
- [ ] `/app/admin` - Add H1: "Administration" or "Admin Panel"
- [ ] `/app/timelines` - Add H1: "Timelines" or "Event Timelines"

---

## High Priority: Generic "Dashboard" H1s (38 pages)

These pages use generic "Dashboard" H1 when they should have context-specific headings:

### Landing Pages (4)
- [ ] `/landing` - Change to: "Welcome to Cenari" or feature-specific H1
- [ ] `/landing/demo` - Change to: "Request a Demo" or "See Cenari in Action"
- [ ] `/landing/features` - Change to: "Features" or "Platform Capabilities"
- [ ] `/landing/articles` - Change to: "Resources" or "Knowledge Base"

### EPG Module (4 of 5 pages)
✅ `/app/epg` - Already has proper H1: "Event Planning Grid"
- [ ] `/app/epg/events` - Change to: "Event Calendar" or "Upcoming Events"
- [ ] `/app/epg/presets` - Change to: "Event Presets" or "Template Library"
- [ ] `/app/epg/upload` - Change to: "Upload Events" or "Bulk Import"
- [ ] `/app/epg/search` - Change to: "Search Events" or "Event Finder"

### PUG Module (6 of 7 pages)
✅ `/app/pug` - Has H1 but could be more specific
- [ ] `/app/pug/records` - Change to: "Pipedrive Records" or "All Records"
- [ ] `/app/pug/companies` - Change to: "Companies" or "Organizations"
- [ ] `/app/pug/contacts` - Change to: "Contacts" or "People"
- [ ] `/app/pug/deals` - Change to: "Deals" or "Opportunities"
- [ ] `/app/pug/sync` - Change to: "Sync Status" or "Pipedrive Sync"

### Notes Module (5 of 6 pages)
✅ `/app/notes` - Already has proper H1: "Notes"
- [ ] `/app/notes/all` - Change to: "All Notes" or "Notes Archive"
- [ ] `/app/notes/stickies` - Change to: "Sticky Notes" or "Quick Notes"
- [ ] `/app/notes/starred` - Change to: "Starred Notes" or "Favorites"
- [ ] `/app/notes/flashcards` - Change to: "Flashcards" or "Study Mode"
- [ ] `/app/notes/archive` - Change to: "Archived Notes" or "Archive"

### Reports Module (3 of 4 pages)
❌ `/app/reports` - Missing H1 entirely (see Critical section)
- [ ] `/app/reports/weekly` - Change to: "Weekly Reports" or "Weekly Summary"
- [ ] `/app/reports/canvasser` - Change to: "Canvasser Reports" or "Field Team Performance"
- [ ] `/app/reports/field` - Change to: "Field Reports" or "Field Operations"

### Admin Module (5 of 6 pages)
❌ `/app/admin` - Missing H1 entirely (see Critical section)
- [ ] `/app/admin/users` - Change to: "User Management" or "Team Members"
- [ ] `/app/admin/settings` - Change to: "System Settings" or "Configuration"
- [ ] `/app/admin/field-config` - Change to: "Field Configuration" or "Custom Fields"
- [ ] `/app/admin/templates` - Change to: "Templates" or "Template Library"
- [ ] `/app/admin/integrations` - Change to: "Integrations" or "Connected Apps"

### Settings Module (4 of 5 pages)
✅ `/app/settings` - Has H1 but very generic "Dashboard"
- [ ] `/app/settings/profile` - Change to: "Profile Settings" or "Your Profile"
- [ ] `/app/settings/notifications` - Change to: "Notification Preferences" or "Alerts"
- [ ] `/app/settings/theme` - Change to: "Theme Settings" or "Appearance"

### Other App Pages (7)
- [ ] `/app` - Consider: "Overview" or "Home Dashboard"
- [ ] `/app/dashboard` - Consider: "Campaign Dashboard" (since it shows campaign param)
- [ ] `/app/execution-table` - Change to: "Execution Tracking" or "Field Execution"
- [ ] `/app/field-management` - Change to: "Field Management" or "Field Operations"
- [ ] `/app/todoist-widget` - Change to: "Todoist Integration" or "Task Sync"
- [ ] `/app/weekly-planning` - Change to: "Weekly Planning Board" or "Week Planner"

### Root Routes (2)
- [ ] `/` - Should inherit from target route after redirect
- [ ] `/login` - After auth, redirects to dashboard (special case)

---

## Already Good: Proper H1s (17 pages)

These pages have unique, descriptive H1s - no changes needed:

✅ `/pricing` - "Transparent pricing for modern outreach teams"
✅ `/early-rsvp` - "USI Benefits Events"
✅ `/notifications` - "Notifications"
✅ `/notifications/geocoding-info` - "Geocoding Info"
✅ `/vibe-remote` - "Vibe Remote"
✅ `/terminal/connect` - "Terminal Connection"
✅ `/cli-dashboard` - "CLI Dashboard"
✅ `/app/home` - "Home"
✅ `/app/campaigns` - "Campaign Management"
✅ `/app/organizations` - "Organization Management"
✅ `/app/addresses` - "Address Verification"
✅ `/app/routes` - "Route Planning"
✅ `/app/review-routes` - "Review & Adjust Routes"
✅ `/app/contacts` - "Contact Management"
✅ `/app/epg` - "Event Planning Grid"
✅ `/app/notes` - "Notes"
✅ `/app/pug` - "Dashboard" (acceptable for module landing page)

---

## Implementation Strategy

### Approach 1: Component-Level Fix (Recommended)
Update each page component to set a dynamic H1:

```jsx
// Example: app/notes/stickies page
<PageHeader>
  <h1>Sticky Notes</h1>
  <p>Quick notes and reminders</p>
</PageHeader>
```

### Approach 2: Layout-Level Fix (Faster but less flexible)
Use route-based H1 mapping in layout component:

```jsx
// Layout.jsx
const H1_MAP = {
  '/app/notes/stickies': 'Sticky Notes',
  '/app/notes/starred': 'Starred Notes',
  // ...
};

<h1>{H1_MAP[location.pathname] || 'Dashboard'}</h1>
```

### Approach 3: Metadata-Based Fix (Most maintainable)
Define H1s in route config:

```jsx
// router.jsx
{
  path: '/app/notes/stickies',
  element: <NotesStickies />,
  meta: { h1: 'Sticky Notes' }
}
```

---

## Benefits of Fixing H1s

1. **SEO Improvement** - Unique H1s help search engines understand page purpose
2. **Accessibility** - Screen reader users can quickly identify page context
3. **Browser Tabs** - Descriptive titles make tab management easier
4. **Navigation Context** - Users know where they are in the app
5. **Breadcrumbs** - Enables automatic breadcrumb generation from H1s

---

## Estimated Effort

- **Critical (Missing H1s):** 30 minutes (4 pages × ~7 min each)
- **High Priority (Generic H1s):** 3-4 hours (38 pages × ~5 min each)
- **Total:** ~4.5 hours for complete H1 remediation

---

**Priority Order:**
1. Fix 4 missing H1s (critical for accessibility)
2. Fix module landing pages (reports, admin, settings)
3. Fix subpages within each module
4. Review and standardize H1 style across app

**Tracking:**
- Total pages: 59
- Missing H1s: 4
- Generic H1s: 38
- Proper H1s: 17
- **Fix Rate: 71% of pages need H1 improvements**
