#!/usr/bin/env node

/**
 * CCASP Website Intelligence System - MCP Server
 *
 * Exposes 9 MCP tools for Claude Code to perform intelligent site analysis:
 * - site_intel_scan: Full crawl + 5-layer analysis
 * - site_intel_summarize: Get semantic summaries
 * - site_intel_graph: Get cross-page dependency graph
 * - site_intel_recommend: Get prioritized recommendations
 * - site_intel_page: Get detailed page intelligence
 * - site_intel_drift: Detect drift from original design
 * - site_intel_status: Get status of all 5 layers
 * - site_intel_search: Search page summaries using semantic matching
 * - site_intel_routes: Parse codebase route definitions via ts-morph
 *
 * Transport: JSON-RPC 2.0 over stdio (newline-delimited)
 * Zero external dependencies - pure Node.js ES modules
 */

import { createInterface } from 'readline';
import { runFullScan, getRecommendations, getStatus, listSites } from './orchestrator.js';
import { loadLatestScan, listScans, listDomains, toChromaDocuments, loadChromaPending } from './memory/index.js';
import { toMermaid } from './graph/index.js';
import { parseRoutes } from './discovery/route-parser.js';

// MCP Protocol Constants
const PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'ccasp-site-intel';
const SERVER_VERSION = '1.0.0';

// Tool Definitions
const TOOLS = [
  {
    name: 'site_intel_scan',
    description: 'Crawl a website and generate full intelligence report with health score and recommendations. Runs all 5 layers: Discovery, Summarization, Graph, Memory, Judgment.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL to scan (e.g., https://example.com)'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum pages to crawl (default: 50)',
          default: 50
        },
        depth: {
          type: 'number',
          description: 'Maximum crawl depth (default: 3)',
          default: 3
        },
        screenshots: {
          type: 'boolean',
          description: 'Capture screenshots of pages (default: true)',
          default: true
        }
      },
      required: ['url']
    }
  },
  {
    name: 'site_intel_summarize',
    description: 'Get semantic summaries for all pages of a previously crawled domain. Returns page-by-page analysis with UX smells, SEO issues, and component insights.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (e.g., example.com)'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'site_intel_graph',
    description: 'Get cross-page dependency graph showing navigation flows, shared components, and API relationships. Returns JSON or Mermaid diagram.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (e.g., example.com)'
        },
        format: {
          type: 'string',
          enum: ['json', 'mermaid'],
          description: 'Output format: json (structured data) or mermaid (diagram syntax)',
          default: 'json'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'site_intel_recommend',
    description: 'Get prioritized "what to work on next" recommendations based on impact and effort. Focuses on quick wins, high-impact fixes, or specific areas.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (e.g., example.com)'
        },
        limit: {
          type: 'number',
          description: 'Maximum recommendations to return (default: 10)',
          default: 10
        },
        focus: {
          type: 'string',
          enum: ['all', 'quick-wins', 'high-impact', 'ux', 'performance', 'seo', 'accessibility'],
          description: 'Filter focus area (default: all)',
          default: 'all'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'site_intel_page',
    description: 'Get detailed intelligence for a specific page including summary, dependencies, user flows, and identified issues.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (e.g., example.com)'
        },
        path: {
          type: 'string',
          description: 'Page path (e.g., /about or /products/item-1)'
        }
      },
      required: ['domain', 'path']
    }
  },
  {
    name: 'site_intel_drift',
    description: 'Detect drift from original design intent by comparing the latest two scans. Identifies new pages, removed pages, and changed content.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (e.g., example.com)'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'site_intel_status',
    description: 'Get status of all 5 intelligence layers (Discovery, Summaries, Graph, Memory, Judgment) for a domain or list all scanned sites.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (optional - if omitted, lists all scanned sites)'
        }
      }
    }
  },
  {
    name: 'site_intel_search',
    description: 'Search page summaries using semantic matching against stored ChromaDB documents. Returns pages relevant to a natural language query like "billing pages" or "user onboarding flow".',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query (e.g., "pages that handle authentication")'
        },
        domain: {
          type: 'string',
          description: 'Domain name to search within (optional - searches all if omitted)'
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 5)',
          default: 5
        }
      },
      required: ['query']
    }
  },
  {
    name: 'site_intel_routes',
    description: 'Parse codebase route definitions using ts-morph AST analysis. Returns route→component→hook→API mappings from React Router v6 configurations. Requires ts-morph to be installed.',
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: {
          type: 'string',
          description: 'Absolute path to project root (default: current working directory)'
        },
        path: {
          type: 'string',
          description: 'Filter to a specific route path (e.g., "/dashboard")'
        },
        framework: {
          type: 'string',
          enum: ['react-router-v6'],
          description: 'Router framework (default: react-router-v6)',
          default: 'react-router-v6'
        }
      }
    }
  }
];

