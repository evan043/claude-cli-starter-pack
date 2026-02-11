# eroland.me Fast Authenticated Scan Report

**Scan Date:** 2026-02-09
**Strategy:** domcontentloaded + 3s delay (no networkidle)
**Authentication:** Yes (Evan043)
**Total Routes:** 59

---

## Executive Summary

✅ **100% Success Rate** - All 59 pages scanned successfully
📊 **149,145 Total Elements** across all pages
🔗 **31 Total Links** found
📋 **2 Forms** detected
⚠️ **29,688 Console Errors** (mostly CSP violations)

---

## H1 Analysis

**18 Unique H1 Values Found:**

### Most Common H1: "Dashboard" (38 pages - 64%)
Many pages show generic "Dashboard" H1, indicating potential UX issues:

- `/` → redirects to `/app/dashboard`
- `/login` → shows Dashboard after auth redirect
- `/landing`, `/landing/demo`, `/landing/features`, `/landing/articles` → all show Dashboard
- Most `/app/epg/*` routes → Dashboard
- Most `/app/pug/*` routes → Dashboard
- Most `/app/notes/*` routes → Dashboard
- All `/app/reports/*` subroutes → Dashboard
- Most `/app/admin/*` routes → Dashboard
- `/app/todoist-widget`, `/app/weekly-planning` → Dashboard
- All `/app/settings/*` routes → Dashboard

### Proper H1s (14 pages - 24%)
These pages have descriptive, unique H1s:

| H1 | Route |
|----|-------|
| **Transparent pricing for modern outreach teams** | `/pricing` |
| **USI Benefits Events** | `/early-rsvp` |
| **Notifications** | `/notifications` |
| **Geocoding Info** | `/notifications/geocoding-info` |
| **Vibe Remote** | `/vibe-remote` |
| **Terminal Connection** | `/terminal/connect` |
| **CLI Dashboard** | `/cli-dashboard` |
| **Home** | `/app/home` |
| **Campaign Management** | `/app/campaigns` |
| **Organization Management** | `/app/organizations` |
| **Address Verification** | `/app/addresses` |
| **Route Planning** | `/app/routes` |
| **Review & Adjust Routes** | `/app/review-routes` |
| **Contact Management** | `/app/contacts` |
| **Event Planning Grid** | `/app/epg` |
| **Notes** | `/app/notes` |

### Missing H1s (4 pages - 7%)
| Route | Issue |
|-------|-------|
| `/vibe-remote/cli` | No H1 |
| `/app/reports` | No H1 |
| `/app/admin` | No H1 |
| `/app/timelines` | No H1 |

---

## Page Complexity

**Element Count Analysis:**

| Range | Count | Pages |
|-------|-------|-------|
| 0-500 | 8 | Lightweight utility pages |
| 501-2000 | 21 | Standard app pages |
| 2001-4000 | 29 | Dashboard/feature pages |
| 4001+ | 1 | `/app/epg` (8,446 elements) |

**Heaviest Pages:**
1. `/app/epg` - 8,446 elements (Event Planning Grid)
2. `/app/dashboard` - 3,919 elements
3. `/app` - 3,919 elements
4. `/login` (after redirect) - 1,983 elements

---

## Critical Issues Detected

### 1. H1 Consistency Problem
**38 pages (64%)** show generic "Dashboard" H1, making:
- SEO suboptimal (duplicate H1s)
- Screen reader navigation poor
- Browser tabs indistinguishable
- Breadcrumb context lost

**Recommendation:** Implement dynamic H1s based on route context.

### 2. Missing H1s
**4 pages** have no H1 at all:
- `/vibe-remote/cli`
- `/app/reports`
- `/app/admin`
- `/app/timelines`

**Recommendation:** Add semantic H1s to these landing pages.

### 3. CSP Violations (29,688 errors)
Most console errors are Content Security Policy violations:
- Google Fonts stylesheet blocked
- Cloudflare Insights script blocked

**Recommendation:** Update CSP headers to allow trusted external resources or self-host fonts.

### 4. Missing Meta Descriptions
Several pages lack meta descriptions (SEO impact).

**Recommendation:** Add unique meta descriptions to all public pages.

---

## Route Redirect Behavior

Several routes redirect after authentication:

