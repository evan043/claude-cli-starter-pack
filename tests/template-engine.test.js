/**
 * Template Engine Tests
 *
 * Tests for src/utils/template-engine.js
 */

import { test } from 'node:test';
import { strictEqual, ok, deepStrictEqual, throws } from 'assert';
import {
  replacePlaceholders,
  evaluateCondition,
  processConditionalBlocks,
  processEachBlocks,
  extractPlaceholders,
  flattenObject,
  validateTechStack,
} from '../src/utils/template-engine.js';

console.log('Running template engine tests...\n');

test('replacePlaceholders - basic variable substitution', () => {
  const { content } = replacePlaceholders('Hello {{name}}', { name: 'World' });
  strictEqual(content, 'Hello World');
});

test('replacePlaceholders - nested variables', () => {
  const { content } = replacePlaceholders('Port: {{frontend.port}}', { frontend: { port: 3000 } });
  strictEqual(content, 'Port: 3000');
});

test('replacePlaceholders - missing variable preserves placeholder', () => {
  const { content } = replacePlaceholders('{{missing}}', {});
  strictEqual(content, '{{missing}}');
});

test('replacePlaceholders - array values joined', () => {
  const { content } = replacePlaceholders('{{items}}', { items: ['a', 'b', 'c'] });
  strictEqual(content, 'a, b, c');
});

test('evaluateCondition - simple truthy', () => {
  ok(evaluateCondition('name', { name: 'test' }));
});

test('evaluateCondition - eq operator', () => {
  ok(evaluateCondition('(eq type "react")', { type: 'react' }));
});

test('evaluateCondition - neq operator', () => {
  ok(evaluateCondition('(neq type "vue")', { type: 'react' }));
});

test('evaluateCondition - not operator', () => {
  ok(evaluateCondition('(not missing)', {}));
});

test('processEachBlocks - iterates array', () => {
  const result = processEachBlocks('{{#each items}}[{{this}}]{{/each}}', { items: ['a', 'b'] });
  strictEqual(result, '[a][b]');
});

test('processEachBlocks - empty array', () => {
  const result = processEachBlocks('{{#each items}}[{{this}}]{{/each}}', { items: [] });
  strictEqual(result, '');
});

test('extractPlaceholders - finds all', () => {
  const result = extractPlaceholders('{{a}} and {{b.c}} and {{a}}');
  deepStrictEqual(result, ['a', 'b.c']);
});

test('flattenObject - nested object', () => {
  const result = flattenObject({ a: { b: { c: 1 } }, d: 2 });
  deepStrictEqual(result, { 'a.b.c': 1, d: 2 });
});

test('validateTechStack - all present', () => {
  const result = validateTechStack({ a: 1, b: 2 }, ['a', 'b']);
  ok(result.valid);
  strictEqual(result.coverage, 1);
});

test('validateTechStack - missing fields', () => {
  const result = validateTechStack({ a: 1 }, ['a', 'b']);
  ok(!result.valid);
  deepStrictEqual(result.missing, ['b']);
});

console.log('✓ All template engine tests passed!');
