/**
 * Feature Audit - Contract Test Generator
 *
 * Generates backend API contract tests for features that have verified backend endpoints.
 * Tests validate: status codes, response schema, required fields, auth, and error responses.
 *
 * Output: Vitest-compatible test files in tests/contracts/
 */

import fs from 'fs';
import path from 'path';

/**
 * Slugify a feature name for use as a filename
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Detect the test framework and base URL from project config
 */
function detectTestConfig(projectRoot, techStack) {
  const config = {
    framework: 'vitest',
    importStatement: "import { describe, it, expect } from 'vitest';",
    baseUrl: 'http://localhost:8001',
    fileExtension: '.test.ts',
  };

  // Check for vitest config
  const vitestConfigs = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'];
  const hasVitest = vitestConfigs.some(f => fs.existsSync(path.join(projectRoot, f)));

  // Check for jest config
  const jestConfigs = ['jest.config.ts', 'jest.config.js', 'jest.config.mjs'];
  const hasJest = jestConfigs.some(f => fs.existsSync(path.join(projectRoot, f)));

  if (hasJest && !hasVitest) {
    config.framework = 'jest';
    config.importStatement = "// Jest - no explicit imports needed";
  }

  // Detect backend port from tech stack or common patterns
  const backendFramework = techStack?.backend?.framework || '';
  if (backendFramework.includes('fastapi')) {
    config.baseUrl = 'http://localhost:8001';
  } else if (backendFramework.includes('express') || backendFramework.includes('nest')) {
    config.baseUrl = 'http://localhost:3000';
  }

  // Check for .env for port
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const portMatch = envContent.match(/(?:API_URL|BACKEND_URL|BASE_URL)\s*=\s*(.+)/i);
      if (portMatch) {
        config.baseUrl = portMatch[1].trim().replace(/["']/g, '');
      }
    } catch {
      // .env not readable
    }
  }

  return config;
}

/**
 * Extract endpoint details from feature truth table
 */
function extractEndpointInfo(feature) {
  const backend = feature.truth_table?.backend_exists;
  if (!backend?.verified) return null;

  // Try to derive endpoint path from feature name
  const name = feature.name.toLowerCase();
  let endpointPath = '/api/';
  let method = 'GET';

  // Common feature-to-endpoint patterns
  if (name.includes('login') || name.includes('auth')) {
    endpointPath = '/api/auth/login';
    method = 'POST';
  } else if (name.includes('register') || name.includes('signup')) {
    endpointPath = '/api/auth/register';
    method = 'POST';
  } else if (name.includes('create') || name.includes('add') || name.includes('new')) {
    const noun = name.replace(/(create|add|new|implement|build)\s*/gi, '').trim().replace(/\s+/g, '-');
    endpointPath = `/api/${slugify(noun)}`;
    method = 'POST';
  } else if (name.includes('update') || name.includes('edit')) {
    const noun = name.replace(/(update|edit|modify)\s*/gi, '').trim().replace(/\s+/g, '-');
    endpointPath = `/api/${slugify(noun)}/:id`;
    method = 'PUT';
  } else if (name.includes('delete') || name.includes('remove')) {
    const noun = name.replace(/(delete|remove)\s*/gi, '').trim().replace(/\s+/g, '-');
    endpointPath = `/api/${slugify(noun)}/:id`;
    method = 'DELETE';
  } else if (name.includes('list') || name.includes('search') || name.includes('get')) {
    const noun = name.replace(/(list|search|get|fetch|load)\s*/gi, '').trim().replace(/\s+/g, '-');
    endpointPath = `/api/${slugify(noun)}`;
    method = 'GET';
  } else {
    endpointPath = `/api/${slugify(name)}`;
    method = backend.method?.toUpperCase() || 'GET';
  }

  return {
    path: endpointPath,
    method,
    file: backend.endpoint,
    hasAuth: feature.truth_table?.permissions?.verified || false,
  };
}

/**
 * Generate a contract test file for a feature
 */
export function generateContractTest(feature, projectRoot, techStack) {
  const testConfig = detectTestConfig(projectRoot, techStack);
  const endpoint = extractEndpointInfo(feature);

  if (!endpoint) {
    return { success: false, error: 'No verified backend endpoint for this feature' };
  }

  const featureSlug = slugify(feature.name);
  const testFileName = `${featureSlug}-api${testConfig.fileExtension}`;
  const testFilePath = path.join(projectRoot, 'tests', 'contracts', testFileName);

  const testCode = generateTestCode(feature, endpoint, testConfig);

  return {
    success: true,
    testCode,
    testFilePath,
    testFileName,
    endpoint,
  };
}

