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
import { getRecommendations, getStatus, listSites } from '../orchestrator.js';
import { loadLatestScan } from '../memory/index.js';
import { toMermaid } from '../graph/index.js';

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
