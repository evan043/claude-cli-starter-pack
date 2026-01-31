/**
 * Cross-Platform Path Utilities Tests
 *
 * Tests for src/utils/paths.js to verify Windows/macOS/Linux compatibility
 */

import { strictEqual, ok } from 'assert';
import {
  toForwardSlashes,
  toNativePath,
  pathsEqual,
  getPathSegment,
  claudeRelativePath,
  isWindows,
  normalizeLineEndings,
  nodeCommand,
  storagePath
} from '../src/utils/paths.js';
import { sep } from 'path';

console.log('Running cross-platform path tests...\n');

// Test: toForwardSlashes
console.log('Testing toForwardSlashes...');
strictEqual(toForwardSlashes('C:\\Users\\test\\project'), 'C:/Users/test/project');
strictEqual(toForwardSlashes('/home/user/project'), '/home/user/project');
strictEqual(toForwardSlashes('relative\\path\\file.js'), 'relative/path/file.js');
strictEqual(toForwardSlashes(null), null);
strictEqual(toForwardSlashes(''), '');
console.log('  ✓ toForwardSlashes passed\n');

// Test: toNativePath
console.log('Testing toNativePath...');
const testPath = 'some/path/to/file';
const nativePath = toNativePath(testPath);
ok(nativePath.includes(sep), `Expected native separator (${sep}) in path`);
strictEqual(toNativePath(null), null);
console.log('  ✓ toNativePath passed\n');

// Test: pathsEqual
console.log('Testing pathsEqual...');
ok(pathsEqual('C:\\Users\\test', 'C:/Users/test'), 'Should match Windows and Unix paths');
ok(pathsEqual('/home/user/', '/home/user'), 'Should ignore trailing slashes');
ok(pathsEqual('PATH/TO/FILE', 'path/to/file'), 'Should be case-insensitive');
ok(!pathsEqual('/home/user1', '/home/user2'), 'Should detect different paths');
ok(pathsEqual(null, null), 'Should handle nulls');
ok(!pathsEqual('/path', null), 'Should handle mixed null');
console.log('  ✓ pathsEqual passed\n');

// Test: getPathSegment
console.log('Testing getPathSegment...');
strictEqual(getPathSegment('/home/user/project'), 'project');
strictEqual(getPathSegment('C:\\Users\\test\\folder'), 'folder');
strictEqual(getPathSegment('single'), 'single');
strictEqual(getPathSegment(''), '');
strictEqual(getPathSegment(null), '');
console.log('  ✓ getPathSegment passed\n');

// Test: claudeRelativePath
console.log('Testing claudeRelativePath...');
strictEqual(claudeRelativePath('hooks', 'script.js'), '.claude/hooks/script.js');
strictEqual(claudeRelativePath('config', 'tech-stack.json'), '.claude/config/tech-stack.json');
strictEqual(claudeRelativePath('commands'), '.claude/commands');
console.log('  ✓ claudeRelativePath passed\n');

// Test: isWindows
console.log('Testing isWindows...');
strictEqual(typeof isWindows(), 'boolean');
strictEqual(isWindows(), process.platform === 'win32');
console.log(`  ✓ isWindows passed (current platform: ${process.platform})\n`);

// Test: normalizeLineEndings
console.log('Testing normalizeLineEndings...');
strictEqual(normalizeLineEndings('line1\r\nline2\r\n'), 'line1\nline2\n');
strictEqual(normalizeLineEndings('line1\nline2\n'), 'line1\nline2\n');
strictEqual(normalizeLineEndings('mixed\r\nand\nunix'), 'mixed\nand\nunix');
strictEqual(normalizeLineEndings(null), null);
console.log('  ✓ normalizeLineEndings passed\n');

// Test: nodeCommand
console.log('Testing nodeCommand...');
strictEqual(nodeCommand('.claude/hooks/script.js'), 'node .claude/hooks/script.js');
strictEqual(nodeCommand('.claude\\hooks\\script.js'), 'node .claude/hooks/script.js');
console.log('  ✓ nodeCommand passed\n');

// Test: storagePath
console.log('Testing storagePath...');
strictEqual(storagePath('C:\\Users\\test\\project'), 'C:/Users/test/project');
strictEqual(storagePath('/home/user/project'), '/home/user/project');
console.log('  ✓ storagePath passed\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All cross-platform path tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
