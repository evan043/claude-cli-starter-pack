# Vision Mode ASCII UI Generator

Terminal-friendly ASCII wireframe generator for rapid UI prototyping and mockups.

## Features

- **Box-drawing characters**: Uses Unicode box-drawing characters (┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼)
- **Monospace compatible**: Designed for terminal display
- **Component library**: Pre-built generators for common UI patterns
- **Layout system**: Combine components into complete wireframes
- **Component extraction**: Parse wireframes to identify components

## Installation

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

## API Reference

### Core Functions

#### `generateASCIIWireframe(components, layout)`

Generate a complete ASCII wireframe with layout.

**Parameters:**
- `components` (Object): Component definitions
- `layout` (Object): Layout configuration
  - `type`: Layout type ('dashboard', 'form', 'table', 'modal', 'custom')
  - `width`: Total width in characters (default: 60)

**Returns:** String

**Example:**
```javascript
const wireframe = generateASCIIWireframe({
  navbar: { items: ['Dashboard', 'Settings'] },
  sidebar: { items: ['Menu 1', 'Menu 2'] },
  stats: [
    { title: 'Users', value: '142' },
    { title: 'Revenue', value: '$12K' }
  ]
}, {
  type: 'dashboard',
  width: 70
});
```

### Component Generators

#### `generateComponentBox(name, width, height, options)`

Generate a simple component box.

**Parameters:**
- `name` (string): Component name
- `width` (number): Box width including borders (default: 20)
- `height` (number): Box height including borders (default: 5)
- `options` (Object):
  - `centered` (boolean): Center the title (default: true)
  - `content` (Array<string>): Content lines

**Example:**
```javascript
const box = generateComponentBox('Button', 25, 5, {
  content: ['Primary Button', 'onClick handler']
});
```

Output:
```
┌───────────────────────┐
│        Button         │
│ Primary Button        │
│ onClick handler       │
└───────────────────────┘
```

#### `generateNavbar(items, options)`

Generate a navigation bar.

**Parameters:**
- `items` (Array<string>): Navigation items
- `options` (Object):
  - `width` (number): Total width (default: 60)
  - `logo` (string): Logo text (default: '[Logo]')
  - `actions` (Array<string>): Action items (default: ['[🔔]'])

**Example:**
```javascript
const navbar = generateNavbar(['Home', 'About', 'Contact'], {
  width: 60,
  logo: '[MyApp]',
  actions: ['[🔔]', '[👤]']
});
```

Output:
```
┌──────────────────────────────────────────────────────────┐
│  [MyApp]     Home    About    Contact    [🔔]   [👤]     │
├──────────────────────────────────────────────────────────┤
```

#### `generateSidebar(items, options)`

Generate a sidebar menu.

**Parameters:**
- `items` (Array<string>): Menu items
- `options` (Object):
  - `width` (number): Sidebar width (default: 15)
  - `title` (string): Sidebar title (default: 'Menu')

**Returns:** Array<string> (lines for combining with other components)

**Example:**
```javascript
const sidebar = generateSidebar(['Dashboard', 'Users', 'Settings'], {
  width: 18,
  title: 'Main Menu'
});
```

Output:
```
┌────────────────┐
│   Main Menu    │
├────────────────┤
│ Dashboard      │
│ Users          │
│ Settings       │
└────────────────┘
```

#### `generateForm(fields, options)`

Generate a form layout.

**Parameters:**
- `fields` (Array<Object>): Form fields
  - `label` (string): Field label
  - `type` (string): Input type
  - `placeholder` (string): Placeholder text
- `options` (Object):
  - `width` (number): Form width (default: 40)
  - `title` (string): Form title (default: 'Form')

**Example:**
```javascript
const form = generateForm([
  { label: 'Email', placeholder: 'user@example.com' },
  { label: 'Password', placeholder: '********' }
], {
  width: 45,
  title: 'Login Form'
});
```

Output:
```
┌───────────────────────────────────────────┐
│                Login Form                 │
├───────────────────────────────────────────┤
│ Email:                                    │
│  [user@example.com]                       │
│                                           │
│ Password:                                 │
│  [********]                               │
│                                           │
│                 [Submit]                  │
└───────────────────────────────────────────┘
```

#### `generateTable(headers, rows, options)`

Generate a table layout.

**Parameters:**
- `headers` (Array<string>): Column headers
- `rows` (Array<Array<string>>): Table rows
- `options` (Object):
  - `columnWidth` (number): Width per column (default: 15)

**Example:**
```javascript
const table = generateTable(
  ['Name', 'Email', 'Status'],
  [
    ['John Doe', 'john@ex.com', 'Active'],
    ['Jane Smith', 'jane@ex.com', 'Active']
  ],
  { columnWidth: 18 }
);
```

Output:
```
┌────────────────────────────────────────────────────────┐
│      Name       │      Email      │      Status       │
├─────────────────┼─────────────────┼──────────────────┤
│    John Doe     │  john@ex.com    │      Active      │
├─────────────────┼─────────────────┼──────────────────┤
│   Jane Smith    │  jane@ex.com    │      Active      │
└────────────────────────────────────────────────────────┘
```

