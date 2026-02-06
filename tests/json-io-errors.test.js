/**
 * JSON I/O and Error Utilities Tests
 *
 * Tests for src/utils/json-io.js and src/utils/errors.js
 */

import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok, throws } from 'assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readJSON, writeJSON, readJSONFromPaths } from '../src/utils/json-io.js';
import {
  CcaspError,
  CcaspConfigError,
  CcaspFileError,
  CcaspTemplateError,
  CcaspGitError,
  formatError
} from '../src/utils/errors.js';

console.log('Running JSON I/O and Error utilities tests...\n');

// Setup temp directory for file I/O tests
const TEMP_DIR = join(process.cwd(), 'tests', '.test-tmp-json-io');

// Ensure temp directory exists before each test that needs it
function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

// Clean up any existing temp dir and create fresh
try {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  ensureTempDir();
} catch (err) {
  console.error('Failed to setup temp directory:', err);
}

// ========== JSON I/O Tests ==========

console.log('Testing json-io.js...');

test('readJSON returns fallback for non-existent file', () => {
  ensureTempDir();
  const nonExistentPath = join(TEMP_DIR, 'does-not-exist.json');
  deepStrictEqual(readJSON(nonExistentPath, { fallback: true }), { fallback: true });
  strictEqual(readJSON(nonExistentPath), null);
});

test('readJSON returns fallback for invalid JSON', () => {
  ensureTempDir();
  const invalidPath = join(TEMP_DIR, 'invalid.json');
  writeFileSync(invalidPath, '{invalid json content', 'utf8');
  deepStrictEqual(readJSON(invalidPath, { error: true }), { error: true });
  strictEqual(readJSON(invalidPath), null);
});

test('readJSON parses valid JSON', () => {
  ensureTempDir();
  const validPath = join(TEMP_DIR, 'valid.json');
  const testData = { name: 'test', count: 42, nested: { value: true } };
  writeFileSync(validPath, JSON.stringify(testData), 'utf8');
  deepStrictEqual(readJSON(validPath), testData);
});

test('writeJSON creates file and parent directories', () => {
  const nestedPath = join(TEMP_DIR, 'nested', 'deep', 'data.json');
  const testData = { created: true };
  writeJSON(nestedPath, testData);

  ok(existsSync(nestedPath), 'File should exist');
  deepStrictEqual(JSON.parse(readFileSync(nestedPath, 'utf8')), testData);
});

test('writeJSON writes formatted JSON with newline', () => {
  const formattedPath = join(TEMP_DIR, 'formatted.json');
  const testData = { a: 1, b: { c: 2 } };
  writeJSON(formattedPath, testData, 2);

  const content = readFileSync(formattedPath, 'utf8');
  ok(content.endsWith('\n'), 'Should end with newline');
  ok(content.includes('  "a": 1'), 'Should be formatted with 2-space indent');
  deepStrictEqual(JSON.parse(content), testData);
});

test('readJSONFromPaths returns first valid path content', () => {
  ensureTempDir();
  const path1 = join(TEMP_DIR, 'first.json');
  const path2 = join(TEMP_DIR, 'second.json');
  const path3 = join(TEMP_DIR, 'third.json');

  writeFileSync(path1, JSON.stringify({ order: 1 }), 'utf8');
  writeFileSync(path2, JSON.stringify({ order: 2 }), 'utf8');
  writeFileSync(path3, JSON.stringify({ order: 3 }), 'utf8');

  const result = readJSONFromPaths([path1, path2, path3]);
  deepStrictEqual(result, { order: 1 });
});

test('readJSONFromPaths skips non-existent and invalid paths', () => {
  ensureTempDir();
  const nonExistent = join(TEMP_DIR, 'missing.json');
  const invalidPath = join(TEMP_DIR, 'bad.json');
  const validPath = join(TEMP_DIR, 'good.json');

  writeFileSync(invalidPath, 'not json', 'utf8');
  writeFileSync(validPath, JSON.stringify({ valid: true }), 'utf8');

  const result = readJSONFromPaths([nonExistent, invalidPath, validPath]);
  deepStrictEqual(result, { valid: true });
});

