# ASCII UI Generator - Quick Start

Generate terminal-friendly ASCII wireframes in seconds.

## Quick Examples

### 1. Simple Box
```javascript
import { generateComponentBox } from './src/vision/ui/index.js';

const box = generateComponentBox('Button', 20, 5);
console.log(box);
```

Output:
```
┌──────────────────┐
│      Button      │
│                  │
│                  │
└──────────────────┘
```

### 2. Navigation Bar
```javascript
import { generateNavbar } from './src/vision/ui/index.js';

const nav = generateNavbar(['Home', 'About', 'Contact']);
console.log(nav);
```

### 3. Form
```javascript
import { generateForm } from './src/vision/ui/index.js';

const form = generateForm([
  { label: 'Email', placeholder: 'user@example.com' },
  { label: 'Password', placeholder: '********' }
]);
console.log(form);
```

### 4. Table
```javascript
import { generateTable } from './src/vision/ui/index.js';

const table = generateTable(
  ['Name', 'Status'],
  [['John', 'Active'], ['Jane', 'Inactive']]
);
console.log(table);
```

### 5. Dashboard (Complete Layout)
```javascript
import { generateASCIIWireframe } from './src/vision/ui/index.js';

const dashboard = generateASCIIWireframe({
  navbar: { items: ['Dashboard', 'Settings'] },
  sidebar: { items: ['Menu 1', 'Menu 2'] },
  stats: [
    { title: 'Users', value: '42' },
    { title: 'Revenue', value: '$1.2K' }
  ]
}, { type: 'dashboard', width: 60 });

console.log(dashboard);
```

## Common Patterns

### Modal Dialog
```javascript
import { generateModal } from './src/vision/ui/index.js';

const modal = generateModal(
  'Confirm Delete',
  ['Are you sure?'],
  ['Delete', 'Cancel']
);
```

### Grid Layout
```javascript
import { generateLayoutGrid } from './src/vision/ui/index.js';

const grid = generateLayoutGrid(2, 3, {
  labels: ['Header', 'Nav', 'Actions', 'Side', 'Main', 'Footer']
});
```

### Card Component
```javascript
import { generateCard } from './src/vision/ui/index.js';

const card = generateCard('Total Sales', ['$12,450', '+23% this month']);
```

## CLI Usage

Run examples:
```bash
node src/vision/ui/examples.js
```

## Box Characters Reference

```
┌ ┐ └ ┘  Corners
│ ─      Sides
├ ┤ ┬ ┴  T-junctions
┼        Cross
```

## Tips

1. **Width**: Default width is 60 characters (fits most terminals)
2. **Height**: Automatically calculated based on content
3. **Nesting**: Combine components by generating them separately
4. **Monospace**: Requires monospace font for proper alignment
5. **Unicode**: Ensure terminal supports UTF-8

## Integration

Use in Vision Mode workflows:
```javascript
// Parse screenshot → identify components → generate wireframe
const components = identifyComponents(screenshot);
const wireframe = generateASCIIWireframe(components, { type: 'dashboard' });
```

## Next Steps

- See `README.md` for full API reference
- Run `examples.js` for complete demonstrations
- Check `ascii-generator.js` for implementation details