// JSON-RPC Response Helpers
function successResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function errorResponse(id, code, message, data = undefined) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id, error };
}

function sendMessage(message) {
  console.log(JSON.stringify(message));
}

// Tool Handlers
async function handleScan(args) {
  const { url, maxPages = 50, depth = 3, screenshots = true } = args;

  if (!url || typeof url !== 'string') {
    throw new Error('Invalid url parameter - must be a non-empty string');
  }

  const result = await runFullScan(url, {
    maxPages,
    depth,
    includeScreenshots: screenshots,
    projectRoot: process.cwd(),
    saveToDisk: true
  });

  if (!result.success) {
    throw new Error(`Scan failed: ${result.error}`);
  }

  return {
    success: true,
    scanId: result.scanId,
    domain: result.domain,
    summary: result.summary,
    layers: result.layers,
    topRecommendations: result.summary.topRecommendations || [],
    mermaidGraph: result.data.mermaid || null
  };
}

async function handleSummarize(args) {
  const { domain } = args;

  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain parameter - must be a non-empty string');
  }

  const scan = loadLatestScan(process.cwd(), domain);
  if (!scan) {
    throw new Error(`No scans found for domain: ${domain}`);
  }

  if (!scan.summaries) {
    throw new Error('Scan data incomplete - missing summaries');
  }

  return {
    success: true,
    domain,
    scanId: scan.scanId,
    summaries: scan.summaries.summaries || [],
    aggregate: scan.summaries.aggregate || {},
    lastScan: scan.savedAt
  };
}

async function handleGraph(args) {
  const { domain, format = 'json' } = args;

  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain parameter - must be a non-empty string');
  }

  const scan = loadLatestScan(process.cwd(), domain);
  if (!scan) {
    throw new Error(`No scans found for domain: ${domain}`);
  }

  if (!scan.graph) {
    throw new Error('Scan data incomplete - missing graph');
  }

  if (format === 'mermaid') {
    const mermaid = toMermaid(scan.graph);
    return {
      success: true,
      domain,
      scanId: scan.scanId,
      format: 'mermaid',
      graph: mermaid
    };
  }

  return {
    success: true,
    domain,
    scanId: scan.scanId,
    format: 'json',
    graph: scan.graph
  };
}

async function handleRecommend(args) {
  const { domain, limit = 10, focus = 'all' } = args;

  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain parameter - must be a non-empty string');
  }

  const result = getRecommendations(domain, {
    projectRoot: process.cwd(),
    limit,
    focus
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate recommendations');
  }

  return result;
}

async function handlePage(args) {
  const { domain, path } = args;

  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain parameter - must be a non-empty string');
  }

  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path parameter - must be a non-empty string');
  }

  const scan = loadLatestScan(process.cwd(), domain);
  if (!scan) {
    throw new Error(`No scans found for domain: ${domain}`);
  }

  if (!scan.summaries) {
    throw new Error('Scan data incomplete - missing summaries');
  }

  // Find the page summary
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pageSummary = scan.summaries.summaries.find(s => s.path === normalizedPath);

  if (!pageSummary) {
    throw new Error(`Page not found: ${normalizedPath}`);
  }

  // Get graph edges for this page
  let dependencies = [];
  let dependents = [];
  if (scan.graph) {
    const pageNode = scan.graph.nodes.find(n => n.path === normalizedPath);
    if (pageNode) {
      dependencies = scan.graph.edges
        .filter(e => e.from === pageNode.id)
        .map(e => scan.graph.nodes.find(n => n.id === e.to)?.path)
        .filter(Boolean);

      dependents = scan.graph.edges
        .filter(e => e.to === pageNode.id)
        .map(e => scan.graph.nodes.find(n => n.id === e.from)?.path)
        .filter(Boolean);
    }
  }

  return {
    success: true,
    domain,
    path: normalizedPath,
    scanId: scan.scanId,
    summary: pageSummary,
    dependencies,
    dependents
  };
}