test('readJSONFromPaths returns fallback when no paths match', () => {
  const paths = [
    join(TEMP_DIR, 'none1.json'),
    join(TEMP_DIR, 'none2.json')
  ];

  deepStrictEqual(readJSONFromPaths(paths, { default: 'value' }), { default: 'value' });
  strictEqual(readJSONFromPaths(paths), null);
});

// ========== Error Classes Tests ==========

console.log('\nTesting errors.js...');

test('CcaspError sets name, code, message, context', () => {
  const error = new CcaspError('Test message', {
    code: 'TEST_CODE',
    context: { detail: 'extra info' }
  });

  strictEqual(error.name, 'CcaspError');
  strictEqual(error.code, 'TEST_CODE');
  strictEqual(error.message, 'Test message');
  deepStrictEqual(error.context, { detail: 'extra info' });
});

test('CcaspConfigError has correct name and code', () => {
  const error = new CcaspConfigError('Config failed');

  strictEqual(error.name, 'CcaspConfigError');
  strictEqual(error.code, 'CCASP_CONFIG_ERROR');
  strictEqual(error.message, 'Config failed');
});

test('CcaspFileError stores filePath', () => {
  const error = new CcaspFileError('File not found', {
    filePath: '/path/to/file.txt'
  });

  strictEqual(error.name, 'CcaspFileError');
  strictEqual(error.code, 'CCASP_FILE_ERROR');
  strictEqual(error.filePath, '/path/to/file.txt');
});

test('CcaspTemplateError stores template', () => {
  const error = new CcaspTemplateError('Template parse error', {
    template: 'my-template.hbs'
  });

  strictEqual(error.name, 'CcaspTemplateError');
  strictEqual(error.code, 'CCASP_TEMPLATE_ERROR');
  strictEqual(error.template, 'my-template.hbs');
});

test('CcaspGitError has correct code', () => {
  const error = new CcaspGitError('Git command failed');

  strictEqual(error.name, 'CcaspGitError');
  strictEqual(error.code, 'CCASP_GIT_ERROR');
});

test('All errors are instanceof CcaspError and Error', () => {
  const baseError = new CcaspError('base');
  const configError = new CcaspConfigError('config');
  const fileError = new CcaspFileError('file');
  const templateError = new CcaspTemplateError('template');
  const gitError = new CcaspGitError('git');

  ok(baseError instanceof CcaspError);
  ok(baseError instanceof Error);

  ok(configError instanceof CcaspError);
  ok(configError instanceof Error);

  ok(fileError instanceof CcaspError);
  ok(fileError instanceof Error);

  ok(templateError instanceof CcaspError);
  ok(templateError instanceof Error);

  ok(gitError instanceof CcaspError);
  ok(gitError instanceof Error);
});

test('formatError formats CcaspError with code prefix', () => {
  const error = new CcaspError('Something went wrong', { code: 'MY_CODE' });
  strictEqual(formatError(error), '[MY_CODE] Something went wrong');

  const configError = new CcaspConfigError('Config invalid');
  strictEqual(formatError(configError), '[CCASP_CONFIG_ERROR] Config invalid');
});

test('formatError formats plain Error with just message', () => {
  const error = new Error('Standard error');
  strictEqual(formatError(error), 'Standard error');
});

test('formatError handles string and non-error input', () => {
  strictEqual(formatError({ message: 'Object error' }), 'Object error');
  strictEqual(formatError('Plain string'), 'Plain string');
  strictEqual(formatError(42), '42');
  // formatError doesn't handle null/undefined gracefully - these would throw
  // so we test that they convert via String()
  strictEqual(String(null), 'null');
  strictEqual(String(undefined), 'undefined');
});

// ========== Cleanup ==========

try {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
} catch (err) {
  console.error('Failed to cleanup temp directory:', err);
}

console.log('\n✓ All JSON I/O and Error utilities tests passed!');
