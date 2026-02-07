/**
 * Site Intelligence Dashboard Server
 *
 * Lightweight HTTP server for visual exploration of site intelligence data.
 * Part of CCASP Website Intelligence System
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRecommendations, getStatus, listSites, runQuickCheck } from '../orchestrator.js';
import { loadLatestScan } from '../memory/index.js';
import { toMermaid } from '../graph/index.js';
import { loadState, getRouteHistory } from '../dev-scan/state-manager.js';
import { formatDiffForDashboard } from '../dev-scan/diff-reporter.js';
import {
  loadFeatureAuditState,
  saveFeatureAuditState,
  runFeatureAudit,
} from '../feature-audit/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Convert component health score (0-1) to letter grade
 */
function getGrade(health) {
  if (!health && health !== 0) return 'N/A';
  const score = Math.round(health * 100);
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Site Intelligence Dashboard Server
 */
export class SiteIntelDashboardServer {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.port = options.port || 3847;
    this.host = options.host || 'localhost';
    this.server = null;
  }

  /**
   * Start the dashboard server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`[Dashboard] Port ${this.port} is already in use`);
          reject(new Error(`Port ${this.port} already in use`));
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[Dashboard] Site Intelligence Dashboard running at http://${this.host}:${this.port}`);
        resolve({ host: this.host, port: this.port });
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('[Dashboard] Server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Handle HTTP requests
   */
  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API endpoints
    if (pathname.startsWith('/api/')) {
      return this.handleApiRequest(req, res, pathname, url);
    }

    // Static files
    return this.handleStaticRequest(req, res, pathname);
  }

  /**
   * Handle API requests
   */
  async handleApiRequest(req, res, pathname, url) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // GET /api/sites - list scanned sites
      if (pathname === '/api/sites') {
        const sites = listSites({ projectRoot: this.projectRoot });
        res.writeHead(200);
        res.end(JSON.stringify({ sites }));
        return;
      }

      // GET /api/sites/:domain/status - get site status
      const statusMatch = pathname.match(/^\/api\/sites\/([^/]+)\/status$/);
      if (statusMatch) {
        const domain = decodeURIComponent(statusMatch[1]);
        const status = getStatus(domain, { projectRoot: this.projectRoot });
        res.writeHead(200);
        res.end(JSON.stringify(status));
        return;
      }

      // GET /api/sites/:domain/recommendations - get recommendations
      const recsMatch = pathname.match(/^\/api\/sites\/([^/]+)\/recommendations$/);
      if (recsMatch) {
        const domain = decodeURIComponent(recsMatch[1]);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const limit = parseInt(queryParams.limit) || 10;
        const focus = queryParams.focus || 'all';

        const recommendations = getRecommendations(domain, {
          projectRoot: this.projectRoot,
          limit,
          focus
        });

        res.writeHead(200);
        res.end(JSON.stringify(recommendations));
        return;
      }

      // GET /api/sites/:domain/graph - get graph data
      const graphMatch = pathname.match(/^\/api\/sites\/([^/]+)\/graph$/);
      if (graphMatch) {
        const domain = decodeURIComponent(graphMatch[1]);
        const scan = loadLatestScan(this.projectRoot, domain);

        if (!scan || !scan.graph) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No graph data found' }));
          return;
        }

        const queryParams = Object.fromEntries(url.searchParams.entries());
        const format = queryParams.format || 'json';

        if (format === 'mermaid') {
          const mermaid = toMermaid(scan.graph);
          res.setHeader('Content-Type', 'text/plain');
          res.writeHead(200);
          res.end(mermaid);
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ graph: scan.graph }));
        }
        return;
      }

      // GET /api/sites/:domain/pages - list all page summaries
      const pagesMatch = pathname.match(/^\/api\/sites\/([^/]+)\/pages$/);
      if (pagesMatch) {
        const domain = decodeURIComponent(pagesMatch[1]);
        const scan = loadLatestScan(this.projectRoot, domain);

        if (!scan || !scan.summaries) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No page summaries found' }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          pages: scan.summaries.summaries,
          aggregate: scan.summaries.aggregate,
          scanId: scan.scanId
        }));
        return;
      }

      // GET /api/sites/:domain/pages/:path - get single page detail
      const pageDetailMatch = pathname.match(/^\/api\/sites\/([^/]+)\/pages\/(.+)$/);
      if (pageDetailMatch) {
        const domain = decodeURIComponent(pageDetailMatch[1]);
        const pagePath = decodeURIComponent(pageDetailMatch[2]);
        const scan = loadLatestScan(this.projectRoot, domain);

        if (!scan || !scan.summaries) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No page summaries found' }));
          return;
        }

        // Find page by matching pathname
        const page = scan.summaries.summaries.find(s => {
          try {
            const url = new URL(s.url);
            return url.pathname === `/${pagePath}` || url.pathname === pagePath;
          } catch {
            return false;
          }
        });

        if (!page) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Page not found' }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({ page }));
        return;
      }

      // GET /api/sites/:domain/health - get health score
      const healthMatch = pathname.match(/^\/api\/sites\/([^/]+)\/health$/);
      if (healthMatch) {
        const domain = decodeURIComponent(healthMatch[1]);
        const status = getStatus(domain, { projectRoot: this.projectRoot });

        res.writeHead(200);
        res.end(JSON.stringify({
          domain,
          healthScore: status.healthScore,
          healthGrade: status.healthGrade,
          lastScan: status.lastScan
        }));
        return;
      }

      // GET /api/sites/:domain/performance - get performance & accessibility data
      const perfMatch = pathname.match(/^\/api\/sites\/([^/]+)\/performance$/);
      if (perfMatch) {
        const domain = decodeURIComponent(perfMatch[1]);
        const scan = loadLatestScan(this.projectRoot, domain);

        if (!scan || !scan.crawl) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No scan data found' }));
          return;
        }

        const pages = scan.crawl.pages
          .filter(p => !p.error)
          .map(p => {
            let pathname;
            try { pathname = new URL(p.url).pathname; } catch { pathname = p.url; }

            return {
              path: pathname,
              url: p.url,
              lighthouse: p.lighthouse || null,
              accessibility: p.accessibility || null,
              hasPerformanceData: !!(p.lighthouse?.success),
              hasAccessibilityData: !!(p.accessibility?.success)
            };
          });

        const withPerf = pages.filter(p => p.hasPerformanceData);
        const withA11y = pages.filter(p => p.hasAccessibilityData);

        const avgPerformance = withPerf.length > 0
          ? Math.round(withPerf.reduce((sum, p) => sum + (p.lighthouse.scores.performance || 0), 0) / withPerf.length)
          : null;
        const avgAccessibility = withPerf.length > 0
          ? Math.round(withPerf.reduce((sum, p) => sum + (p.lighthouse.scores.accessibility || 0), 0) / withPerf.length)
          : null;
        const totalViolations = withA11y.reduce((sum, p) => sum + (p.accessibility.violationCount || 0), 0);

        res.writeHead(200);
        res.end(JSON.stringify({
          domain,
          scanId: scan.scanId,
          summary: {
            pagesWithPerformanceData: withPerf.length,
            pagesWithAccessibilityData: withA11y.length,
            averagePerformanceScore: avgPerformance,
            averageAccessibilityScore: avgAccessibility,
            totalAccessibilityViolations: totalViolations
          },
          pages
        }));
        return;
      }

      // ============================================================
      // Dev Scan API Endpoints
      // ============================================================

      // GET /api/dev-scan/state - full dev scan state JSON
      if (pathname === '/api/dev-scan/state') {
        const state = loadState(this.projectRoot);
        if (!state) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No dev scan state found. Run a dev scan first.' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify(state));
        return;
      }

      // GET /api/dev-scan/summary - aggregate health metrics
      if (pathname === '/api/dev-scan/summary') {
        const state = loadState(this.projectRoot);
        if (!state) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No dev scan state found' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({
          projectName: state.projectName,
          lastScanTime: state.lastScanTime,
          lastScanType: state.lastScanType,
          totalRoutes: state.totalRoutes,
          overallHealth: state.overallHealth,
          quickCheck: state.quickCheck ? {
            lastRun: state.quickCheck.lastRun,
            overallCoverage: state.quickCheck.overallCoverage,
          } : null,
          latestDiffs: {
            improvements: (state.latestDiffs?.improvements || []).length,
            regressions: (state.latestDiffs?.regressions || []).length,
            unchanged: state.latestDiffs?.unchanged || 0,
          },
        }));
        return;
      }

      // GET /api/dev-scan/routes - all routes with scores (sortable)
      if (pathname === '/api/dev-scan/routes') {
        const state = loadState(this.projectRoot);
        if (!state) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No dev scan state found' }));
          return;
        }
        const routes = Object.entries(state.routes).map(([routePath, data]) => ({
          path: routePath,
          component: data.component,
          componentFile: data.componentFile,
          scores: data.scores,
          lastScanned: data.lastScanned,
          historyLength: (data.history || []).length,
          grade: data.scores ? getGrade(data.scores.componentHealth) : 'N/A',
        }));
        res.writeHead(200);
        res.end(JSON.stringify({ routes, total: routes.length }));
        return;
      }

      // GET /api/dev-scan/routes/:path - single route detail + history
      const devRouteMatch = pathname.match(/^\/api\/dev-scan\/routes\/(.+)$/);
      if (devRouteMatch) {
        const state = loadState(this.projectRoot);
        if (!state) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No dev scan state found' }));
          return;
        }
        const routePath = '/' + decodeURIComponent(devRouteMatch[1]);
        const routeData = state.routes[routePath];
        if (!routeData) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Route not found: ${routePath}` }));
          return;
        }
        const history = getRouteHistory(state, routePath);
        res.writeHead(200);
        res.end(JSON.stringify({ route: routePath, ...routeData, history }));
        return;
      }

      // GET /api/dev-scan/diffs - latest diff report
      if (pathname === '/api/dev-scan/diffs') {
        const state = loadState(this.projectRoot);
        if (!state || !state.latestDiffs) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No diff data found' }));
          return;
        }
        const dashboardDiffs = formatDiffForDashboard(state.latestDiffs, {
          commitRange: state.latestDiffs.commitRange,
          changedFiles: state.latestDiffs.changedFiles,
          affectedRoutes: state.latestDiffs.affectedRoutes,
        });
        res.writeHead(200);
        res.end(JSON.stringify(dashboardDiffs));
        return;
      }

      // GET /api/dev-scan/history/:path - score trend data for sparklines
      const devHistoryMatch = pathname.match(/^\/api\/dev-scan\/history\/(.+)$/);
      if (devHistoryMatch) {
        const state = loadState(this.projectRoot);
        if (!state) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No dev scan state found' }));
          return;
        }
        const routePath = '/' + decodeURIComponent(devHistoryMatch[1]);
        const history = getRouteHistory(state, routePath);
        res.writeHead(200);
        res.end(JSON.stringify({
          route: routePath,
          history,
          sparklineData: history.map(h => ({
            timestamp: h.timestamp,
            health: h.scores?.componentHealth || 0,
            testId: h.scores?.testIdCoverage || 0,
          })),
        }));
        return;
      }

      // GET /api/dev-scan/testid-coverage - quick-check results
      if (pathname === '/api/dev-scan/testid-coverage') {
        const state = loadState(this.projectRoot);
        if (!state || !state.quickCheck) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No quick-check data found. Run /site-intel quick-check first.' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify(state.quickCheck));
        return;
      }

      // ============================================================
      // Feature Audit API Endpoints
      // ============================================================

      // GET /api/feature-audit/state - full feature audit state
      if (pathname === '/api/feature-audit/state') {
        const auditState = loadFeatureAuditState(this.projectRoot);
        if (!auditState) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No feature audit data. Run /feature-audit first.' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify(auditState));
        return;
      }

      // GET /api/feature-audit/summary - summary metrics
      if (pathname === '/api/feature-audit/summary') {
        const auditState = loadFeatureAuditState(this.projectRoot);
        if (!auditState) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No feature audit data' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify(auditState.summary || {}));
        return;
      }

      // GET /api/feature-audit/features - all features with truth tables
      if (pathname === '/api/feature-audit/features') {
        const auditState = loadFeatureAuditState(this.projectRoot);
        if (!auditState) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No feature audit data' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ features: auditState.features || [], total: (auditState.features || []).length }));
        return;
      }

      // GET /api/feature-audit/features/:id - single feature detail
      const ftFeatureMatch = pathname.match(/^\/api\/feature-audit\/features\/(.+)$/);
      if (ftFeatureMatch) {
        const auditState = loadFeatureAuditState(this.projectRoot);
        if (!auditState) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No feature audit data' }));
          return;
        }
        const featureId = decodeURIComponent(ftFeatureMatch[1]);
        const feature = (auditState.features || []).find(f => f.id === featureId);
        if (!feature) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Feature not found: ${featureId}` }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ feature }));
        return;
      }

      // GET /api/feature-audit/gaps - gaps sorted by priority
      if (pathname === '/api/feature-audit/gaps') {
        const auditState = loadFeatureAuditState(this.projectRoot);
        if (!auditState) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No feature audit data' }));
          return;
        }
        const { getGapsSorted, generateRecommendations } = await import('../feature-audit/gap-analyzer.js');
        const gaps = getGapsSorted(auditState.features || []);
        const recommendations = generateRecommendations(gaps);
        res.writeHead(200);
        res.end(JSON.stringify({ gaps: recommendations, total: recommendations.length }));
        return;
      }

      // POST /api/feature-audit/run - trigger a new feature audit
      if (pathname === '/api/feature-audit/run' && req.method === 'POST') {
        try {
          const result = await runFeatureAudit(this.projectRoot);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: result.success,
            summary: result.summary,
            gaps_count: result.gaps?.length || 0,
            message: result.message || 'Feature audit completed',
          }));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Not found
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      console.error('[Dashboard] API error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle static file requests
   */
  handleStaticRequest(req, res, pathname) {
    // Default to index.html for SPA routing
    if (pathname === '/' || !pathname.includes('.')) {
      pathname = '/index.html';
    }

    const staticDir = path.join(__dirname, 'static');
    const filePath = path.join(staticDir, pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(staticDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // For SPA routing, serve index.html if file not found
          const indexPath = path.join(staticDir, 'index.html');
          fs.readFile(indexPath, (indexErr, indexData) => {
            if (indexErr) {
              res.writeHead(404);
              res.end('Not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexData);
            }
          });
        } else {
          res.writeHead(500);
          res.end('Server error');
        }
        return;
      }

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    });
  }
}

/**
 * Create and start dashboard server
 */
export function startDashboard(options = {}) {
  const { port = 3847, projectRoot = process.cwd() } = options;
  const server = new SiteIntelDashboardServer(projectRoot, { port });
  return server.start().then(() => server);
}

/**
 * Default export
 */
export default {
  SiteIntelDashboardServer,
  startDashboard
};