async function handleDrift(args) {
  const { domain } = args;

  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain parameter - must be a non-empty string');
  }

  const scans = listScans(process.cwd(), domain);
  if (!scans || scans.length < 2) {
    return {
      success: false,
      domain,
      error: 'Need at least 2 scans to detect drift',
      scansFound: scans?.length || 0
    };
  }

  // Get latest two scans
  const sorted = scans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latestScan = loadLatestScan(process.cwd(), domain);
  const previousScanId = sorted[1].scanId;

  // Load previous scan using the memory layer's loadScan function
  const { loadScan } = await import('./memory/index.js');
  const previousScan = loadScan(process.cwd(), domain, previousScanId);

  if (!previousScan || !latestScan) {
    throw new Error('Failed to load scan data for comparison');
  }

  // Compare pages
  const latestPages = new Set(latestScan.summaries.summaries.map(s => s.path));
  const previousPages = new Set(previousScan.summaries.summaries.map(s => s.path));

  const newPages = [...latestPages].filter(p => !previousPages.has(p));
  const removedPages = [...previousPages].filter(p => !latestPages.has(p));
  const unchangedPages = [...latestPages].filter(p => previousPages.has(p));

  // Detect changed content (simplified - compare smell counts)
  const changedPages = unchangedPages.filter(path => {
    const latest = latestScan.summaries.summaries.find(s => s.path === path);
    const previous = previousScan.summaries.summaries.find(s => s.path === path);
    return latest && previous && latest.smells.length !== previous.smells.length;
  });

  return {
    success: true,
    domain,
    latestScanId: latestScan.scanId,
    previousScanId,
    drift: {
      newPages: { count: newPages.length, pages: newPages },
      removedPages: { count: removedPages.length, pages: removedPages },
      changedPages: { count: changedPages.length, pages: changedPages },
      unchangedPages: unchangedPages.length - changedPages.length
    },
    summary: `${newPages.length} new, ${removedPages.length} removed, ${changedPages.length} changed out of ${unchangedPages.length} total pages`
  };
}

async function handleStatus(args) {
  const { domain } = args;

  if (!domain) {
    // List all scanned sites
    const sites = listSites({ projectRoot: process.cwd() });
    return {
      success: true,
      sites,
      total: sites.length
    };
  }

  // Get status for specific domain
  const status = getStatus(domain, { projectRoot: process.cwd() });
  return { success: true, ...status };
}

async function handleSearch(args) {
  const { query, domain, limit = 5 } = args;

  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query parameter - must be a non-empty string');
  }

  // If domain specified, search only that domain's pending docs
  // Otherwise, search all domains
  const domains = domain
    ? [domain]
    : listDomains(process.cwd()).map(d => d.domain);

  if (domains.length === 0) {
    throw new Error('No scanned sites found. Run site_intel_scan first.');
  }

  const results = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  for (const d of domains) {
    // Try ChromaDB pending docs first (richer text for matching)
    const pending = loadChromaPending(process.cwd(), d);
    if (pending?.documents) {
      for (let i = 0; i < pending.documents.length; i++) {
        const docLower = pending.documents[i].toLowerCase();
        const matchCount = queryTerms.filter(term => docLower.includes(term)).length;
        if (matchCount > 0) {
          results.push({
            domain: d,
            relevance: matchCount / queryTerms.length,
            document: pending.documents[i],
            metadata: pending.metadatas[i],
            id: pending.ids[i]
          });
        }
      }
    } else {
      // Fallback: search from summaries JSON
      const scan = loadLatestScan(process.cwd(), d);
      if (scan?.summaries?.summaries) {
        for (const summary of scan.summaries.summaries) {
          const searchText = [
            summary.url, summary.purpose, summary.classification?.type,
            summary.primaryUser, ...(summary.features || []),
            ...(summary.smells?.map(s => s.smell) || []),
            ...(summary.dependencies?.apis || [])
          ].join(' ').toLowerCase();

          const matchCount = queryTerms.filter(term => searchText.includes(term)).length;
          if (matchCount > 0) {
            results.push({
              domain: d,
              relevance: matchCount / queryTerms.length,
              url: summary.url,
              type: summary.classification?.type,
              purpose: summary.purpose,
              businessValue: summary.businessValue?.score,
              smellCount: summary.smells?.length || 0
            });
          }
        }
      }
    }
  }

  // Sort by relevance, limit
  results.sort((a, b) => b.relevance - a.relevance);
  const limited = results.slice(0, limit);

  return {
    success: true,
    query,
    results: limited,
    total: results.length,
    shown: limited.length,
    searchedDomains: domains.length
  };
}

