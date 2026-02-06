/**
 * Website Intelligence - Layer 4: Semantic Memory
 *
 * Manages time-versioned page summaries in ChromaDB (via claude-mem MCP)
 * and JSON-based structured storage for the page inventory.
 */

import fs from 'fs';
import path from 'path';

/**
 * Get the site-intel data directory for a domain
 * @param {string} projectRoot - Project root
 * @param {string} domain - Website domain
 * @returns {string} Data directory path
 */
export function getDataDir(projectRoot, domain) {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '_');
  return path.join(projectRoot, '.claude', 'site-intel', safeDomain);
}

/**
 * Save a scan result to disk
 * @param {string} projectRoot - Project root
 * @param {string} domain - Website domain
 * @param {string} scanId - Scan identifier
 * @param {Object} data - Data to save (crawl, summaries, graph)
 * @returns {Object} Result
 */
export function saveScan(projectRoot, domain, scanId, data) {
  const dataDir = getDataDir(projectRoot, domain);
  const scanDir = path.join(dataDir, 'scans', scanId);
  fs.mkdirSync(scanDir, { recursive: true });

  // Save each layer's data separately
  if (data.crawl) {
    fs.writeFileSync(
      path.join(scanDir, 'crawl.json'),
      JSON.stringify(data.crawl, null, 2)
    );
  }

  if (data.summaries) {
    fs.writeFileSync(
      path.join(scanDir, 'summaries.json'),
      JSON.stringify(data.summaries, null, 2)
    );
  }

  if (data.graph) {
    fs.writeFileSync(
      path.join(scanDir, 'graph.json'),
      JSON.stringify(data.graph, null, 2)
    );
  }

  // Update the "latest" symlink/reference
  const latestPath = path.join(dataDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify({
    scanId,
    domain,
    savedAt: new Date().toISOString(),
    scanDir
  }, null, 2));

  return { success: true, scanDir };
}

/**
 * Load the latest scan for a domain
 * @param {string} projectRoot - Project root
 * @param {string} domain - Website domain
 * @returns {Object|null} Latest scan data or null
 */
export function loadLatestScan(projectRoot, domain) {
  const dataDir = getDataDir(projectRoot, domain);
  const latestPath = path.join(dataDir, 'latest.json');

  if (!fs.existsSync(latestPath)) return null;

  try {
    const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    const scanDir = latest.scanDir;

    const result = { scanId: latest.scanId, domain, savedAt: latest.savedAt };

    const crawlPath = path.join(scanDir, 'crawl.json');
    if (fs.existsSync(crawlPath)) {
      result.crawl = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));
    }

    const summariesPath = path.join(scanDir, 'summaries.json');
    if (fs.existsSync(summariesPath)) {
      result.summaries = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
    }

    const graphPath = path.join(scanDir, 'graph.json');
    if (fs.existsSync(graphPath)) {
      result.graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    }

    return result;
  } catch (err) {
    return null;
  }
}

/**
 * Load a specific scan by ID
 * @param {string} projectRoot - Project root
 * @param {string} domain - Website domain
 * @param {string} scanId - Scan identifier
 * @returns {Object|null} Scan data or null
 */
export function loadScan(projectRoot, domain, scanId) {
  const dataDir = getDataDir(projectRoot, domain);
  const scanDir = path.join(dataDir, 'scans', scanId);

  if (!fs.existsSync(scanDir)) return null;

  const result = { scanId, domain };

  try {
    const crawlPath = path.join(scanDir, 'crawl.json');
    if (fs.existsSync(crawlPath)) {
      result.crawl = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));
    }

    const summariesPath = path.join(scanDir, 'summaries.json');
    if (fs.existsSync(summariesPath)) {
      result.summaries = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
    }

    const graphPath = path.join(scanDir, 'graph.json');
    if (fs.existsSync(graphPath)) {
      result.graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * List all scans for a domain
 * @param {string} projectRoot - Project root
 * @param {string} domain - Website domain
 * @returns {Object[]} List of scan summaries
 */
export function listScans(projectRoot, domain) {
  const dataDir = getDataDir(projectRoot, domain);
  const scansDir = path.join(dataDir, 'scans');

  if (!fs.existsSync(scansDir)) return [];

  return fs.readdirSync(scansDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const crawlPath = path.join(scansDir, d.name, 'crawl.json');
      let pageCount = 0;
      let savedAt = null;

      if (fs.existsSync(crawlPath)) {
        try {
          const crawl = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));
          pageCount = crawl.stats?.pagesCrawled || 0;
          savedAt = crawl.stats?.duration ? new Date().toISOString() : null;
        } catch { /* ignore */ }
      }

      return {
        scanId: d.name,
        pageCount,
        savedAt
      };
    })
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

