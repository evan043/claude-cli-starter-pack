/**
 * Safe Exec and Mobile Table Utilities Tests
 *
 * Tests for:
 * - src/utils/safe-exec.js (pure functions only: shellEscape, escapeDoubleQuotes)
 * - src/utils/mobile-table.js (all exported utilities)
 */

import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'assert';
import { shellEscape, escapeDoubleQuotes } from '../src/utils/safe-exec.js';
import {
  wrapText,
  padToWidth,
  createMobileCard,
  createMobileTable,
  createMobileMenu,
  shouldUseMobileFormatting
} from '../src/utils/mobile-table.js';

console.log('Running safe-exec and mobile-table tests...\n');

// ===========================
// safe-exec.js tests
// ===========================

test('shellEscape - wraps string in single quotes', () => {
  const result = shellEscape('hello world');
  strictEqual(result, "'hello world'");
});

test('shellEscape - handles single quotes inside string', () => {
  const result = shellEscape("it's a test");
  strictEqual(result, "'it'\\''s a test'");
});

test('shellEscape - converts non-string to string', () => {
  const result = shellEscape(123);
  strictEqual(result, '123');
});

test('escapeDoubleQuotes - escapes backslashes, double quotes, dollar signs, backticks', () => {
  const input = 'test\\path with "quotes" and $var and `cmd`';
  const result = escapeDoubleQuotes(input);
  strictEqual(result, 'test\\\\path with \\"quotes\\" and \\$var and \\`cmd\\`');
});

test('escapeDoubleQuotes - handles exclamation marks and newlines', () => {
  const input = 'hello!\nworld\r';
  const result = escapeDoubleQuotes(input);
  strictEqual(result, 'hello\\!\\nworld\\r');
});

test('escapeDoubleQuotes - converts non-string to string', () => {
  const result = escapeDoubleQuotes(456);
  strictEqual(result, '456');
});

// ===========================
// mobile-table.js tests
// ===========================

test('wrapText - returns [\'\'] for empty/null input', () => {
  const result1 = wrapText('');
  deepStrictEqual(result1, ['']);

  const result2 = wrapText(null);
  deepStrictEqual(result2, ['']);
});

test('wrapText - wraps text at word boundaries', () => {
  const text = 'this is a long sentence that needs wrapping';
  const result = wrapText(text, 20);
  ok(result.length > 1, 'Should produce multiple lines');
  result.forEach(line => {
    ok(line.length <= 20, `Line should be <= 20 chars: "${line}"`);
  });
});

test('wrapText - breaks long words that exceed maxWidth', () => {
  const longWord = 'a'.repeat(50);
  const result = wrapText(longWord, 20);
  ok(result.length > 1, 'Should break long word into multiple lines');
  result.forEach(line => {
    ok(line.length <= 20, `Line should be <= 20 chars: "${line}"`);
  });
});

test('wrapText - respects custom maxWidth', () => {
  const text = 'hello world this is a test';
  const result = wrapText(text, 10);
  result.forEach(line => {
    ok(line.length <= 10, `Line should be <= 10 chars: "${line}"`);
  });
});

test('padToWidth - pads short text with spaces', () => {
  const result = padToWidth('hello', 10);
  strictEqual(result, 'hello     ');
  strictEqual(result.length, 10);
});

test('padToWidth - truncates text longer than width', () => {
  const result = padToWidth('hello world', 5);
  strictEqual(result, 'hello');
  strictEqual(result.length, 5);
});

test('createMobileCard - returns string with box drawing characters', () => {
  const card = createMobileCard({
    header: 'Test Card',
    fields: [
      { label: 'Name', value: 'John' },
      { label: 'Age', value: '30' }
    ]
  });

  ok(card.includes('┌'), 'Should contain top-left corner');
  ok(card.includes('└'), 'Should contain bottom-left corner');
  ok(card.includes('│'), 'Should contain vertical border');
});

test('createMobileCard - includes header and fields', () => {
  const card = createMobileCard({
    header: 'User Info',
    fields: [
      { label: 'Email', value: 'test@example.com' }
    ]
  });

  ok(card.includes('User Info'), 'Should include header');
  ok(card.includes('Email: test@example.com'), 'Should include field');
});

test('createMobileTable - combines title and cards', () => {
  const table = createMobileTable({
    title: 'Test Table',
    items: [
      { name: 'Item 1', value: 'A' },
      { name: 'Item 2', value: 'B' }
    ],
    formatter: (item) => ({
      header: item.name,
      fields: [{ label: 'Value', value: item.value }]
    })
  });

  ok(table.includes('Test Table'), 'Should include title');
  ok(table.includes('Item 1'), 'Should include first item');
  ok(table.includes('Item 2'), 'Should include second item');
});

test('createMobileMenu - creates menu with key labels', () => {
  const menu = createMobileMenu({
    title: 'Main Menu',
    items: [
      { key: '1', label: 'Option One', description: 'First option' },
      { key: '2', label: 'Option Two' }
    ]
  });

  ok(menu.includes('Main Menu'), 'Should include title');
  ok(menu.includes('[1]'), 'Should include key bracket');
  ok(menu.includes('Option One'), 'Should include label');
  ok(menu.includes('First option'), 'Should include description');
});

test('shouldUseMobileFormatting - returns false when no env vars set', () => {
  // Save original env vars
  const originalHappySession = process.env.HAPPY_SESSION;
  const originalHappyHome = process.env.HAPPY_HOME_DIR;
  const originalHappyServer = process.env.HAPPY_SERVER_URL;
  const originalHappyWebapp = process.env.HAPPY_WEBAPP_URL;
  const originalHappyExperimental = process.env.HAPPY_EXPERIMENTAL;

  // Clear all Happy env vars
  delete process.env.HAPPY_SESSION;
  delete process.env.HAPPY_HOME_DIR;
  delete process.env.HAPPY_SERVER_URL;
  delete process.env.HAPPY_WEBAPP_URL;
  delete process.env.HAPPY_EXPERIMENTAL;

  const result = shouldUseMobileFormatting();
  strictEqual(result, false, 'Should return false when no Happy env vars are set');

  // Restore original env vars
  if (originalHappySession !== undefined) process.env.HAPPY_SESSION = originalHappySession;
  if (originalHappyHome !== undefined) process.env.HAPPY_HOME_DIR = originalHappyHome;
  if (originalHappyServer !== undefined) process.env.HAPPY_SERVER_URL = originalHappyServer;
  if (originalHappyWebapp !== undefined) process.env.HAPPY_WEBAPP_URL = originalHappyWebapp;
  if (originalHappyExperimental !== undefined) process.env.HAPPY_EXPERIMENTAL = originalHappyExperimental;
});

console.log('✓ All safe-exec and mobile-table tests passed!');