async function handleRoutes(args) {
  const { projectRoot = process.cwd(), path: routePath, framework = 'react-router-v6' } = args;

  const result = await parseRoutes(projectRoot, { framework });

  if (!result.success) {
    throw new Error(result.error || 'Failed to parse routes');
  }

  // Filter by path if specified
  let routes = result.routes;
  if (routePath) {
    const filterRecursive = (routeList) => {
      const matches = [];
      for (const route of routeList) {
        if (route.path === routePath) {
          matches.push(route);
        }
        if (route.children?.length) {
          matches.push(...filterRecursive(route.children));
        }
      }
      return matches;
    };
    routes = filterRecursive(routes);
  }

  return {
    success: true,
    framework: result.framework,
    routes,
    summary: routePath ? { matchedRoutes: routes.length } : result.summary
  };
}

// Tool Dispatcher
async function handleToolCall(name, args) {
  switch (name) {
    case 'site_intel_scan':
      return await handleScan(args);
    case 'site_intel_summarize':
      return await handleSummarize(args);
    case 'site_intel_graph':
      return await handleGraph(args);
    case 'site_intel_recommend':
      return await handleRecommend(args);
    case 'site_intel_page':
      return await handlePage(args);
    case 'site_intel_drift':
      return await handleDrift(args);
    case 'site_intel_status':
      return await handleStatus(args);
    case 'site_intel_search':
      return await handleSearch(args);
    case 'site_intel_routes':
      return await handleRoutes(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Message Handlers
async function handleInitialize(id, params) {
  sendMessage(successResponse(id, {
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    capabilities: {
      tools: {}
    }
  }));
}

async function handleToolsList(id) {
  sendMessage(successResponse(id, { tools: TOOLS }));
}

async function handleToolsCall(id, params) {
  const { name, arguments: args = {} } = params;

  try {
    const result = await handleToolCall(name, args);
    sendMessage(successResponse(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    }));
  } catch (error) {
    sendMessage(errorResponse(id, -32000, error.message, { tool: name }));
  }
}

async function handleNotificationInitialized() {
  // Client has acknowledged initialization - no response needed
}

// Main Message Router
async function handleMessage(message) {
  const { jsonrpc, id, method, params } = message;

  if (jsonrpc !== '2.0') {
    sendMessage(errorResponse(id, -32600, 'Invalid JSON-RPC version'));
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        await handleInitialize(id, params);
        break;
      case 'notifications/initialized':
        await handleNotificationInitialized();
        break;
      case 'tools/list':
        await handleToolsList(id);
        break;
      case 'tools/call':
        await handleToolsCall(id, params);
        break;
      default:
        sendMessage(errorResponse(id, -32601, `Method not found: ${method}`));
    }
  } catch (error) {
    sendMessage(errorResponse(id, -32603, `Internal error: ${error.message}`));
  }
}

// Stdin Reader
function startServer() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;

    try {
      const message = JSON.parse(line);
      await handleMessage(message);
    } catch (error) {
      sendMessage(errorResponse(null, -32700, `Parse error: ${error.message}`));
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });

  // Log startup to stderr (not stdout - reserved for JSON-RPC)
  console.error(`[MCP] ${SERVER_NAME} v${SERVER_VERSION} started`);
  console.error(`[MCP] Protocol: ${PROTOCOL_VERSION}`);
  console.error(`[MCP] Tools: ${TOOLS.length}`);
  console.error(`[MCP] Ready for JSON-RPC 2.0 messages on stdin`);
}

// Start the server
startServer();
