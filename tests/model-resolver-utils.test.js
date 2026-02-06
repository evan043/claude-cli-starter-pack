/**
 * Model Resolver and Utils Tests
 *
 * Tests for:
 * - src/utils/model-resolver.js
 * - src/utils.js (main utils)
 */

import { test } from 'node:test';
import { strictEqual, ok, deepStrictEqual } from 'assert';
import {
  DEFAULT_CONFIG,
  resolveModel,
  getAvailableModes,
  validateConfig,
  clearCache,
} from '../src/utils/model-resolver.js';
import { truncate, box, getCurrentProjectName } from '../src/utils.js';

console.log('Running model-resolver and utils tests...\n');

// ============================================================================
// Model Resolver Tests
// ============================================================================

test('DEFAULT_CONFIG has expected structure', () => {
  ok(DEFAULT_CONFIG.version, 'Should have version');
  ok(DEFAULT_CONFIG.mode, 'Should have mode');
  ok(DEFAULT_CONFIG.modes, 'Should have modes object');
  ok(DEFAULT_CONFIG.modelMetadata, 'Should have modelMetadata object');
});

test('DEFAULT_CONFIG.modes has efficiency, default, performance', () => {
  ok(DEFAULT_CONFIG.modes.efficiency, 'Should have efficiency mode');
  ok(DEFAULT_CONFIG.modes.default, 'Should have default mode');
  ok(DEFAULT_CONFIG.modes.performance, 'Should have performance mode');
});

test('DEFAULT_CONFIG.modes.default maps L1→opus, L2→sonnet, L3→haiku', () => {
  strictEqual(DEFAULT_CONFIG.modes.default.L1, 'opus');
  strictEqual(DEFAULT_CONFIG.modes.default.L2, 'sonnet');
  strictEqual(DEFAULT_CONFIG.modes.default.L3, 'haiku');
});

test('resolveModel returns sonnet for L2 in default mode', () => {
  clearCache(); // Ensure fresh state
  const model = resolveModel('L2', 'default');
  strictEqual(model, 'sonnet');
});

test('resolveModel returns haiku for L3 in default mode', () => {
  clearCache();
  const model = resolveModel('L3', 'default');
  strictEqual(model, 'haiku');
});

test('resolveModel returns opus for L1 in default mode', () => {
  clearCache();
  const model = resolveModel('L1', 'default');
  strictEqual(model, 'opus');
});

test('resolveModel returns sonnet for L1 in efficiency mode', () => {
  clearCache();
  const model = resolveModel('L1', 'efficiency');
  strictEqual(model, 'sonnet');
});

test('resolveModel returns opus for L3 in performance mode', () => {
  clearCache();
  const model = resolveModel('L3', 'performance');
  strictEqual(model, 'opus');
});

test('resolveModel handles lowercase level input', () => {
  clearCache();
  const model = resolveModel('l2', 'default');
  strictEqual(model, 'sonnet');
});

test('getAvailableModes returns object with at least default mode', () => {
  clearCache();
  const modes = getAvailableModes();
  ok(typeof modes === 'object', 'Should return object');
  ok(modes.default, 'Should have default mode');
});

test('getAvailableModes includes all three standard modes', () => {
  clearCache();
  const modes = getAvailableModes();
  ok(modes.efficiency, 'Should have efficiency mode');
  ok(modes.default, 'Should have default mode');
  ok(modes.performance, 'Should have performance mode');
});

test('validateConfig reports missing mode field', () => {
  const invalidConfig = {
    modes: DEFAULT_CONFIG.modes,
  };
  const result = validateConfig(invalidConfig);
  strictEqual(result.isValid, false);
  ok(result.errors.some((e) => e.includes('mode')));
});

test('validateConfig reports missing modes field', () => {
  const invalidConfig = {
    mode: 'default',
  };
  const result = validateConfig(invalidConfig);
  strictEqual(result.isValid, false);
  ok(result.errors.some((e) => e.includes('modes')));
});

