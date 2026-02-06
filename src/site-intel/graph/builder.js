/**
 * Website Intelligence - Layer 3: Cross-Page Graph Builder
 *
 * Builds a dependency graph showing relationships between pages:
 * - Navigation links (page -> page)
 * - Shared components
 * - Shared APIs
 * - User flows (entry -> exit paths)
 */

/**
 * Build a site graph from crawl results and summaries
 * @param {Object} crawlResult - Result from crawlSite()
 * @param {Object} summaryResult - Result from summarizeAllPages()
 * @returns {Object} Site graph
 */
export function buildSiteGraph(crawlResult, summaryResult) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  if (!crawlResult?.pages || !summaryResult?.summaries) {
    return { success: false, error: 'Missing crawl or summary data' };
  }

  // Create nodes from pages
  for (const page of crawlResult.pages) {
    if (page.error) continue;

    let pathname;
    try { pathname = new URL(page.url).pathname; } catch { pathname = page.url; }

    const summary = summaryResult.summaries.find(s => s.url === page.url);

    const node = {
      id: pathname,
      url: page.url,
      label: page.title || pathname,
      type: summary?.classification?.type || 'unknown',
      businessValue: summary?.businessValue?.score || 0,
      smellCount: summary?.smells?.length || 0,
      featureCount: summary?.features?.length || 0
    };

    nodes.push(node);
    nodeMap.set(page.url, node);
  }

  // Create edges from links
  for (const page of crawlResult.pages) {
    if (page.error || !page.links) continue;

    const sourceNode = nodeMap.get(page.url);
    if (!sourceNode) continue;

    for (const link of page.links) {
      const targetNode = nodeMap.get(link);
      if (targetNode && targetNode.id !== sourceNode.id) {
        // Check if edge already exists
        const existingEdge = edges.find(e =>
          e.source === sourceNode.id && e.target === targetNode.id
        );
        if (!existingEdge) {
          edges.push({
            source: sourceNode.id,
            target: targetNode.id,
            type: 'navigation',
            weight: 1
          });
        }
      }
    }
  }

  // Detect shared APIs
  const apiUsage = new Map(); // api path -> Set of page URLs
  for (const page of crawlResult.pages) {
    if (!page.apiCalls) continue;
    for (const api of page.apiCalls) {
      if (!apiUsage.has(api.url)) {
        apiUsage.set(api.url, new Set());
      }
      apiUsage.get(api.url).add(page.url);
    }
  }

  const sharedAPIs = Array.from(apiUsage.entries())
    .filter(([, pages]) => pages.size > 1)
    .map(([api, pages]) => ({
      endpoint: api,
      usedBy: Array.from(pages).map(u => {
        try { return new URL(u).pathname; } catch { return u; }
      }),
      usageCount: pages.size
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

  // Add API shared edges
  for (const api of sharedAPIs) {
    for (let i = 0; i < api.usedBy.length; i++) {
      for (let j = i + 1; j < api.usedBy.length; j++) {
        const existingEdge = edges.find(e =>
          e.source === api.usedBy[i] && e.target === api.usedBy[j] && e.type === 'shared-api'
        );
        if (!existingEdge) {
          edges.push({
            source: api.usedBy[i],
            target: api.usedBy[j],
            type: 'shared-api',
            label: api.endpoint,
            weight: 2
          });
        }
      }
    }
  }

  // Detect user flows (sequences of navigation)
  const userFlows = detectUserFlows(nodes, edges);

  // Calculate graph metrics
  const metrics = calculateGraphMetrics(nodes, edges);

  return {
    success: true,
    nodes,
    edges,
    sharedAPIs,
    userFlows,
    metrics,
    builtAt: new Date().toISOString()
  };
}

/**
 * Detect user flows (common navigation paths)
 * @param {Object[]} nodes - Graph nodes
 * @param {Object[]} edges - Graph edges
 * @returns {Object[]} Detected user flows
 */
function detectUserFlows(nodes, edges) {
  const flows = [];
  const navEdges = edges.filter(e => e.type === 'navigation');

  // Find entry points (pages with no incoming nav edges or homepage/login)
  const entryTypes = ['homepage', 'authentication', 'registration'];
  const entryNodes = nodes.filter(n =>
    entryTypes.includes(n.type) ||
    !navEdges.some(e => e.target === n.id)
  );

  // For each entry point, trace paths (BFS, max depth 5)
  for (const entry of entryNodes.slice(0, 5)) { // Limit to 5 entry points
    const visited = new Set();
    const queue = [[entry.id]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (visited.has(current) || path.length > 5) continue;
      visited.add(current);

      const outgoing = navEdges.filter(e => e.source === current);

      if (outgoing.length === 0 && path.length > 1) {
        // End of flow
        flows.push({
          name: `${path[0]} → ${current}`,
          steps: [...path],
          length: path.length,
          type: path.length <= 2 ? 'direct' : 'multi-step'
        });
      }

      for (const edge of outgoing) {
        if (!path.includes(edge.target)) {
          queue.push([...path, edge.target]);
        }
      }
    }
  }

  // Sort by length (shorter flows first) and deduplicate
  return flows
    .sort((a, b) => a.length - b.length)
    .slice(0, 20); // Cap at 20 flows
}

/**
 * Calculate graph metrics
 * @param {Object[]} nodes - Graph nodes
 * @param {Object[]} edges - Graph edges
 * @returns {Object} Graph metrics
 */
function calculateGraphMetrics(nodes, edges) {
  // In-degree and out-degree per node
  const inDegree = new Map();
  const outDegree = new Map();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  const navEdges = edges.filter(e => e.type === 'navigation');
  for (const edge of navEdges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find hub pages (high out-degree) and authority pages (high in-degree)
  const hubs = nodes
    .map(n => ({ ...n, outDegree: outDegree.get(n.id) || 0 }))
    .sort((a, b) => b.outDegree - a.outDegree)
    .slice(0, 5);

  const authorities = nodes
    .map(n => ({ ...n, inDegree: inDegree.get(n.id) || 0 }))
    .sort((a, b) => b.inDegree - a.inDegree)
    .slice(0, 5);

  // Find orphan pages (no incoming or outgoing nav edges)
  const orphans = nodes.filter(n =>
    (inDegree.get(n.id) || 0) === 0 && (outDegree.get(n.id) || 0) === 0
  );

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    navEdgeCount: navEdges.length,
    avgInDegree: nodes.length > 0 ? Math.round(navEdges.length / nodes.length * 10) / 10 : 0,
    hubs: hubs.map(h => ({ id: h.id, outDegree: h.outDegree })),
    authorities: authorities.map(a => ({ id: a.id, inDegree: a.inDegree })),
    orphans: orphans.map(o => o.id),
    orphanCount: orphans.length
  };
}

/**
 * Generate Mermaid diagram from site graph
 * @param {Object} siteGraph - Result from buildSiteGraph()
 * @returns {string} Mermaid diagram syntax
 */
export function toMermaid(siteGraph) {
  if (!siteGraph?.nodes?.length) return 'graph TD\n    empty[No pages found]';

  const lines = ['graph TD'];

  // Add nodes with styling based on type
  for (const node of siteGraph.nodes) {
    const label = node.label.replace(/"/g, "'").substring(0, 30);
    const shape = node.type === 'homepage' ? `((${label}))` :
                  node.type === 'authentication' ? `{${label}}` :
                  node.type === 'error' ? `>${label}]` :
                  `[${label}]`;
    const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`    ${safeId}${shape}`);
  }

  // Add navigation edges (limit to avoid clutter)
  const navEdges = siteGraph.edges
    .filter(e => e.type === 'navigation')
    .slice(0, 30);

  for (const edge of navEdges) {
    const sourceId = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
    const targetId = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`    ${sourceId} --> ${targetId}`);
  }

  // Add shared-api edges with different style
  const apiEdges = siteGraph.edges
    .filter(e => e.type === 'shared-api')
    .slice(0, 10);

  for (const edge of apiEdges) {
    const sourceId = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
    const targetId = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`    ${sourceId} -.->|${edge.label || 'API'}| ${targetId}`);
  }

  return lines.join('\n');
}

export default { buildSiteGraph, toMermaid };
