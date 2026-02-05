/**
 * Cross-Platform Path Utilities Tests
 *
 * Tests for src/utils/paths.js to verify Windows/macOS/Linux compatibility
 */

import { test } from 'node:test';
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

test('toForwardSlashes', () => {
  strictEqual(toForwardSlashes('C:\\Users\\test\\project'), 'C:/Users/test/project');
  strictEqual(toForwardSlashes('/home/user/project'), '/home/user/project');
  strictEqual(toForwardSlashes('relative\\path\\file.js'), 'relative/path/file.js');
  strictEqual(toForwardSlashes(null), null);
  strictEqual(toForwardSlashes(''), '');
});

test('toNativePath', () => {
  const testPath = 'some/path/to/file';
  const nativePath = toNativePath(testPath);
  ok(nativePath.includes(sep), `Expected native separator (${sep}) in path`);
  strictEqual(toNativePath(null), null);
});

test('pathsEqual', () => {
  ok(pathsEqual('C:\\Users\\test', 'C:/Users/test'), 'Should match Windows and Unix paths');
  ok(pathsEqual('/home/user/', '/home/user'), 'Should ignore trailing slashes');
  ok(pathsEqual('PATH/TO/FILE', 'path/to/file'), 'Should be case-insensitive');
  ok(!pathsEqual('/home/user1', '/home/user2'), 'Should detect different paths');
  ok(pathsEqual(null, null), 'Should handle nulls');
  ok(!pathsEqual('/path', null), 'Should handle mixed null');
});

test('getPathSegment', () => {
  strictEqual(getPathSegment('/home/user/project'), 'project');
  strictEqual(getPathSegment('C:\\Users\\test\\folder'), 'folder');
  strictEqual(getPathSegment('single'), 'single');
  strictEqual(getPathSegment(''), '');
  strictEqual(getPathSegment(null), '');
});

test('claudeRelativePath', () => {
  strictEqual(claudeRelativePath('hooks', 'script.js'), '.claude/hooks/script.js');
  strictEqual(claudeRelativePath('config', 'tech-stack.json'), '.claude/config/tech-stack.json');
  strictEqual(claudeRelativePath('commands'), '.claude/commands');
});

test('isWindows', () => {
  strictEqual(typeof isWindows(), 'boolean');
  strictEqual(isWindows(), process.platform === 'win32');
});

test('normalizeLineEndings', () => {
  strictEqual(normalizeLineEndings('line1\r\nline2\r\n'), 'line1\nline2\n');
  strictEqual(normalizeLineEndings('line1\nline2\n'), 'line1\nline2\n');
  strictEqual(normalizeLineEndings('mixed\r\nand\nunix'), 'mixed\nand\nunix');
  strictEqual(normalizeLineEndings(null), null);
});

test('nodeCommand', () => {
  strictEqual(nodeCommand('.claude/hooks/script.js'), 'node .claude/hooks/script.js');
  strictEqual(nodeCommand('.claude\\hooks\\script.js'), 'node .claude/hooks/script.js');
});

test('storagePath', () => {
  strictEqual(storagePath('C:\\Users\\test\\project'), 'C:/Users/test/project');
  strictEqual(storagePath('/home/user/project'), '/home/user/project');
});

console.log('✓ All cross-platform path tests passed!');
