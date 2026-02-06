/**
 * Test: Site Intelligence Dashboard
 *
 * Basic smoke tests for the dashboard server.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { startDashboard } from '../src/site-intel/dashboard/index.js';

test('Dashboard server starts and responds to API requests', async () => {
  const port = 3848; // Use different port to avoid conflicts
  let server;

  try {
    // Start server
    server = await startDashboard({ port, projectRoot: process.cwd() });

    // Test /api/sites endpoint
    const sitesResponse = await fetch(`http://localhost:${port}/api/sites`);
    assert.strictEqual(sitesResponse.status, 200, 'Sites API should return 200');

    const sitesData = await sitesResponse.json();
    assert.ok(sitesData.sites !== undefined, 'Sites response should have sites array');
    assert.ok(Array.isArray(sitesData.sites), 'Sites should be an array');

    // Test static file serving
    const htmlResponse = await fetch(`http://localhost:${port}/`);
    assert.strictEqual(htmlResponse.status, 200, 'Index page should return 200');
    assert.ok(htmlResponse.headers.get('content-type').includes('text/html'), 'Should serve HTML');

    const html = await htmlResponse.text();
    assert.ok(html.includes('CCASP Site Intelligence Dashboard'), 'Should contain dashboard title');

    console.log('✓ Dashboard server tests passed');
  } finally {
    // Clean up
    if (server) {
      await server.stop();
    }
  }
});

test('Dashboard API handles missing data gracefully', async () => {
  const port = 3849;
  let server;

  try {
    server = await startDashboard({ port, projectRoot: process.cwd() });

    // Test non-existent domain
    const statusResponse = await fetch(`http://localhost:${port}/api/sites/nonexistent.example.com/status`);
    assert.strictEqual(statusResponse.status, 200, 'Should return 200 even for non-existent domain');

    const statusData = await statusResponse.json();
    assert.strictEqual(statusData.domain, 'nonexistent.example.com', 'Should return correct domain');
    assert.ok(statusData.layers, 'Should return layer status');

    console.log('✓ Dashboard graceful error handling tests passed');
  } finally {
    if (server) {
      await server.stop();
    }
  }
});