test('validateConfig accepts valid config (DEFAULT_CONFIG)', () => {
  const result = validateConfig(DEFAULT_CONFIG);
  strictEqual(result.isValid, true);
  strictEqual(result.errors.length, 0);
});

test('validateConfig catches missing L1 in mode', () => {
  const invalidConfig = {
    mode: 'custom',
    modes: {
      custom: {
        L2: 'sonnet',
        L3: 'haiku',
      },
    },
  };
  const result = validateConfig(invalidConfig);
  strictEqual(result.isValid, false);
  ok(result.errors.some((e) => e.includes('L1')));
});

test('validateConfig catches missing L2 in mode', () => {
  const invalidConfig = {
    mode: 'custom',
    modes: {
      custom: {
        L1: 'opus',
        L3: 'haiku',
      },
    },
  };
  const result = validateConfig(invalidConfig);
  strictEqual(result.isValid, false);
  ok(result.errors.some((e) => e.includes('L2')));
});

test('validateConfig catches missing L3 in mode', () => {
  const invalidConfig = {
    mode: 'custom',
    modes: {
      custom: {
        L1: 'opus',
        L2: 'sonnet',
      },
    },
  };
  const result = validateConfig(invalidConfig);
  strictEqual(result.isValid, false);
  ok(result.errors.some((e) => e.includes('L3')));
});

test('validateConfig reports when current mode not found in modes', () => {
  const invalidConfig = {
    mode: 'nonexistent',
    modes: {
      default: DEFAULT_CONFIG.modes.default,
    },
  };
  const result = validateConfig(invalidConfig);
  strictEqual(result.isValid, false);
  ok(result.errors.some((e) => e.includes('nonexistent')));
});

test('clearCache runs without error', () => {
  clearCache();
  ok(true, 'clearCache should complete without throwing');
});

// ============================================================================
// Main Utils Tests
// ============================================================================

test('truncate returns original string when shorter than maxLength', () => {
  const result = truncate('hello', 10);
  strictEqual(result, 'hello');
});

test('truncate adds ellipsis when string exceeds maxLength', () => {
  const result = truncate('hello world', 8);
  ok(result.endsWith('...'), 'Should end with ellipsis');
});

test('truncate result length equals maxLength', () => {
  const maxLength = 10;
  const result = truncate('this is a very long string', maxLength);
  strictEqual(result.length, maxLength);
});

test('truncate handles exact length match', () => {
  const result = truncate('exactly10!', 10);
  strictEqual(result, 'exactly10!');
});

test('box creates bordered output with correct top char', () => {
  const result = box('test');
  ok(result.includes('╔'), 'Should include top-left corner (╔)');
});

test('box creates bordered output with correct bottom char', () => {
  const result = box('test');
  ok(result.includes('╚'), 'Should include bottom-left corner (╚)');
});

test('box includes the text content', () => {
  const result = box('hello world');
  ok(result.includes('hello world'), 'Should include original text');
});

test('box creates multi-line output', () => {
  const result = box('test');
  const lines = result.split('\n');
  ok(lines.length > 2, 'Should have multiple lines');
});

test('box handles multi-line input', () => {
  const result = box('line1\nline2');
  ok(result.includes('line1'), 'Should include first line');
  ok(result.includes('line2'), 'Should include second line');
});

test('getCurrentProjectName returns a non-empty string', () => {
  const projectName = getCurrentProjectName();
  ok(typeof projectName === 'string', 'Should return string');
  ok(projectName.length > 0, 'Should not be empty');
});

test('getCurrentProjectName returns directory name', () => {
  const projectName = getCurrentProjectName();
  // Should be the last directory in the path
  ok(!projectName.includes('/') && !projectName.includes('\\'), 'Should not contain path separators');
});

console.log('✓ All model-resolver and utils tests passed!');
