# Console Error Analysis - eroland.me

**Total Console Errors Captured:** 29,688 across 59 pages
**Scan Date:** 2026-02-09

---

## Top 10 Most Common Errors

### 1. CSP Violation: Google Fonts (11,910 occurrences)
```
Loading the stylesheet 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
violates the following Content Security Policy directive: "style-src 'self' 'unsafe-inline'".
```

**Impact:** Medium
- Fonts may fail to load on some browsers
- CSP errors pollute console logs
- No functional impact (fonts likely have fallback)

**Fix:** Add `fonts.googleapis.com` to CSP `style-src` directive
```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

---

### 2. CSP Violation: Cloudflare Insights (11,910 occurrences)
```
Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015'
violates the following Content Security Policy directive: "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'
https://www.googletagmanager.com https://www.google-analytics.com".
```

**Impact:** Low-Medium
- Analytics tracking may be blocked
- No functional impact on user experience
- Loses visitor analytics data

**Fix:** Add Cloudflare Insights to CSP `script-src` directive
```
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'
  https://www.googletagmanager.com
  https://www.google-analytics.com
  https://static.cloudflareinsights.com;
```

---

### 3. PugSocket Connection Error (3,122 occurrences)
```
[PugSocket] Connection error: server error
```

**Impact:** High (Feature-Breaking)
- Real-time Pipedrive sync failing
- Users can't see live updates from PUG module
- Websocket connection issue

**Likely Causes:**
- Backend websocket server down/misconfigured
- CORS issue with websocket handshake
- Authentication token expired/invalid
- Railway backend connectivity issue

**Fix Priority:** HIGH
**Next Steps:**
1. Check Railway logs for websocket server errors
2. Verify websocket endpoint is accessible
3. Test authentication flow for socket connections
4. Check CORS headers for websocket upgrade

---

### 4. VITE_VIBE_REMOTE_URL Not Configured (1,690 occurrences)
```
[PugRecordsPage] Failed to fetch initial data: Error: VITE_VIBE_REMOTE_URL not configured - cannot fetch data
```

**Impact:** High (Feature-Breaking)
- PugRecordsPage fails to load data
- Missing environment variable in production build
- Feature completely non-functional

**Fix Priority:** CRITICAL
**Resolution:**
1. Add `VITE_VIBE_REMOTE_URL` to Cloudflare Pages environment variables
2. Rebuild and redeploy frontend
3. Verify `.env.example` documents this variable

**Expected Value:**
```
VITE_VIBE_REMOTE_URL=https://[your-vibe-remote-server]/api
```

---

### 5. HTTP 429 Rate Limiting (348 occurrences)
```
Failed to load resource: the server responded with a status of 429 ()
An error occurred. Please contact support if the issue persists.
```

**Impact:** High (Performance-Blocking)
- API requests being rate-limited by backend
- Users seeing error messages
- Likely caused by aggressive polling intervals

**Affected Endpoints:**
- `/weekly-board/weeks` (232 errors)
- `/weekly-board/weeks/current` (116 errors)

**Fix Priority:** HIGH
**Root Cause:** Continuous polling without backoff strategy

**Recommended Fixes:**
1. **Increase polling interval:** Change from aggressive intervals to 30-60 seconds
2. **Implement exponential backoff:** When 429 received, wait longer before retry
3. **Use WebSockets instead:** Replace polling with real-time updates
4. **Increase rate limits:** If legitimate traffic, adjust Railway backend limits

**Code Example:**
```javascript
// Before (aggressive polling)
const pollInterval = 5000; // Every 5 seconds

// After (smart polling with backoff)
let pollInterval = 30000; // Start at 30 seconds
let backoffMultiplier = 1;

