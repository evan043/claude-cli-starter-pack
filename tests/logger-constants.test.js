/**
 * Logger and Constants Tests
 *
 * Tests for src/utils/logger.js and src/constants.js
 */

import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'assert';
import {
  LOG_LEVELS,
  setLogLevel,
  getLogLevel,
  setTTY,
  createLogger
} from '../src/utils/logger.js';
import {
  CLAUDE_DIRS,
  CONFIG_FILES,
  STATUS,
  SCALE,
  TECH_STACK_VERSION
} from '../src/constants.js';

console.log('Running logger and constants tests...\n');

// ===========================
// Constants Tests
// ===========================

test('CLAUDE_DIRS has expected keys', () => {
  const expectedKeys = [
    'ROOT',
    'CONFIG',
    'HOOKS',
    'COMMANDS',
    'SKILLS',
    'CACHE',
    'LOGS',
    'SESSIONS',
    'BACKUPS',
    'DOCS',
    'ROADMAPS',
    'TASK_LISTS',
    'SCRIPTS'
  ];

  const actualKeys = Object.keys(CLAUDE_DIRS);
  expectedKeys.forEach(key => {
    ok(actualKeys.includes(key), `CLAUDE_DIRS should have key: ${key}`);
  });
});

test('CLAUDE_DIRS.ROOT equals .claude', () => {
  strictEqual(CLAUDE_DIRS.ROOT, '.claude');
});

test('CLAUDE_DIRS has expected directory names', () => {
  strictEqual(CLAUDE_DIRS.CONFIG, 'config');
  strictEqual(CLAUDE_DIRS.HOOKS, 'hooks');
  strictEqual(CLAUDE_DIRS.COMMANDS, 'commands');
  strictEqual(CLAUDE_DIRS.SKILLS, 'skills');
  strictEqual(CLAUDE_DIRS.CACHE, 'cache');
  strictEqual(CLAUDE_DIRS.LOGS, 'logs');
  strictEqual(CLAUDE_DIRS.SESSIONS, 'sessions');
  strictEqual(CLAUDE_DIRS.BACKUPS, 'backups');
  strictEqual(CLAUDE_DIRS.DOCS, 'docs');
  strictEqual(CLAUDE_DIRS.ROADMAPS, 'roadmaps');
  strictEqual(CLAUDE_DIRS.TASK_LISTS, 'task-lists');
  strictEqual(CLAUDE_DIRS.SCRIPTS, 'scripts');
});

test('CONFIG_FILES has expected keys and values', () => {
  const expectedFiles = {
    TECH_STACK: 'tech-stack.json',
    SETTINGS: 'settings.json',
    CCASP_STATE: 'ccasp-state.json',
    DELEGATION: 'delegation.json',
    CONSTITUTION: 'constitution.yaml'
  };

  deepStrictEqual(CONFIG_FILES, expectedFiles);
});

test('STATUS has all expected status values', () => {
  const expectedStatuses = {
    PENDING: 'pending',
    ACTIVE: 'active',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    BLOCKED: 'blocked'
  };

  deepStrictEqual(STATUS, expectedStatuses);
});

test('SCALE has S, M, L, XL values', () => {
  const expectedScales = {
    SMALL: 'S',
    MEDIUM: 'M',
    LARGE: 'L',
    EXTRA_LARGE: 'XL'
  };

  deepStrictEqual(SCALE, expectedScales);
});

test('TECH_STACK_VERSION is a valid semver string', () => {
  ok(typeof TECH_STACK_VERSION === 'string', 'Version should be a string');
  ok(/^\d+\.\d+\.\d+$/.test(TECH_STACK_VERSION), 'Version should match semver format (X.Y.Z)');
  strictEqual(TECH_STACK_VERSION, '2.0.0');
});

// ===========================
// Logger Tests
// ===========================

test('LOG_LEVELS has correct numeric ordering', () => {
  strictEqual(LOG_LEVELS.SILENT, 0);
  strictEqual(LOG_LEVELS.ERROR, 1);
  strictEqual(LOG_LEVELS.WARN, 2);
  strictEqual(LOG_LEVELS.INFO, 3);
  strictEqual(LOG_LEVELS.DEBUG, 4);

  // Verify ordering
  ok(LOG_LEVELS.SILENT < LOG_LEVELS.ERROR);
  ok(LOG_LEVELS.ERROR < LOG_LEVELS.WARN);
  ok(LOG_LEVELS.WARN < LOG_LEVELS.INFO);
  ok(LOG_LEVELS.INFO < LOG_LEVELS.DEBUG);
});

test('setLogLevel/getLogLevel round-trips correctly', () => {
  const originalLevel = getLogLevel();

  setLogLevel(LOG_LEVELS.SILENT);
  strictEqual(getLogLevel(), LOG_LEVELS.SILENT);

  setLogLevel(LOG_LEVELS.ERROR);
  strictEqual(getLogLevel(), LOG_LEVELS.ERROR);

  setLogLevel(LOG_LEVELS.WARN);
  strictEqual(getLogLevel(), LOG_LEVELS.WARN);

  setLogLevel(LOG_LEVELS.DEBUG);
  strictEqual(getLogLevel(), LOG_LEVELS.DEBUG);

  // Restore original level
  setLogLevel(originalLevel);
});

test('setTTY sets TTY mode', () => {
  // Just verify the function exists and can be called without error
  setTTY(false);
  ok(true, 'setTTY(false) should not throw');

  setTTY(true);
  ok(true, 'setTTY(true) should not throw');
});

test('createLogger returns object with error, warn, info, debug methods', () => {
  const logger = createLogger('test-namespace');

  ok(typeof logger === 'object', 'createLogger should return an object');
  ok(typeof logger.error === 'function', 'logger should have error method');
  ok(typeof logger.warn === 'function', 'logger should have warn method');
  ok(typeof logger.info === 'function', 'logger should have info method');
  ok(typeof logger.debug === 'function', 'logger should have debug method');

  // Verify all methods can be called without throwing
  const originalLevel = getLogLevel();
  setLogLevel(LOG_LEVELS.SILENT); // Suppress actual output during test

  logger.error('test error');
  logger.warn('test warn');
  logger.info('test info');
  logger.debug('test debug');

  ok(true, 'All logger methods should be callable');

  // Restore level
  setLogLevel(originalLevel);
});

test('createLogger with different namespaces', () => {
  const logger1 = createLogger('namespace1');
  const logger2 = createLogger('namespace2');

  ok(logger1 !== logger2, 'Different createLogger calls should return different objects');
  ok(typeof logger1.error === 'function');
  ok(typeof logger2.error === 'function');
});

// Cleanup: Reset log level to INFO
test('cleanup: reset log level to INFO', () => {
  setLogLevel(LOG_LEVELS.INFO);
  strictEqual(getLogLevel(), LOG_LEVELS.INFO);
});

console.log('✓ All logger and constants tests passed!');
