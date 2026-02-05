/**
 * Vision Dashboard Server
 *
 * Lightweight HTTP server with WebSocket support for real-time Vision status updates.
 * Part of CCASP Vision Mode - Phase 9
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { listVisions, loadVision, getVisionStatus, calculateVisionCompletion } from '../index.js';

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
 * Vision Dashboard Server
 */
export class VisionDashboardServer {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.port = options.port || 3847;
    this.host = options.host || 'localhost';
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.refreshInterval = options.refreshInterval || 2000;
    this.intervalId = null;
  }

  /**
   * Start the dashboard server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // WebSocket server for real-time updates
      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);
        console.log(`[Dashboard] Client connected. Total: ${this.clients.size}`);

        // Send initial state
        this.sendUpdate(ws);

        ws.on('close', () => {
          this.clients.delete(ws);
          console.log(`[Dashboard] Client disconnected. Total: ${this.clients.size}`);
        });

        ws.on('message', (message) => {
          this.handleWebSocketMessage(ws, message);
        });
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
        console.log(`[Dashboard] Vision Dashboard running at http://${this.host}:${this.port}`);
        this.startRefreshLoop();
        resolve({ host: this.host, port: this.port });
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.wss) {
      this.wss.close();
    }

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
      return this.handleApiRequest(req, res, pathname);
    }

    // Static files
    return this.handleStaticRequest(req, res, pathname);
  }

  /**
   * Handle API requests
   */
  async handleApiRequest(req, res, pathname) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      if (pathname === '/api/visions') {
        const visions = listVisions(this.projectRoot);
        const visionsWithStatus = await Promise.all(
          visions.map(async (v) => {
            try {
              const status = getVisionStatus(this.projectRoot, v.slug);
              return { ...v, status };
            } catch {
              return { ...v, status: null };
            }
          })
        );
        res.writeHead(200);
        res.end(JSON.stringify({ visions: visionsWithStatus }));
        return;
      }

      const visionMatch = pathname.match(/^\/api\/vision\/([^/]+)$/);
      if (visionMatch) {
        const slug = visionMatch[1];
        const vision = await loadVision(this.projectRoot, slug);
        if (!vision) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Vision not found' }));
          return;
        }
        const status = getVisionStatus(this.projectRoot, slug);
        res.writeHead(200);
        res.end(JSON.stringify({ vision, status }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle static file requests
   */
  handleStaticRequest(req, res, pathname) {
    // Default to index.html
    if (pathname === '/') {
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
          res.writeHead(404);
          res.end('Not found');
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

  /**
   * Handle WebSocket messages
   */
  async handleWebSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          // Client wants updates for specific vision
          ws.subscribedVision = data.slug;
          this.sendUpdate(ws);
          break;

        case 'refresh':
          // Force refresh
          this.sendUpdate(ws);
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  /**
   * Send update to a single client
   */
  async sendUpdate(ws) {
    try {
      const visions = listVisions(this.projectRoot);
      const visionsWithStatus = await Promise.all(
        visions.map(async (v) => {
          try {
            const vision = await loadVision(this.projectRoot, v.slug);
            if (!vision) {
              return {
                slug: v.slug,
                title: v.slug,
                status: 'error',
                completion: 0,
                alignment: 0
              };
            }

            // Calculate completion dynamically from roadmaps
            let completion = 0;
            const roadmaps = vision.execution_plan?.roadmaps || [];
            if (roadmaps.length > 0) {
              const totalCompletion = roadmaps.reduce((sum, rm) => sum + (rm.completion_percentage || 0), 0);
              completion = Math.round(totalCompletion / roadmaps.length);
            }

            // Count roadmap statuses
            const completedRoadmaps = roadmaps.filter(rm => rm.status === 'completed').length;
            const inProgressRoadmaps = roadmaps.filter(rm => rm.status === 'in_progress').length;
            const pendingRoadmaps = roadmaps.filter(rm => rm.status === 'pending' || !rm.status).length;

            // Get alignment from observer
            const alignment = vision.observer?.current_alignment ?? 1.0;

            return {
              slug: v.slug,
              title: v.title || vision?.title || v.slug,
              status: vision?.status || 'unknown',
              orchestrator: vision?.orchestrator || {},
              completion: completion,
              alignment: alignment,
              roadmaps: {
                total: roadmaps.length,
                completed: completedRoadmaps,
                in_progress: inProgressRoadmaps,
                pending: pendingRoadmaps
              },
              driftEvents: vision.observer?.drift_events?.length || 0,
              lastUpdated: vision?.updated_at || vision?.metadata?.updated || null
            };
          } catch (err) {
            console.error(`[Dashboard] Error loading vision ${v.slug}:`, err.message);
            return {
              slug: v.slug,
              title: v.slug,
              status: 'error',
              completion: 0,
              alignment: 0
            };
          }
        })
      );

      ws.send(JSON.stringify({
        type: 'update',
        timestamp: new Date().toISOString(),
        visions: visionsWithStatus
      }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  /**
   * Broadcast update to all clients
   */
  async broadcastUpdate() {
    for (const ws of this.clients) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        await this.sendUpdate(ws);
      }
    }
  }

  /**
   * Start refresh loop for real-time updates
   */
  startRefreshLoop() {
    this.intervalId = setInterval(() => {
      this.broadcastUpdate();
    }, this.refreshInterval);
  }
}

/**
 * Create and start dashboard server
 */
export async function startDashboard(projectRoot, options = {}) {
  const server = new VisionDashboardServer(projectRoot, options);
  await server.start();
  return server;
}

/**
 * Default export
 */
export default {
  VisionDashboardServer,
  startDashboard
};