#### `generateCard(title, content, options)`

Generate a card component.

**Parameters:**
- `title` (string): Card title
- `content` (Array<string>): Content lines
- `options` (Object):
  - `width` (number): Card width (default: 20)
  - `height` (number): Card height (default: 8)

**Example:**
```javascript
const card = generateCard('Total Users', ['142', 'Active'], {
  width: 22,
  height: 8
});
```

Output:
```
┌────────────────────┐
│    Total Users     │
├────────────────────┤
│        142         │
│       Active       │
│                    │
│                    │
└────────────────────┘
```

#### `generateModal(title, content, buttons, options)`

Generate a modal dialog.

**Parameters:**
- `title` (string): Modal title
- `content` (Array<string>): Content lines
- `buttons` (Array<string>): Button labels (default: ['OK', 'Cancel'])
- `options` (Object):
  - `width` (number): Modal width (default: 50)
  - `padding` (number): Vertical padding (default: 2)

**Example:**
```javascript
const modal = generateModal(
  'Confirmation',
  ['Are you sure?', 'This cannot be undone.'],
  ['Confirm', 'Cancel'],
  { width: 50 }
);
```

Output:
```
┌────────────────────────────────────────────────┐
│                 Confirmation                   │
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│               Are you sure?                    │
│          This cannot be undone.                │
│                                                │
│                                                │
│           [Confirm]   [Cancel]                 │
└────────────────────────────────────────────────┘
```

#### `generateLayoutGrid(rows, cols, options)`

Generate a grid layout.

**Parameters:**
- `rows` (number): Number of rows (default: 2)
- `cols` (number): Number of columns (default: 3)
- `options` (Object):
  - `cellWidth` (number): Cell width (default: 15)
  - `cellHeight` (number): Cell height (default: 5)
  - `labels` (Array<string>): Cell labels

**Example:**
```javascript
const grid = generateLayoutGrid(2, 3, {
  cellWidth: 18,
  cellHeight: 5,
  labels: ['Header', 'Nav', 'Actions', 'Sidebar', 'Content', 'Footer']
});
```

Output:
```
┌──────────────────┬──────────────────┬──────────────────┐
│                  │                  │                  │
│      Header      │       Nav        │     Actions      │
│                  │                  │                  │
│                  │                  │                  │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│     Sidebar      │     Content      │      Footer      │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

#### `extractComponentList(wireframe)`

Extract component list from ASCII wireframe.

**Parameters:**
- `wireframe` (string): ASCII wireframe string

**Returns:** Array<string> - List of detected components

**Example:**
```javascript
const components = extractComponentList(wireframe);
// ['Button', 'Input', 'Logo', ...]
```

## Usage Examples

### Example 1: Dashboard Layout

```javascript
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
```

Output:
```
┌────────────────────────────────────────────────────────┐
│  [Logo]     Dashboard    Settings    Profile    [🔔]   │
├────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌────────────────────────────────────────┐│
│ │ Menu     │ │  Welcome, User!                        ││
│ ├──────────┤ ├────────────────────────────────────────┤│
│ │ Dashboard│ │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ││
│ │ Users    │ │  │ Stat 1   │ │ Stat 2   │ │ Stat 3  │ ││
│ │ Reports  │ │  │   42     │ │   128    │ │  $1.2K  │ ││
│ │ Settings │ │  └──────────┘ └──────────┘ └─────────┘ ││
│ └──────────┘ └────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

### Example 2: Login Form

```javascript
const loginForm = generateASCIIWireframe({
  title: 'Login',
  fields: [
    { label: 'Email', placeholder: 'user@example.com' },
    { label: 'Password', placeholder: '********' }
  ]
}, {
  type: 'form',
  width: 40
});

console.log(loginForm);
```

### Example 3: Data Table

```javascript
const userTable = generateASCIIWireframe({
  headers: ['Name', 'Email', 'Status'],
  rows: [
    ['John Doe', 'john@example.com', 'Active'],
    ['Jane Smith', 'jane@example.com', 'Inactive']
  ]
}, {
  type: 'table'
});

console.log(userTable);
```

## Running Examples

```bash
node src/vision/ui/examples.js
```

This will run all example generators and display their output.

## Integration with Vision Mode

This module is designed to be integrated with CCASP's Vision Mode for:

1. **Rapid UI prototyping**: Generate wireframes from Claude's understanding
2. **Screenshot analysis**: Parse UI screenshots and generate ASCII representations
3. **Component extraction**: Identify UI components from wireframes
4. **Documentation**: Generate visual documentation for UI specifications

## Box-Drawing Character Set

```
┌ ─ ┐    Top border
│   │    Sides
├ ─ ┤    T-junctions
└ ─ ┘    Bottom border
┬ ┴ ┼    Intersections
```

## Notes

- All outputs are monospace-compatible
- Designed for 80-120 character terminal width
- Handles text overflow gracefully with truncation
- Supports nested layouts
- Works in any terminal with Unicode support

## License

Part of Claude CLI Advanced Starter Pack (CCASP)
