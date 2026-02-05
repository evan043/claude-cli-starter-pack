/**
 * Vision Dashboard Module
 *
 * Web-based dashboard for real-time Vision status monitoring.
 * Part of CCASP Vision Mode - Phase 9
 */

export { VisionDashboardServer, startDashboard } from './server.js';

export default {
  VisionDashboardServer: null, // Will be loaded dynamically to avoid ws dependency issues
  startDashboard: null
};
