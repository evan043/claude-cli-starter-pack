/**
 * Global Registry Tests
 *
 * Tests for src/utils/global-registry.js with cross-platform path handling
 */

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

// Clear registry for clean test
clearRegistry();

// Test 1: Basic registration
console.log('Testing basic registration...');
const testPath1 = 'C:/Users/test/project1';
const isNew1 = registerProject(testPath1, { name: 'project1', version: '1.0.0' });
strictEqual(isNew1, true, 'First registration should return true');
ok(isProjectRegistered(testPath1), 'Project should be registered');
console.log('  ✓ Basic registration passed\n');

// Test 2: Duplicate registration (same path)
console.log('Testing duplicate registration...');
const isNew2 = registerProject(testPath1, { name: 'project1', version: '1.0.1' });
strictEqual(isNew2, false, 'Duplicate registration should return false');
const stats = getRegistryStats();
strictEqual(stats.total, 1, 'Should still have only 1 project');
console.log('  ✓ Duplicate registration passed\n');

// Test 3: Cross-platform path matching (forward vs backslash)
console.log('Testing cross-platform path matching...');
// Create a path with backslashes programmatically
const backslashPath = 'C:' + '\\' + 'Users' + '\\' + 'test' + '\\' + 'project1';
console.log(`  Forward: ${testPath1}`);
console.log(`  Backslash: ${backslashPath}`);
const isNew3 = registerProject(backslashPath, { name: 'project1', version: '1.0.2' });
strictEqual(isNew3, false, 'Path with backslashes should match forward slash version');
console.log('  ✓ Cross-platform path matching passed\n');

// Test 4: Unregistration
console.log('Testing unregistration...');
const removed = unregisterProject(testPath1);
strictEqual(removed, true, 'Unregistration should return true');
ok(!isProjectRegistered(testPath1), 'Project should no longer be registered');
console.log('  ✓ Unregistration passed\n');

// Test 5: Multiple projects
console.log('Testing multiple projects...');
clearRegistry();
registerProject('C:/project/one', { name: 'one' });
registerProject('C:/project/two', { name: 'two' });
registerProject('C:/project/three', { name: 'three' });
const stats2 = getRegistryStats();
strictEqual(stats2.total, 3, 'Should have 3 projects');
console.log('  ✓ Multiple projects passed\n');

// Clean up
clearRegistry();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All global registry tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