| Original Route | Redirects To |
|---------------|--------------|
| `/` | `/app/dashboard?campaign=...` |
| `/login` | `/app/dashboard?campaign=...` (after auth) |
| `/landing` | `/app/dashboard?campaign=...` |
| `/landing/demo` | `/app/dashboard?campaign=...` |
| `/landing/features` | `/app/dashboard?campaign=...` |
| `/landing/articles` | `/app/dashboard?campaign=...` |

**Note:** All `/landing/*` routes redirect to dashboard when authenticated. This is expected behavior but should be documented.

---

## Forms Found

Only **2 forms** detected across all pages:
1. Login form at `/login`
2. Additional form (location TBD from detailed scan)

**Observation:** Low form count suggests most interactions are button/click-based rather than traditional form submissions.

---

## Performance Observations

### Scan Timing
- **Total Duration:** ~5 minutes for 59 pages
- **Average:** ~5 seconds per page (3s forced delay + load time)
- **Wait Strategy:** `domcontentloaded` with 3s post-load timeout
- **Timeout Rate:** 0% (no timeouts)

### Success Factors
✅ Avoided `networkidle` strategy (which caused previous timeouts)
✅ 3-second delay allowed JS hydration
✅ Headless mode reduced resource overhead
✅ No pages timed out at 15s limit

---

## Next Steps

### Immediate Actions
1. **Fix Missing H1s** - Add semantic H1s to 4 pages
2. **Dynamic H1s** - Replace generic "Dashboard" with context-aware H1s
3. **CSP Headers** - Update to allow Google Fonts and Cloudflare Insights
4. **Meta Descriptions** - Add to all public pages

### Future Analysis
- Run lighthouse scores for performance metrics
- Test mobile viewport sizes
- Analyze navigation patterns from link graph
- Check accessibility with axe-core
- Verify all authenticated routes require login

---

## Technical Details

**Scan Configuration:**
```javascript
{
  browser: 'chromium',
  headless: true,
  waitUntil: 'domcontentloaded',
  timeout: 15000,
  postLoadDelay: 3000,
  username: 'Evan043',
  authenticated: true
}
```

**Output Files:**
- `scan-auth-fast.json` - Full page data (all 59 pages)
- `scan-auth-fast-summary.json` - Statistics and aggregations
- `SCAN_REPORT.md` - This report

**Pipeline Processing:**
- ❌ L2-L5 pipeline failed (saveScan error)
- ✅ Raw scan data saved successfully
- ℹ️ Pipeline can be re-run separately if needed

---

## Appendix: All Routes Scanned

<details>
<summary>Click to expand full route list (59 routes)</summary>

### Public Routes (9)
- `/`
- `/login`
- `/pricing`
- `/landing`
- `/landing/demo`
- `/landing/features`
- `/landing/articles`
- `/early-rsvp`
- `/notifications`

### Utility Routes (4)
- `/notifications/geocoding-info`
- `/vibe-remote`
- `/vibe-remote/cli`
- `/terminal/connect`

### Admin/Dashboard Routes (46)
- `/cli-dashboard`
- `/app`
- `/app/home`
- `/app/dashboard`
- `/app/campaigns`
- `/app/organizations`
- `/app/addresses`
- `/app/routes`
- `/app/review-routes`
- `/app/contacts`
- `/app/epg`
- `/app/epg/events`
- `/app/epg/presets`
- `/app/epg/upload`
- `/app/epg/search`
- `/app/execution-table`
- `/app/field-management`
- `/app/pug`
- `/app/pug/records`
- `/app/pug/companies`
- `/app/pug/contacts`
- `/app/pug/deals`
- `/app/pug/sync`
- `/app/notes`
- `/app/notes/all`
- `/app/notes/stickies`
- `/app/notes/starred`
- `/app/notes/flashcards`
- `/app/notes/archive`
- `/app/reports`
- `/app/reports/weekly`
- `/app/reports/canvasser`
- `/app/reports/field`
- `/app/admin`
- `/app/admin/users`
- `/app/admin/settings`
- `/app/admin/field-config`
- `/app/admin/templates`
- `/app/admin/integrations`
- `/app/todoist-widget`
- `/app/weekly-planning`
- `/app/timelines`
- `/app/settings`
- `/app/settings/profile`
- `/app/settings/notifications`
- `/app/settings/theme`

</details>

---

**Scan completed:** 2026-02-09
**Script location:** `tools/claude-cli-advanced-starter-pack/src/site-intel/.tmp-fast-auth-scan.mjs`
