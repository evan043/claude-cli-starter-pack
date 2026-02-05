/**
 * Safe Path Utilities Tests
 *
 * Tests for src/utils/safe-path.js to ensure path traversal prevention
 */

import { test } from 'node:test';
import { strictEqual, throws, deepStrictEqual } from 'assert';
import { resolve } from 'path';
import { safePath, safeComponent, safeComponents } from '../src/utils/safe-path.js';

console.log('Running safe path tests...\n');

test('safePath - allows safe paths within base directory', () => {
  const baseDir = '/project';
  const safe = safePath('src/file.js', baseDir);
  strictEqual(safe, resolve(baseDir, 'src/file.js'));
});

test('safePath - blocks path traversal with ../', () => {
  const baseDir = '/project';
  throws(
    () => safePath('../../../etc/passwd', baseDir),
    /Path traversal blocked/,
    'Should block path traversal'
  );
});

test('safePath - blocks absolute path escaping base', () => {
  const baseDir = '/project';
  throws(
    () => safePath('/etc/passwd', '/project'),
    /Path traversal blocked/,
    'Should block absolute path escape'
  );
});

test('safePath - allows nested paths within base', () => {
  const baseDir = '/project';
  const safe = safePath('src/components/Button.tsx', baseDir);
  strictEqual(safe, resolve(baseDir, 'src/components/Button.tsx'));
});

test('safePath - handles Windows paths correctly', () => {
  const baseDir = 'C:\\Users\\test\\project';
  const safe = safePath('src\\file.js', baseDir);
  strictEqual(safe.startsWith(resolve(baseDir)), true);
});

test('safeComponent - allows safe filenames', () => {
  strictEqual(safeComponent('file.js'), 'file.js');
  strictEqual(safeComponent('Button.tsx'), 'Button.tsx');
  strictEqual(safeComponent('my-file.test.js'), 'my-file.test.js');
});

test('safeComponent - blocks path traversal in components', () => {
  throws(
    () => safeComponent('../parent'),
    /Invalid path component/,
    'Should block .. in component'
  );
});

test('safeComponent - blocks slashes in components', () => {
  throws(
    () => safeComponent('path/with/slash'),
    /Invalid path component/,
    'Should block / in component'
  );

  throws(
    () => safeComponent('path\\with\\backslash'),
    /Invalid path component/,
    'Should block \\ in component'
  );
});

test('safeComponents - validates multiple components', () => {
  const components = ['file1.js', 'file2.ts', 'config.json'];
  const validated = safeComponents(components);
  deepStrictEqual(validated, components);
});

test('safeComponents - throws on first invalid component', () => {
  const components = ['file1.js', '../evil', 'file2.ts'];
  throws(
    () => safeComponents(components),
    /Invalid path component/,
    'Should throw on invalid component'
  );
});

test('safeComponents - handles empty array', () => {
  const validated = safeComponents([]);
  deepStrictEqual(validated, []);
});

console.log('✓ All safe path tests passed!');
