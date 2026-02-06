---
description: Website Intelligence System - scan, analyze, and get recommendations for any website
options:
  - label: "Scan"
    description: "Crawl a website and run full 5-layer analysis"
  - label: "Recommend"
    description: "Get prioritized 'what to work on next'"
  - label: "Status"
    description: "Show layer status for a scanned site"
  - label: "Dashboard"
    description: "Launch visual dashboard"
---

# Site Intelligence

5-layer agentic website analysis system. Crawls any website, understands page purpose and features, builds a dependency graph, stores to semantic memory, and answers "What should I work on next?"

## Arguments

- `/site-intel` — Show menu of actions
- `/site-intel scan <url>` — Full scan of a website
- `/site-intel recommend <domain>` — Get prioritized recommendations
- `/site-intel status <domain>` — Show 5-layer status
- `/site-intel page <domain> <path>` — Detailed page intelligence
- `/site-intel graph <domain>` — Show dependency graph (Mermaid)
- `/site-intel drift <domain>` — Compare latest scans for changes
- `/site-intel dashboard` — Start web dashboard on port 3847

## Instructions

### Action: Scan

When the user requests a scan (or selects "Scan"):

1. Ask for the URL if not provided in arguments via `$ARGUMENTS`
2. Use the `site_intel_scan` MCP tool:

```
Call site_intel_scan with:
  url: "<the url>"
  maxPages: 50
  depth: 3
  screenshots: true
```

3. Display results in this format:

```
╔══════════════════════════════════════════════════╗
║  SITE INTELLIGENCE REPORT                        ║
╠══════════════════════════════════════════════════╣
║  Domain: {domain}                                ║
║  Pages Scanned: {totalPages}                     ║
║  Health Score: {score}/100 ({grade})              ║
║  Scan Duration: {duration}ms                     ║
╠══════════════════════════════════════════════════╣
║  Layer Status                                    ║
╠══════════════════════════════════════════════════╣
║  L1 Discovery:     ● {pages} pages, {routes} routes
║  L2 Summarization: ● {smells} issues found
║  L3 Graph:         ● {nodes} nodes, {edges} edges
║  L4 Memory:        ● {chromaDocs} vectors stored
║  L5 Judgment:      ● {recommendations} recommendations
╠══════════════════════════════════════════════════╣
║  Top Recommendations                             ║
╠══════════════════════════════════════════════════╣
{top 3 recommendations with priority, title, impact, effort}
╚══════════════════════════════════════════════════╝
```

### Action: Recommend

1. Get domain from `$ARGUMENTS` or ask
2. Use the `site_intel_recommend` MCP tool:

```
Call site_intel_recommend with:
  domain: "<domain>"
  limit: 10
```

3. Display as a prioritized table with columns: Priority | Title | Impact | Effort | Risk | Category

### Action: Status

1. Get domain from `$ARGUMENTS` or ask
2. Use the `site_intel_status` MCP tool:

```
Call site_intel_status with:
  domain: "<domain>"
```

3. If no domain provided, call with empty args to list all scanned sites
4. Display 5-layer status with health score

### Action: Page Detail

1. Get domain and path from `$ARGUMENTS`
2. Use the `site_intel_page` MCP tool:

```
Call site_intel_page with:
  domain: "<domain>"
  path: "<path>"
```

3. Display: classification, features, smells, business value, dependencies

### Action: Graph

1. Get domain from `$ARGUMENTS`
2. Use the `site_intel_graph` MCP tool:

```
Call site_intel_graph with:
  domain: "<domain>"
  format: "mermaid"
```

3. Display the Mermaid diagram in a code block

### Action: Drift

1. Get domain from `$ARGUMENTS`
2. Use the `site_intel_drift` MCP tool:

```
Call site_intel_drift with:
  domain: "<domain>"
```

3. Show: new pages, removed pages, changed pages, health score delta

### Action: Dashboard

1. Run: `node src/site-intel/dashboard/server.js`
2. Report the URL: `http://localhost:3847`
3. The dashboard shows interactive Cytoscape.js graph visualization, recommendations table, and page cards

## No Arguments Flow

If invoked as just `/site-intel` with no arguments:

1. Show the available actions as a menu
2. Ask the user what they'd like to do
3. If they have previously scanned sites, show them in the menu

## MCP Tools Reference

All 7 tools are available via the `site-intel` MCP server:

| Tool | Input | Purpose |
|------|-------|---------|
| `site_intel_scan` | `{ url, maxPages?, depth?, screenshots? }` | Full 5-layer scan |
| `site_intel_summarize` | `{ domain }` | Get page summaries |
| `site_intel_graph` | `{ domain, format? }` | Dependency graph |
| `site_intel_recommend` | `{ domain, limit?, focus? }` | Prioritized recommendations |
| `site_intel_page` | `{ domain, path }` | Single page detail |
| `site_intel_drift` | `{ domain }` | Change detection between scans |
| `site_intel_status` | `{ domain? }` | Layer status or list sites |
