/**
 * ASCII UI Generator - Simple Validation Test
 * Tests core functionality without requiring external test framework
 */

import {
  generateASCIIWireframe,
  generateComponentBox,
  generateLayoutGrid,
  generateNavbar,
  generateSidebar,
  generateForm,
  generateTable,
  generateCard,
  generateModal,
  extractComponentList,
} from './ascii-generator.js';

// Test counter
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertString(value, message) {
  assert(typeof value === 'string', message || 'Expected a string');
  assert(value.length > 0, message || 'Expected non-empty string');
}

function assertContains(str, substring, message) {
  assert(str.includes(substring), message || `Expected string to contain "${substring}"`);
}

// Run tests
console.log('\n=== ASCII UI Generator Tests ===\n');

test('generateComponentBox returns string', () => {
  const box = generateComponentBox('Test', 20, 5);
  assertString(box, 'Component box should return a string');
});

test('generateComponentBox contains title', () => {
  const box = generateComponentBox('Button', 20, 5);
  assertContains(box, 'Button', 'Box should contain title');
});

test('generateComponentBox has borders', () => {
  const box = generateComponentBox('Test', 20, 5);
  assertContains(box, '┌', 'Box should have top-left corner');
  assertContains(box, '┐', 'Box should have top-right corner');
  assertContains(box, '└', 'Box should have bottom-left corner');
  assertContains(box, '┘', 'Box should have bottom-right corner');
});

test('generateNavbar returns string', () => {
  const nav = generateNavbar(['Home', 'About']);
  assertString(nav, 'Navbar should return a string');
});

test('generateNavbar contains items', () => {
  const nav = generateNavbar(['Dashboard', 'Settings']);
  assertContains(nav, 'Dashboard', 'Navbar should contain Dashboard');
  assertContains(nav, 'Settings', 'Navbar should contain Settings');
});

test('generateSidebar returns array', () => {
  const sidebar = generateSidebar(['Menu 1', 'Menu 2']);
  assert(Array.isArray(sidebar), 'Sidebar should return an array');
  assert(sidebar.length > 0, 'Sidebar should have lines');
});

test('generateSidebar contains items', () => {
  const sidebar = generateSidebar(['Dashboard', 'Users']).join('\n');
  assertContains(sidebar, 'Dashboard', 'Sidebar should contain Dashboard');
  assertContains(sidebar, 'Users', 'Sidebar should contain Users');
});

test('generateForm returns string', () => {
  const form = generateForm([{ label: 'Email' }]);
  assertString(form, 'Form should return a string');
});

test('generateForm contains fields', () => {
  const form = generateForm([
    { label: 'Email', placeholder: 'user@example.com' },
    { label: 'Password' }
  ]);
  assertContains(form, 'Email', 'Form should contain Email label');
  assertContains(form, 'Password', 'Form should contain Password label');
});

test('generateTable returns string', () => {
  const table = generateTable(['Col1'], [['Data']]);
  assertString(table, 'Table should return a string');
});

test('generateTable contains headers and data', () => {
  const table = generateTable(['Name', 'Status'], [['John', 'Active']]);
  assertContains(table, 'Name', 'Table should contain Name header');
  assertContains(table, 'Status', 'Table should contain Status header');
  assertContains(table, 'John', 'Table should contain John data');
  assertContains(table, 'Active', 'Table should contain Active data');
});

test('generateCard returns string', () => {
  const card = generateCard('Title', ['Content']);
  assertString(card, 'Card should return a string');
});

test('generateCard contains title and content', () => {
  const card = generateCard('Users', ['142', 'Active']);
  assertContains(card, 'Users', 'Card should contain title');
  assertContains(card, '142', 'Card should contain content');
});

test('generateModal returns string', () => {
  const modal = generateModal('Title', ['Content'], ['OK']);
  assertString(modal, 'Modal should return a string');
});

test('generateModal contains title, content, and buttons', () => {
  const modal = generateModal('Confirm', ['Are you sure?'], ['Yes', 'No']);
  assertContains(modal, 'Confirm', 'Modal should contain title');
  assertContains(modal, 'Are you sure?', 'Modal should contain content');
  assertContains(modal, 'Yes', 'Modal should contain Yes button');
  assertContains(modal, 'No', 'Modal should contain No button');
});

test('generateLayoutGrid returns string', () => {
  const grid = generateLayoutGrid(2, 2);
  assertString(grid, 'Grid should return a string');
});

test('generateLayoutGrid has correct structure', () => {
  const grid = generateLayoutGrid(2, 2, { labels: ['A', 'B', 'C', 'D'] });
  assertContains(grid, 'A', 'Grid should contain label A');
  assertContains(grid, 'B', 'Grid should contain label B');
  assertContains(grid, 'C', 'Grid should contain label C');
  assertContains(grid, 'D', 'Grid should contain label D');
});

test('generateASCIIWireframe dashboard type', () => {
  const wireframe = generateASCIIWireframe({
    navbar: { items: ['Home'] },
    sidebar: { items: ['Menu'] },
    stats: [{ title: 'Stat', value: '42' }]
  }, { type: 'dashboard', width: 60 });
  assertString(wireframe, 'Dashboard wireframe should return a string');
  assertContains(wireframe, 'Home', 'Dashboard should contain navbar items');
  assertContains(wireframe, 'Menu', 'Dashboard should contain sidebar items');
});

test('generateASCIIWireframe form type', () => {
  const wireframe = generateASCIIWireframe({
    fields: [{ label: 'Email' }]
  }, { type: 'form' });
  assertString(wireframe, 'Form wireframe should return a string');
  assertContains(wireframe, 'Email', 'Form should contain field label');
});

test('generateASCIIWireframe table type', () => {
  const wireframe = generateASCIIWireframe({
    headers: ['Name'],
    rows: [['John']]
  }, { type: 'table' });
  assertString(wireframe, 'Table wireframe should return a string');
  assertContains(wireframe, 'Name', 'Table should contain header');
  assertContains(wireframe, 'John', 'Table should contain data');
});

test('generateASCIIWireframe modal type', () => {
  const wireframe = generateASCIIWireframe({
    title: 'Alert',
    content: ['Message'],
    buttons: ['OK']
  }, { type: 'modal' });
  assertString(wireframe, 'Modal wireframe should return a string');
  assertContains(wireframe, 'Alert', 'Modal should contain title');
  assertContains(wireframe, 'Message', 'Modal should contain content');
});

test('extractComponentList returns array', () => {
  const modal = generateModal('Test', ['[Button]', '[Input]'], ['OK']);
  const components = extractComponentList(modal);
  assert(Array.isArray(components), 'extractComponentList should return an array');
});

test('extractComponentList extracts components', () => {
  const modal = generateModal('Test', ['[Button]', '[Input]'], ['OK', 'Cancel']);
  const components = extractComponentList(modal);
  assert(components.includes('Button'), 'Should extract Button component');
  assert(components.includes('Input'), 'Should extract Input component');
  assert(components.includes('OK'), 'Should extract OK button');
  assert(components.includes('Cancel'), 'Should extract Cancel button');
});

// Display results
console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

if (failed > 0) {
  process.exit(1);
}
