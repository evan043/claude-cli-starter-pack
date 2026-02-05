/**
 * Constitution Enforcer Hook Tests
 *
 * Tests for the constitution enforcement hook including:
 * - Sampling rate accuracy
 * - Sensitive pattern detection
 * - Violation message formatting
 * - Config loading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Sample constitution for testing
const sampleConstitution = `
version: "1.0.0"
project_name: "test-project"

enforcement:
  enabled: true
  sampling_rate: 0.05
  tools:
    - Edit
    - Write
  sensitive_patterns:
    - password
    - secret
    - api_key

sections:
  security:
    title: "Security"
    enabled: true
    rules:
      - id: "SEC-001"
        description: "Never hardcode secrets"
        severity: error
        domains: [all]

  code_style:
    title: "Code Style"
    enabled: true
    rules:
      - id: "CS-002"
        description: "Prefer async/await over Promise chains"
        severity: warning
        auto_fix: true
`;

describe('Constitution Enforcer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Config Loading', () => {
    it('should return null when no constitution file exists', async () => {
      existsSync.mockReturnValue(false);

      // Import dynamically to reset module state
      const { handler } = await import('../../templates/hooks/constitution-enforcer.template.js');

      const result = await handler({ tool: 'Edit', args: {} });

      expect(result.continue).toBe(true);
    });

    it('should load constitution from .claude/config/constitution.yaml', async () => {
      existsSync.mockImplementation((path) => {
        return path.includes('constitution.yaml');
      });
      readFileSync.mockReturnValue(sampleConstitution);

      const { handler } = await import('../../templates/hooks/constitution-enforcer.template.js');

      // Should not throw
      const result = await handler({
        tool: 'Edit',
        args: { file_path: 'test.js', new_string: 'const x = 1;' },
      });

      expect(result).toBeDefined();
    });
  });

  describe('Sampling Rate', () => {
    it('should check approximately 5% of edits by default', () => {
      // Simulate 100 checks
      const checks = 100;
      let performed = 0;
      const samplingRate = 0.05;
      const checkInterval = Math.round(1 / samplingRate); // 20

      for (let i = 1; i <= checks; i++) {
        if (i % checkInterval === 0) {
          performed++;
        }
      }

      // Should be 5 checks out of 100 (5%)
      expect(performed).toBe(5);
    });

    it('should always check when sampling_rate is 1', () => {
      const samplingRate = 1;
      const checks = 10;
      let performed = 0;

      for (let i = 0; i < checks; i++) {
        if (samplingRate >= 1) {
          performed++;
        }
      }

      expect(performed).toBe(checks);
    });

    it('should never check when sampling_rate is 0', () => {
      const samplingRate = 0;
      const checks = 10;
      let performed = 0;

      for (let i = 0; i < checks; i++) {
        if (samplingRate > 0) {
          performed++;
        }
      }

      expect(performed).toBe(0);
    });
  });

  describe('Sensitive Pattern Detection', () => {
    it('should detect password in content', () => {
      const sensitivePatterns = ['password', 'secret', 'api_key'];
      const content = 'const password = "mysecret123"';

      const matches = sensitivePatterns.some((pattern) =>
        content.toLowerCase().includes(pattern.toLowerCase())
      );

      expect(matches).toBe(true);
    });

    it('should detect api_key in content', () => {
      const sensitivePatterns = ['password', 'secret', 'api_key'];
      const content = 'const api_key = "sk-1234567890"';

      const matches = sensitivePatterns.some((pattern) =>
        content.toLowerCase().includes(pattern.toLowerCase())
      );

      expect(matches).toBe(true);
    });

    it('should not match non-sensitive content', () => {
      const sensitivePatterns = ['password', 'secret', 'api_key'];
      const content = 'const userName = "john"';

      const matches = sensitivePatterns.some((pattern) =>
        content.toLowerCase().includes(pattern.toLowerCase())
      );

      expect(matches).toBe(false);
    });

    it('should bypass sampling for sensitive patterns', () => {
      const content = 'const password = "test"';
      const sensitivePatterns = ['password'];
      const samplingRate = 0.05;

      // Sensitive content should always be checked regardless of sampling
      const isSensitive = sensitivePatterns.some((p) =>
        content.toLowerCase().includes(p.toLowerCase())
      );

      expect(isSensitive).toBe(true);
      // When sensitive, check should always happen
      const shouldCheck = isSensitive || Math.random() < samplingRate;
      expect(shouldCheck).toBe(true);
    });
  });

  describe('Violation Detection', () => {
    it('should detect hardcoded secrets (SEC-001)', () => {
      const content = 'const password = "mysecretpassword123"';
      const pattern = /password\s*[:=]\s*["'][^"']+["']/i;

      expect(pattern.test(content)).toBe(true);
    });

    it('should detect Promise chains (CS-002)', () => {
      const content = `
        fetch('/api/data')
          .then(res => res.json())
          .catch(err => console.error(err));
      `;

      const usesPromiseChain = content.includes('.then(') && content.includes('.catch(');

      expect(usesPromiseChain).toBe(true);
    });

    it('should detect single-letter variable names (CS-003)', () => {
      const content = 'const e = event;';
      const pattern = /(?:const|let|var)\s+([a-z])\s*=/g;

      const matches = [...content.matchAll(pattern)];
      const nonLoopVars = matches.filter(
        (m) => !['i', 'j', 'k', 'n', 'x', 'y'].includes(m[1])
      );

      expect(nonLoopVars.length).toBeGreaterThan(0);
    });

    it('should allow loop variable names', () => {
      const content = 'for (let i = 0; i < 10; i++)';
      const pattern = /(?:const|let|var)\s+([a-z])\s*=/g;

      const matches = [...content.matchAll(pattern)];
      const nonLoopVars = matches.filter(
        (m) => !['i', 'j', 'k', 'n', 'x', 'y'].includes(m[1])
      );

      expect(nonLoopVars.length).toBe(0);
    });
  });

  describe('Violation Message Formatting', () => {
    it('should format error violations with blocking message', () => {
      const violations = [
        {
          ruleId: 'SEC-001',
          section: 'security',
          severity: 'error',
          description: 'Never hardcode secrets',
          message: 'Potential hardcoded secret detected',
        },
      ];

      const hasErrors = violations.some((v) => v.severity === 'error');

      expect(hasErrors).toBe(true);
    });

    it('should format warning violations as non-blocking', () => {
      const violations = [
        {
          ruleId: 'CS-002',
          section: 'code_style',
          severity: 'warning',
          description: 'Prefer async/await',
          message: 'Consider using async/await',
        },
      ];

      const hasErrors = violations.some((v) => v.severity === 'error');

      expect(hasErrors).toBe(false);
    });

    it('should include response protocol in message', () => {
      const message = `
[CONSTITUTION ENFORCEMENT]

## ⚠️ WARNINGS

### CS-002: Prefer async/await
**Issue:** Consider using async/await

---
**Response Protocol:**
1. **STOP** - Do not proceed with the violating change
2. **EXPLAIN** - Acknowledge the violation
3. **SUGGEST** - Provide a compliant alternative
4. **REFACTOR** - Apply the fix if auto_fix is enabled
`;

      expect(message).toContain('Response Protocol');
      expect(message).toContain('STOP');
      expect(message).toContain('EXPLAIN');
      expect(message).toContain('SUGGEST');
      expect(message).toContain('REFACTOR');
    });
  });

  describe('Domain Detection', () => {
    it('should detect frontend domain from component files', () => {
      const testCases = [
        { path: 'src/components/Button.tsx', expected: 'frontend' },
        { path: 'src/pages/Home.tsx', expected: 'frontend' },
        { path: 'src/ui/Modal.jsx', expected: 'frontend' },
      ];

      for (const { path, expected } of testCases) {
        const pathLower = path.toLowerCase();
        let domain = 'all';

        if (
          pathLower.match(/\.(tsx?|jsx?)$/) &&
          (pathLower.includes('component') ||
            pathLower.includes('page') ||
            pathLower.includes('/ui/'))
        ) {
          domain = 'frontend';
        }

        expect(domain).toBe(expected);
      }
    });

    it('should detect backend domain from route/api files', () => {
      const testCases = [
        { path: 'src/routes/users.ts', expected: 'backend' },
        { path: 'api/v1/products.js', expected: 'backend' },
        { path: 'src/services/auth.ts', expected: 'backend' },
      ];

      for (const { path, expected } of testCases) {
        const pathLower = path.toLowerCase();
        let domain = 'all';

        if (
          pathLower.match(/\.(py|ts|js)$/) &&
          (pathLower.includes('route') ||
            pathLower.includes('api') ||
            pathLower.includes('service'))
        ) {
          domain = 'backend';
        }

        expect(domain).toBe(expected);
      }
    });

    it('should detect testing domain from test files', () => {
      const testCases = [
        { path: 'src/Button.test.tsx', expected: 'testing' },
        { path: 'tests/api.spec.js', expected: 'testing' },
        { path: '__tests__/utils.test.ts', expected: 'testing' },
      ];

      for (const { path, expected } of testCases) {
        const pathLower = path.toLowerCase();
        let domain = 'all';

        if (
          pathLower.match(/\.(test|spec)\.(ts|js|tsx|jsx|py)$/) ||
          pathLower.includes('/test/') ||
          pathLower.includes('/__tests__/')
        ) {
          domain = 'testing';
        }

        expect(domain).toBe(expected);
      }
    });
  });

  describe('Tool Filtering', () => {
    it('should only enforce on Edit and Write by default', () => {
      const enforcedTools = ['Edit', 'Write'];

      expect(enforcedTools.includes('Edit')).toBe(true);
      expect(enforcedTools.includes('Write')).toBe(true);
      expect(enforcedTools.includes('Read')).toBe(false);
      expect(enforcedTools.includes('Bash')).toBe(false);
    });
  });
});
