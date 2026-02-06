import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addRouteEdges } from '../src/site-intel/graph/builder.js';

describe('site-intel route tracing', () => {
  // Base graph that matches buildSiteGraph output structure
  const baseGraph = () => ({
    success: true,
    nodes: [
      { id: '/', url: 'https://example.com/', label: 'Home', type: 'homepage', businessValue: 8, smellCount: 0, featureCount: 3 },
      { id: '/login', url: 'https://example.com/login', label: 'Login', type: 'authentication', businessValue: 9, smellCount: 1, featureCount: 2 }
    ],
    edges: [
      { source: '/', target: '/login', type: 'navigation', weight: 1 }
    ],
    sharedAPIs: [],
    userFlows: [],
    metrics: { nodeCount: 2, edgeCount: 1, navEdgeCount: 1, routeEdgeCount: 0, componentEdgeCount: 0, apiClientEdgeCount: 0 },
    builtAt: new Date().toISOString()
  });

  // Mock route data matching parseRoutes() output
  const mockRouteData = {
    success: true,
    framework: 'react-router-v6',
    routes: [
      {
        path: '/dashboard',
        component: 'DashboardPage',
        componentFile: 'src/pages/Dashboard.tsx',
        hooks: ['useBenefits', 'useAuth'],
        apiCalls: ['/api/benefits', '/api/user'],
        children: []
      },
      {
        path: '/settings',
        component: 'SettingsPage',
        componentFile: 'src/pages/Settings.tsx',
        hooks: ['useAuth'],
        apiCalls: ['/api/settings'],
        children: []
      }
    ],
    summary: { totalRoutes: 2, totalComponents: 2, totalHooks: 3, totalApiCalls: 3 }
  };

  describe('addRouteEdges', () => {
    it('adds route edges from route data', () => {
      const graph = baseGraph();
      addRouteEdges(graph, mockRouteData);

      const routeEdges = graph.edges.filter(e => e.type === 'route');
      assert.equal(routeEdges.length, 2);
      assert.ok(routeEdges.find(e => e.source === '/dashboard' && e.target === 'DashboardPage'));
      assert.ok(routeEdges.find(e => e.source === '/settings' && e.target === 'SettingsPage'));
    });

    it('adds component-uses edges for hooks', () => {
      const graph = baseGraph();
      addRouteEdges(graph, mockRouteData);

      const hookEdges = graph.edges.filter(e => e.type === 'component-uses');
      assert.equal(hookEdges.length, 3);
      assert.ok(hookEdges.find(e => e.source === 'DashboardPage' && e.target === 'useBenefits'));
      assert.ok(hookEdges.find(e => e.source === 'DashboardPage' && e.target === 'useAuth'));
      assert.ok(hookEdges.find(e => e.source === 'SettingsPage' && e.target === 'useAuth'));
    });

    it('adds api-client edges for API calls', () => {
      const graph = baseGraph();
      addRouteEdges(graph, mockRouteData);

      const apiEdges = graph.edges.filter(e => e.type === 'api-client');
      assert.equal(apiEdges.length, 3);
      assert.ok(apiEdges.find(e => e.source === 'DashboardPage' && e.target === '/api/benefits'));
      assert.ok(apiEdges.find(e => e.source === 'DashboardPage' && e.target === '/api/user'));
      assert.ok(apiEdges.find(e => e.source === 'SettingsPage' && e.target === '/api/settings'));
    });

    it('adds component nodes when not already present', () => {
      const graph = baseGraph();
      const originalNodeCount = graph.nodes.length;
      addRouteEdges(graph, mockRouteData);

      assert.equal(graph.nodes.length, originalNodeCount + 2);
      const dashNode = graph.nodes.find(n => n.id === 'DashboardPage');
      assert.ok(dashNode);
      assert.equal(dashNode.type, 'component');
    });

    it('does not duplicate edges on repeated calls', () => {
      const graph = baseGraph();
      addRouteEdges(graph, mockRouteData);
      const edgeCount1 = graph.edges.length;

      addRouteEdges(graph, mockRouteData);
      assert.equal(graph.edges.length, edgeCount1);
    });

    it('preserves existing navigation edges', () => {
      const graph = baseGraph();
      addRouteEdges(graph, mockRouteData);

      const navEdges = graph.edges.filter(e => e.type === 'navigation');
      assert.equal(navEdges.length, 1);
      assert.equal(navEdges[0].source, '/');
      assert.equal(navEdges[0].target, '/login');
    });

    it('handles null/missing routeData gracefully', () => {
      const graph = baseGraph();
      const result = addRouteEdges(graph, null);
      assert.equal(result.edges.length, 1); // Original nav edge only
    });

    it('handles empty routes array', () => {
      const graph = baseGraph();
      addRouteEdges(graph, { success: true, routes: [] });
      assert.equal(graph.edges.length, 1);
    });

    it('handles route with no component', () => {
      const graph = baseGraph();
      addRouteEdges(graph, {
        success: true,
        routes: [{ path: '/empty', component: null, hooks: [], apiCalls: [], children: [] }]
      });
      // Should not add any edges for route without component
      const routeEdges = graph.edges.filter(e => e.type === 'route');
      assert.equal(routeEdges.length, 0);
    });

    it('recalculates metrics after adding edges', () => {
      const graph = baseGraph();
      addRouteEdges(graph, mockRouteData);

      assert.equal(graph.metrics.routeEdgeCount, 2);
      assert.equal(graph.metrics.componentEdgeCount, 3);
      assert.equal(graph.metrics.apiClientEdgeCount, 3);
      assert.equal(graph.metrics.nodeCount, 4); // 2 original + 2 components
    });

    it('handles nested routes correctly', () => {
      const nestedRouteData = {
        success: true,
        routes: [
          {
            path: '/admin',
            component: 'AdminLayout',
            hooks: [],
            apiCalls: [],
            children: [
              {
                path: '/admin/users',
                component: 'UsersPage',
                hooks: ['useUsers'],
                apiCalls: ['/api/users'],
                children: []
              }
            ]
          }
        ]
      };

      const graph = baseGraph();
      addRouteEdges(graph, nestedRouteData);

      // Should only add edges for top-level routes (children are handled by route-parser)
      const routeEdges = graph.edges.filter(e => e.type === 'route');
      assert.ok(routeEdges.find(e => e.source === '/admin' && e.target === 'AdminLayout'));
    });
  });
});