async function fetchWithBackoff() {
  try {
    const response = await fetch(url);
    if (response.status === 429) {
      backoffMultiplier = Math.min(backoffMultiplier * 2, 8); // Max 240s
      console.warn(`Rate limited, backing off to ${pollInterval * backoffMultiplier}ms`);
    } else {
      backoffMultiplier = 1; // Reset on success
    }
  } catch (error) {
    console.error(error);
  }
  setTimeout(fetchWithBackoff, pollInterval * backoffMultiplier);
}
```

---

### 6. HTTP 401 Unauthorized (12 occurrences)
```
Failed to load resource: the server responded with a status of 401 ()
```

**Impact:** Medium
- Sporadic authentication failures
- May indicate token expiry during session
- Low frequency suggests edge case

**Likely Causes:**
- JWT token expired during scan
- Session timeout (scan ran for 5+ minutes)
- Protected endpoint accessed without refresh

**Fix Priority:** MEDIUM
**Recommended Fixes:**
1. Implement automatic token refresh on 401
2. Add session timeout warning for users
3. Gracefully handle auth failures with re-login prompt

---

## Error Distribution by Page Type

### Pages with Most Errors

| Page | Errors | Primary Issue |
|------|--------|---------------|
| `/app/dashboard` | ~800 | CSP violations + polling 429s |
| `/app/pug/records` | ~600 | VITE_VIBE_REMOTE_URL + PugSocket |
| `/app/weekly-planning` | ~400 | Rate limiting (429s) |
| `/app/epg` | ~350 | CSP violations (complex page) |
| `/app/pug/sync` | ~300 | PugSocket connection failures |

### Pages with Fewest Errors

| Page | Errors | Notes |
|------|--------|-------|
| `/pricing` | ~2 | Only CSP violations |
| `/notifications` | ~4 | Minimal JavaScript |
| `/terminal/connect` | ~8 | Lightweight utility page |
| `/vibe-remote/cli` | ~6 | Simple static page |

---

## Priority Matrix

### P0 - Critical (Deploy Blocker)
- ❌ **VITE_VIBE_REMOTE_URL missing** - Feature completely broken

### P1 - High (User-Facing Issues)
- ⚠️ **PugSocket connection errors** - Real-time sync broken
- ⚠️ **HTTP 429 rate limiting** - API failures visible to users

### P2 - Medium (Quality/Performance)
- 🔧 **CSP violations** - Analytics blocked, fonts may fail
- 🔧 **HTTP 401 errors** - Sporadic auth failures

---

## Recommended Action Plan

### Week 1: Critical Fixes
1. **Add missing env var** - `VITE_VIBE_REMOTE_URL` to Cloudflare
2. **Debug PugSocket** - Fix websocket connection errors
3. **Implement rate limit handling** - Add exponential backoff

### Week 2: Quality Improvements
1. **Update CSP headers** - Allow Google Fonts and Cloudflare Insights
2. **Token refresh logic** - Handle 401s gracefully
3. **Error monitoring** - Add Sentry/similar to catch production errors

### Week 3: Optimization
1. **Replace polling with WebSockets** - Reduce 429 errors
2. **Audit polling intervals** - Increase to 30-60s minimum
3. **Add error boundaries** - Prevent error cascades

---

## CSP Header Fix (Quick Win)

**Current CSP (inferred):**
```
style-src 'self' 'unsafe-inline';
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com;
```

**Recommended CSP:**
```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'
  https://www.googletagmanager.com
  https://www.google-analytics.com
  https://static.cloudflareinsights.com;
font-src 'self' https://fonts.gstatic.com;
```

**Where to Update:**
- Cloudflare Pages: `_headers` file in `/public/` or `wrangler.toml`
- Railway Backend: Response headers in FastAPI middleware

**Example `_headers` file:**
```
/*
  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.eroland.me wss://api.eroland.me;
```

---

## Error Reduction Goal

**Current:** 29,688 errors across 59 pages (avg 503 per page)

**Target after fixes:**
- CSP violations: -23,820 (eliminate)
- PugSocket errors: -3,122 (fix connection)
- Rate limit 429s: -348 (implement backoff)
- **Total reduction: -27,290 (92% reduction)**

**Target:** <100 errors across all pages

---

**Analysis Date:** 2026-02-09
**Data Source:** `scan-auth-fast.json`