/**
 * List all scanned domains
 * @param {string} projectRoot - Project root
 * @returns {Object[]} List of domains with scan info
 */
export function listDomains(projectRoot) {
  const siteIntelDir = path.join(projectRoot, '.claude', 'site-intel');

  if (!fs.existsSync(siteIntelDir)) return [];

  return fs.readdirSync(siteIntelDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const latestPath = path.join(siteIntelDir, d.name, 'latest.json');
      let latest = null;
      if (fs.existsSync(latestPath)) {
        try { latest = JSON.parse(fs.readFileSync(latestPath, 'utf8')); } catch { /* ignore */ }
      }
      return {
        domain: d.name,
        lastScan: latest?.savedAt || null,
        lastScanId: latest?.scanId || null
      };
    });
}

/**
 * Generate ChromaDB documents from page summaries for vector storage
 * @param {Object} summaryResult - Result from summarizeAllPages()
 * @param {string} scanId - Scan identifier
 * @returns {Object} ChromaDB-ready documents
 */
export function toChromaDocuments(summaryResult, scanId) {
  if (!summaryResult?.summaries) return { documents: [], ids: [], metadatas: [] };

  const documents = [];
  const ids = [];
  const metadatas = [];

  for (const summary of summaryResult.summaries) {
    const docText = [
      `Page: ${summary.url}`,
      `Purpose: ${summary.purpose}`,
      `Type: ${summary.classification.type}`,
      `Primary User: ${summary.primaryUser}`,
      `Business Value: ${summary.businessValue.value} (${summary.businessValue.score}/10)`,
      `Features: ${summary.features.join(', ')}`,
      `Issues: ${summary.smells.map(s => s.smell).join(', ') || 'None'}`,
      `APIs: ${summary.dependencies.apis.join(', ') || 'None'}`
    ].join('\n');

    const safeId = `${scanId}__${summary.url.replace(/[^a-z0-9]/gi, '_')}`.substring(0, 200);

    documents.push(docText);
    ids.push(safeId);
    metadatas.push({
      url: summary.url,
      scanId,
      type: summary.classification.type,
      purpose: summary.purpose,
      primaryUser: summary.primaryUser,
      businessValue: String(summary.businessValue.score),
      smellCount: String(summary.smells.length),
      scanDate: new Date().toISOString()
    });
  }

  return { documents, ids, metadatas };
}

/**
 * Store page summaries to ChromaDB for vector search
 * Writes pending documents that the MCP server can ingest,
 * or stores directly if a ChromaDB adapter is provided.
 * @param {Object} chromaDocs - Output from toChromaDocuments()
 * @param {string} domain - Website domain
 * @param {Object} options - Options
 * @returns {Object} Storage result
 */
export function storeToChroma(chromaDocs, domain, options = {}) {
  const { projectRoot = process.cwd() } = options;

  if (!chromaDocs?.documents?.length) {
    return { stored: false, error: 'No documents to store' };
  }

  try {
    const dataDir = getDataDir(projectRoot, domain);
    fs.mkdirSync(dataDir, { recursive: true });

    const pendingFile = path.join(dataDir, 'chroma-pending.json');
    const payload = {
      collection: `site_intel_${domain.replace(/[^a-z0-9]/gi, '_')}`,
      documents: chromaDocs.documents,
      ids: chromaDocs.ids,
      metadatas: chromaDocs.metadatas,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(pendingFile, JSON.stringify(payload, null, 2));

    return {
      stored: true,
      count: chromaDocs.documents.length,
      collection: payload.collection,
      pendingFile
    };
  } catch (err) {
    return { stored: false, error: err.message };
  }
}

/**
 * Load pending ChromaDB documents for a domain
 * Used by the MCP server to ingest into vector storage
 * @param {string} projectRoot - Project root
 * @param {string} domain - Website domain
 * @returns {Object|null} Pending documents or null
 */
export function loadChromaPending(projectRoot, domain) {
  const dataDir = getDataDir(projectRoot, domain);
  const pendingFile = path.join(dataDir, 'chroma-pending.json');

  if (!fs.existsSync(pendingFile)) return null;

  try {
    return JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  } catch {
    return null;
  }
}

export default { saveScan, loadLatestScan, loadScan, listScans, listDomains, getDataDir, toChromaDocuments, storeToChroma, loadChromaPending };
