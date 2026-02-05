# Vision Mode ASCII UI Generator - Usage Guide

Complete guide for using the ASCII UI Generator in Vision Mode workflows.

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Vision Mode Integration](#vision-mode-integration)
4. [Component Reference](#component-reference)
5. [Best Practices](#best-practices)
6. [Advanced Patterns](#advanced-patterns)
7. [Troubleshooting](#troubleshooting)

## Installation

The ASCII UI Generator is part of CCASP. No additional installation required.

```javascript
import {
  generateASCIIWireframe,
  generateComponentBox,
  generateNavbar,
  generateSidebar,
  generateForm,
  generateTable,
  generateCard,
  generateModal,
  generateLayoutGrid,
  extractComponentList
} from './src/vision/ui/index.js';
```

## Basic Usage

### Quick Start: Dashboard

```javascript
const dashboard = generateASCIIWireframe({
  navbar: {
    items: ['Dashboard', 'Settings', 'Profile']
  },
  sidebar: {
    items: ['Dashboard', 'Users', 'Reports', 'Settings']
  },
  stats: [
    { title: 'Users', value: '142' },
    { title: 'Revenue', value: '$12K' },
    { title: 'Growth', value: '+23%' }
  ]
}, {
  type: 'dashboard',
  width: 62
});

console.log(dashboard);
```

### Quick Start: Form

```javascript
const form = generateASCIIWireframe({
  title: 'Login Form',
  fields: [
    { label: 'Email', placeholder: 'user@example.com' },
    { label: 'Password', placeholder: '********' }
  ]
}, {
  type: 'form',
  width: 40
});

console.log(form);
```

## Vision Mode Integration

### Workflow 1: Screenshot → Wireframe

```javascript
// 1. User uploads screenshot
// 2. Claude analyzes screenshot (Vision Mode)
// 3. Convert analysis to wireframe

const analysis = {
  layout: 'dashboard',
  components: {
    navbar: { items: ['Home', 'Products', 'About'] },
    sidebar: { items: ['Overview', 'Analytics'] },
    stats: [
      { title: 'Sales', value: '$45K' },
      { title: 'Orders', value: '128' }
    ]
  }
};

const wireframe = generateASCIIWireframe(
  analysis.components,
  { type: analysis.layout, width: 65 }
);
```

### Workflow 2: Wireframe → Component List → Code Generation

```javascript
// 1. Generate wireframe
const wireframe = generateModal(
  'User Profile',
  ['[Avatar]', '[NameInput]', '[EmailInput]'],
  ['Save', 'Cancel']
);

// 2. Extract components
const components = extractComponentList(wireframe);
// ['Avatar', 'NameInput', 'EmailInput', 'Save', 'Cancel']

// 3. Generate code stubs
components.forEach(comp => {
  console.log(`// ${comp}.tsx`);
  console.log(`export function ${comp}() { ... }`);
});
```

### Workflow 3: User Story → Wireframe → Implementation

```javascript
const userStory = {
  title: 'Admin Dashboard',
  acceptance: [
    'Show key metrics',
    'Navigation sidebar',
    'User profile in navbar'
  ]
};

// Generate based on requirements
const wireframe = generateASCIIWireframe({
  navbar: { items: ['Dashboard', 'Profile', 'Logout'] },
  sidebar: { items: ['Overview', 'Users', 'Settings'] },
  stats: [
    { title: 'Active Users', value: '1,234' },
    { title: 'Revenue', value: '$56K' }
  ]
}, { type: 'dashboard' });

// Use wireframe for implementation planning
```

## Component Reference

### Layout Types

#### 1. Dashboard Layout
Best for: Admin panels, analytics dashboards, monitoring tools

```javascript
generateASCIIWireframe({
  navbar: { items: [...] },
  sidebar: { items: [...] },
  stats: [{ title, value }, ...]
}, { type: 'dashboard' });
```

#### 2. Form Layout
Best for: Login forms, registration, data entry

```javascript
generateASCIIWireframe({
  title: 'Form Title',
  fields: [{ label, placeholder }, ...]
}, { type: 'form' });
```

#### 3. Table Layout
Best for: Data grids, user lists, reports

```javascript
generateASCIIWireframe({
  headers: [...],
  rows: [[...], ...]
}, { type: 'table' });
```

#### 4. Modal Layout
Best for: Dialogs, alerts, confirmations

```javascript
generateASCIIWireframe({
  title: 'Modal Title',
  content: [...],
  buttons: [...]
}, { type: 'modal' });
```

### Standalone Components

#### Component Box
```javascript
generateComponentBox('Button', 25, 5, {
  content: ['Primary', 'onClick: handler']
});
```

#### Navigation Bar
```javascript
generateNavbar(['Home', 'About', 'Contact'], {
  width: 60,
  logo: '[Logo]',
  actions: ['[🔔]']
});
```

#### Sidebar Menu
```javascript
generateSidebar(['Item 1', 'Item 2'], {
  width: 18,
  title: 'Menu'
});
```

#### Form
```javascript
generateForm([
  { label: 'Email', placeholder: 'user@example.com' }
], { width: 40, title: 'Login' });
```

#### Table
```javascript
generateTable(
  ['Name', 'Status'],
  [['John', 'Active'], ['Jane', 'Inactive']],
  { columnWidth: 15 }
);
```

#### Card
```javascript
generateCard('Total Users', ['142', 'Active'], {
  width: 20,
  height: 8
});
```

#### Modal
```javascript
generateModal(
  'Confirm Delete',
  ['Are you sure?'],
  ['Delete', 'Cancel'],
  { width: 50, padding: 2 }
);
```

#### Grid Layout
```javascript
generateLayoutGrid(2, 3, {
  cellWidth: 18,
  cellHeight: 5,
  labels: ['Header', 'Nav', 'Content', 'Side', 'Main', 'Footer']
});
```

## Best Practices

### 1. Choose Appropriate Widths

- **Mobile**: 40-50 characters
- **Desktop**: 60-80 characters
- **Wide screens**: 100-120 characters

```javascript
// Mobile-friendly
const mobile = generateASCIIWireframe(components, {
  type: 'dashboard',
  width: 45
});

// Desktop-optimized
const desktop = generateASCIIWireframe(components, {
  type: 'dashboard',
  width: 75
});
```

### 2. Keep It Simple

Start with basic layouts, then refine:

```javascript
// Iteration 1: Basic structure
const v1 = generateLayoutGrid(2, 2);

// Iteration 2: Add labels
const v2 = generateLayoutGrid(2, 2, {
  labels: ['Header', 'Nav', 'Main', 'Footer']
});

// Iteration 3: Full wireframe
const v3 = generateASCIIWireframe({...}, { type: 'dashboard' });
```

### 3. Use Consistent Naming

```javascript
// Good: Descriptive component names
{ title: 'UserProfile', value: '142' }

// Avoid: Generic names
{ title: 'Component1', value: '142' }
```

### 4. Document Intent

```javascript
// Add comments explaining the wireframe purpose
const wireframe = generateASCIIWireframe({
  // Main navigation for authenticated users
  navbar: { items: ['Dashboard', 'Profile', 'Logout'] },

  // Admin menu options
  sidebar: { items: ['Users', 'Reports', 'Settings'] },

  // Key performance metrics
  stats: [...]
}, { type: 'dashboard' });
```

## Advanced Patterns

### Pattern 1: Responsive Layouts

```javascript
function generateResponsiveWireframe(components, viewport) {
  const widths = {
    mobile: 40,
    tablet: 60,
    desktop: 80
  };

  return generateASCIIWireframe(components, {
    type: 'dashboard',
    width: widths[viewport]
  });
}

const mobileView = generateResponsiveWireframe(components, 'mobile');
const desktopView = generateResponsiveWireframe(components, 'desktop');
```

### Pattern 2: Component Library Builder

```javascript
function buildComponentLibrary(specs) {
  const library = {};

  specs.forEach(spec => {
    library[spec.name] = generateComponentBox(
      spec.name,
      spec.width,
      spec.height,
      { content: spec.props }
    );
  });

  return library;
}

const components = buildComponentLibrary([
  { name: 'Button', width: 20, height: 5, props: ['variant: primary'] },
  { name: 'Input', width: 30, height: 6, props: ['type: text'] }
]);
```

### Pattern 3: Template System

```javascript
const templates = {
  'E-commerce Product Page': {
    navbar: { items: ['Shop', 'Cart', 'Account'] },
    sidebar: { items: ['Categories', 'Filters'] },
    stats: [
      { title: 'Price', value: '$99.99' },
      { title: 'Stock', value: 'In Stock' },
      { title: 'Rating', value: '4.5/5' }
    ]
  },

  'SaaS Dashboard': {
    navbar: { items: ['Dashboard', 'Analytics', 'Settings'] },
    sidebar: { items: ['Overview', 'Reports', 'Team'] },
    stats: [
      { title: 'Users', value: '1,234' },
      { title: 'Revenue', value: '$56K' },
      { title: 'Growth', value: '+23%' }
    ]
  }
};

function generateFromTemplate(templateName) {
  return generateASCIIWireframe(
    templates[templateName],
    { type: 'dashboard', width: 65 }
  );
}
```

### Pattern 4: Iterative Refinement

```javascript
function refineWireframe(wireframe, feedback) {
  // Extract current components
  const components = extractComponentList(wireframe);

  // Apply feedback
  if (feedback.addStats) {
    components.stats.push(feedback.newStat);
  }

  if (feedback.removeItem) {
    components.navbar.items = components.navbar.items.filter(
      item => item !== feedback.removeItem
    );
  }

  // Regenerate
  return generateASCIIWireframe(components, { type: 'dashboard' });
}
```

## Troubleshooting

### Issue: Text Overflow

**Problem**: Text doesn't fit in component

**Solution**: Increase width or shorten text

```javascript
// Before: Text too long
generateComponentBox('Very Long Component Name Here', 20, 5);

// After: Appropriate width
generateComponentBox('Very Long Component Name Here', 40, 5);
```

### Issue: Misaligned Output

**Problem**: Wireframe looks misaligned in terminal

**Solution**: Ensure monospace font

```bash
# Set terminal to monospace font
# Examples: Consolas, Monaco, Courier New, Fira Code
```

### Issue: Unicode Characters Not Showing

**Problem**: Box-drawing characters appear as �

**Solution**: Enable UTF-8 encoding

```bash
# Windows Command Prompt
chcp 65001

# PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### Issue: Component Extraction Missing Items

**Problem**: `extractComponentList` doesn't find all components

**Solution**: Wrap component names in brackets

```javascript
// Better: Use brackets for explicit components
const modal = generateModal(
  'User Profile',
  ['[Avatar]', '[NameInput]', '[EmailInput]'],
  ['Save', 'Cancel']
);

const components = extractComponentList(modal);
// Now finds: Avatar, NameInput, EmailInput, Save, Cancel
```

## Testing

Run the test suite:

```bash
# Run basic tests
node src/vision/ui/test.js

# Run examples
node src/vision/ui/examples.js

# Run integration examples
node src/vision/ui/vision-integration.example.js
```

## Performance

All generators are synchronous and fast:

- Simple components: < 1ms
- Complex layouts: < 10ms
- Full dashboard: < 20ms

No async operations, safe for parallel generation:

```javascript
const wireframes = await Promise.all([
  generateASCIIWireframe(data1, { type: 'dashboard' }),
  generateASCIIWireframe(data2, { type: 'form' }),
  generateASCIIWireframe(data3, { type: 'table' })
]);
```

## Examples

See these files for complete examples:

- `examples.js` - Basic component examples
- `vision-integration.example.js` - Vision Mode workflows
- `test.js` - Test cases showing usage patterns

## Support

For issues, questions, or contributions:

1. Check existing examples in `examples.js`
2. Review documentation in `README.md`
3. Test with `test.js` to validate setup
4. Open an issue on GitHub

## License

Part of Claude CLI Advanced Starter Pack (CCASP)