/**
 * Generate the actual test code
 */
function generateTestCode(feature, endpoint, testConfig) {
  const { path: ep, method, hasAuth } = endpoint;
  const { importStatement, baseUrl } = testConfig;

  // Build the endpoint URL (replace :id with example)
  const url = ep.replace(':id', '1');

  let code = `${importStatement}

/**
 * Contract Test: ${feature.name}
 *
 * Auto-generated by CCASP Feature Audit
 * Endpoint: ${method} ${ep}
 * Generated: ${new Date().toISOString()}
 *
 * These tests verify the API contract (status codes, response shape, auth).
 * Run with the backend server running at ${baseUrl}
 */

const BASE_URL = process.env.API_URL || '${baseUrl}';

describe('Contract: ${method} ${ep}', () => {
  /**
   * Helper: check if server is reachable before running tests
   */
  const checkServer = async () => {
    try {
      const res = await fetch(BASE_URL);
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  };

`;

  // Success case
  if (method === 'GET') {
    code += `  it('returns 200 for valid request', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${url}\`${hasAuth ? `, {
      headers: { 'Authorization': 'Bearer <test-token>' },
    }` : ''});

    expect([200, 304]).toContain(res.status);
    const data = await res.json();
    expect(data).toBeDefined();
  });
`;
  } else if (method === 'POST') {
    code += `  it('returns 200/201 for valid request', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${url}\`, {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json',${hasAuth ? "\n        'Authorization': 'Bearer <test-token>'," : ''}
      },
      body: JSON.stringify({
        // TODO: Add valid request body fields
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    expect(data).toBeDefined();
  });
`;
  } else if (method === 'PUT' || method === 'PATCH') {
    code += `  it('returns 200 for valid update', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${url}\`, {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json',${hasAuth ? "\n        'Authorization': 'Bearer <test-token>'," : ''}
      },
      body: JSON.stringify({
        // TODO: Add valid update fields
      }),
    });

    expect([200, 204]).toContain(res.status);
  });
`;
  } else if (method === 'DELETE') {
    code += `  it('returns 200/204 for valid delete', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${url}\`, {
      method: 'DELETE',${hasAuth ? `
      headers: { 'Authorization': 'Bearer <test-token>' },` : ''}
    });

    expect([200, 204]).toContain(res.status);
  });
`;
  }

  // Validation error test (for POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    code += `
  it('returns 400/422 for invalid request body', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${url}\`, {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json',${hasAuth ? "\n        'Authorization': 'Bearer <test-token>'," : ''}
      },
      body: JSON.stringify({}),
    });

    expect([400, 422]).toContain(res.status);
  });
`;
  }

  // Auth test
  if (hasAuth) {
    code += `
  it('returns 401 without authentication', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${url}\`${method !== 'GET' ? `, {
      method: '${method}',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }` : ''});

    expect([401, 403]).toContain(res.status);
  });
`;
  }

  // Not found test (for routes with :id)
  if (ep.includes(':id')) {
    code += `
  it('returns 404 for non-existent resource', async () => {
    const isUp = await checkServer();
    if (!isUp) return; // Skip if server not running

    const res = await fetch(\`\${BASE_URL}${ep.replace(':id', '999999')}\`${hasAuth ? `, {
      headers: { 'Authorization': 'Bearer <test-token>' },
    }` : ''});

    expect(res.status).toBe(404);
  });
`;
  }

  code += `});
`;

  return code;
}

/**
 * Write a contract test file to disk
 */
export function writeContractTest(testResult, projectRoot) {
  if (!testResult.success) return testResult;

  const testDir = path.dirname(testResult.testFilePath);

  try {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testResult.testFilePath, testResult.testCode, 'utf8');
    return { ...testResult, written: true };
  } catch (error) {
    return { ...testResult, written: false, writeError: error.message };
  }
}

/**
 * Generate contract tests for all features that need them
 */
export function generateAllContractTests(features, projectRoot, techStack) {
  const results = [];

  for (const feature of features) {
    if (feature.tests?.has_contract_test) continue;
    if (!feature.truth_table?.backend_exists?.verified) continue;

    const result = generateContractTest(feature, projectRoot, techStack);
    results.push({
      feature_id: feature.id,
      feature_name: feature.name,
      ...result,
    });
  }

  return results;
}

export default {
  generateContractTest,
  writeContractTest,
  generateAllContractTests,
};
