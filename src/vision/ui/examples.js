/**
 * ASCII UI Generator Examples
 * Demonstrates various UI component generations
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

/**
 * Example 1: Simple Component Box
 */
export function exampleComponentBox() {
  console.log('\n=== Example 1: Component Box ===\n');
  const box = generateComponentBox('Button Component', 25, 5, {
    content: ['Primary Button', 'onClick handler']
  });
  console.log(box);
}

/**
 * Example 2: Navigation Bar
 */
export function exampleNavbar() {
  console.log('\n=== Example 2: Navigation Bar ===\n');
  const navbar = generateNavbar(['Dashboard', 'Users', 'Settings', 'Profile'], {
    width: 70,
    logo: '[MyApp]',
    actions: ['[🔔]', '[👤]']
  });
  console.log(navbar);
}

/**
 * Example 3: Sidebar Menu
 */
export function exampleSidebar() {
  console.log('\n=== Example 3: Sidebar Menu ===\n');
  const sidebar = generateSidebar(['Dashboard', 'Users', 'Reports', 'Analytics', 'Settings'], {
    width: 18,
    title: 'Main Menu'
  });
  console.log(sidebar.join('\n'));
}

/**
 * Example 4: Form Layout
 */
export function exampleForm() {
  console.log('\n=== Example 4: Form Layout ===\n');
  const form = generateForm([
    { label: 'Username', placeholder: 'Enter username' },
    { label: 'Email', placeholder: 'user@example.com' },
    { label: 'Password', placeholder: '********' }
  ], {
    width: 45,
    title: 'Registration Form'
  });
  console.log(form);
}

/**
 * Example 5: Table Layout
 */
export function exampleTable() {
  console.log('\n=== Example 5: Table Layout ===\n');
  const table = generateTable(
    ['Name', 'Email', 'Status'],
    [
      ['John Doe', 'john@ex.com', 'Active'],
      ['Jane Smith', 'jane@ex.com', 'Active'],
      ['Bob Wilson', 'bob@ex.com', 'Inactive']
    ],
    { columnWidth: 18 }
  );
  console.log(table);
}

/**
 * Example 6: Card Component
 */
export function exampleCard() {
  console.log('\n=== Example 6: Card Component ===\n');
  const card = generateCard('Total Users', ['142', 'Active Users'], {
    width: 22,
    height: 8
  });
  console.log(card);
}

/**
 * Example 7: Modal Dialog
 */
export function exampleModal() {
  console.log('\n=== Example 7: Modal Dialog ===\n');
  const modal = generateModal(
    'Delete Confirmation',
    ['Are you sure you want to delete this item?', 'This action cannot be undone.'],
    ['Delete', 'Cancel'],
    { width: 55, padding: 1 }
  );
  console.log(modal);
}

/**
 * Example 8: Grid Layout
 */
export function exampleGrid() {
  console.log('\n=== Example 8: Grid Layout ===\n');
  const grid = generateLayoutGrid(2, 3, {
    cellWidth: 18,
    cellHeight: 5,
    labels: ['Header', 'Navigation', 'Actions', 'Sidebar', 'Main Content', 'Footer']
  });
  console.log(grid);
}

/**
 * Example 9: Complete Dashboard
 */
export function exampleDashboard() {
  console.log('\n=== Example 9: Complete Dashboard ===\n');
  const dashboard = generateASCIIWireframe({
    navbar: {
      items: ['Dashboard', 'Settings', 'Profile']
    },
    sidebar: {
      items: ['Dashboard', 'Users', 'Reports', 'Settings']
    },
    stats: [
      { title: 'Stat 1', value: '42' },
      { title: 'Stat 2', value: '128' },
      { title: 'Stat 3', value: '$1.2K' }
    ]
  }, {
    type: 'dashboard',
    width: 62
  });
  console.log(dashboard);
}

/**
 * Example 10: Extract Components
 */
export function exampleExtractComponents() {
  console.log('\n=== Example 10: Extract Components ===\n');
  const wireframe = generateModal(
    'User Profile',
    ['[Avatar]', '[Name Input]', '[Email Input]', '[Bio Textarea]'],
    ['Save', 'Cancel']
  );
  console.log('Wireframe:');
  console.log(wireframe);
  console.log('\nExtracted Components:');
  const components = extractComponentList(wireframe);
  console.log(components);
}

/**
 * Run all examples
 */
export function runAllExamples() {
  exampleComponentBox();
  exampleNavbar();
  exampleSidebar();
  exampleForm();
  exampleTable();
  exampleCard();
  exampleModal();
  exampleGrid();
  exampleDashboard();
  exampleExtractComponents();
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
