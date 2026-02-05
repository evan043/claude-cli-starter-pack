/**
 * Global Registry Tests
 *
 * Tests for src/utils/global-registry.js with cross-platform path handling
 */

import { test } from 'node:test';
import { strictEqual, ok } from 'assert';
import {
  registerProject,
  unregisterProject,
  isProjectRegistered,
  loadRegistry,
  clearRegistry,
  getRegistryStats
} from '../src/utils/global-registry.js';

console.log('Running global registry tests...\n');

test('Basic registration', () => {
  clearRegistry();
  const testPath1 = 'C:/Users/test/project1';
  const isNew1 = registerProject(testPath1, { name: 'project1', version: '1.0.0' });
  strictEqual(isNew1, true, 'First registration should return true');
  ok(isProjectRegistered(testPath1), 'Project should be registered');
});

test('Duplicate registration (same path)', () => {
  const testPath1 = 'C:/Users/test/project1';
  const isNew2 = registerProject(testPath1, { name: 'project1', version: '1.0.1' });
  strictEqual(isNew2, false, 'Duplicate registration should return false');
  const stats = getRegistryStats();
  strictEqual(stats.total, 1, 'Should still have only 1 project');
});

test('Cross-platform path matching (forward vs backslash)', () => {
  const testPath1 = 'C:/Users/test/project1';
  const backslashPath = 'C:' + '\\' + 'Users' + '\\' + 'test' + '\\' + 'project1';
  const isNew3 = registerProject(backslashPath, { name: 'project1', version: '1.0.2' });
  strictEqual(isNew3, false, 'Path with backslashes should match forward slash version');
});

test('Unregistration', () => {
  const testPath1 = 'C:/Users/test/project1';
  const removed = unregisterProject(testPath1);
  strictEqual(removed, true, 'Unregistration should return true');
  ok(!isProjectRegistered(testPath1), 'Project should no longer be registered');
});

test('Multiple projects', () => {
  clearRegistry();
  registerProject('C:/project/one', { name: 'one' });
  registerProject('C:/project/two', { name: 'two' });
  registerProject('C:/project/three', { name: 'three' });
  const stats2 = getRegistryStats();
  strictEqual(stats2.total, 3, 'Should have 3 projects');
  clearRegistry();
});

console.log('✓ All global registry tests passed!');
