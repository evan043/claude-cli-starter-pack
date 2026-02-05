/**
 * ASCII Wireframe Generator
 * Generates terminal-friendly ASCII UI representations using box-drawing characters
 */

// Box-drawing characters
const BOX = {
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  CROSS: '┼',
};

/**
 * Repeat a character n times
 * @param {string} char - Character to repeat
 * @param {number} count - Number of times to repeat
 * @returns {string}
 */
function repeat(char, count) {
  return char.repeat(Math.max(0, count));
}

/**
 * Pad text to center it within a given width
 * @param {string} text - Text to center
 * @param {number} width - Total width
 * @returns {string}
 */
function centerText(text, width) {
  const textLen = text.length;
  if (textLen >= width) return text.substring(0, width);

  const leftPad = Math.floor((width - textLen) / 2);
  const rightPad = width - textLen - leftPad;

  return repeat(' ', leftPad) + text + repeat(' ', rightPad);
}

/**
 * Pad text to align left within a given width
 * @param {string} text - Text to align
 * @param {number} width - Total width
 * @returns {string}
 */
function leftText(text, width) {
  const textLen = text.length;
  if (textLen >= width) return text.substring(0, width);
  return text + repeat(' ', width - textLen);
}

/**
 * Pad text to align right within a given width
 * @param {string} text - Text to align
 * @param {number} width - Total width
 * @returns {string}
 */
function rightText(text, width) {
  const textLen = text.length;
  if (textLen >= width) return text.substring(0, width);
  return repeat(' ', width - textLen) + text;
}

/**
 * Generate a simple component box
 * @param {string} name - Component name
 * @param {number} width - Box width (including borders)
 * @param {number} height - Box height (including borders)
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateComponentBox(name, width = 20, height = 5, options = {}) {
  const { centered = true, content = [] } = options;
  const lines = [];

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.TOP_RIGHT);

  // Title line
  const titleLine = centered ? centerText(name, width - 2) : leftText(` ${name}`, width - 2);
  lines.push(BOX.VERTICAL + titleLine + BOX.VERTICAL);

  // Content lines
  const contentHeight = height - 3; // Excluding top, title, and bottom
  for (let i = 0; i < contentHeight; i++) {
    const text = content[i] || '';
    const paddedText = leftText(` ${text}`, width - 2);
    lines.push(BOX.VERTICAL + paddedText + BOX.VERTICAL);
  }

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.BOTTOM_RIGHT);

  return lines.join('\n');
}

/**
 * Generate a navigation bar
 * @param {Array<string>} items - Navigation items
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateNavbar(items = [], options = {}) {
  const { width = 60, logo = '[Logo]', actions = ['[🔔]'] } = options;
  const lines = [];

  // Build nav content
  let navContent = `  ${logo}     `;
  navContent += items.join('    ');
  navContent += '    ';
  navContent += actions.join('   ');

  // Pad to width
  const paddedContent = leftText(navContent, width - 2);

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.TOP_RIGHT);

  // Content
  lines.push(BOX.VERTICAL + paddedContent + BOX.VERTICAL);

  // Bottom border with divider
  lines.push(BOX.T_RIGHT + repeat(BOX.HORIZONTAL, width - 2) + BOX.T_LEFT);

  return lines.join('\n');
}

/**
 * Generate a sidebar menu
 * @param {Array<string>} items - Menu items
 * @param {Object} options - Additional options
 * @returns {string[]} - Array of lines (for combining with other components)
 */
export function generateSidebar(items = [], options = {}) {
  const { width = 15, title = 'Menu' } = options;
  const lines = [];

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.TOP_RIGHT);

  // Title
  lines.push(BOX.VERTICAL + centerText(title, width - 2) + BOX.VERTICAL);
  lines.push(BOX.T_RIGHT + repeat(BOX.HORIZONTAL, width - 2) + BOX.T_LEFT);

  // Items
  items.forEach((item) => {
    lines.push(BOX.VERTICAL + leftText(` ${item}`, width - 2) + BOX.VERTICAL);
  });

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.BOTTOM_RIGHT);

  return lines;
}

/**
 * Generate a form layout
 * @param {Array<Object>} fields - Form fields [{label, type, placeholder}]
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateForm(fields = [], options = {}) {
  const { width = 40, title = 'Form' } = options;
  const lines = [];

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.TOP_RIGHT);

  // Title
  lines.push(BOX.VERTICAL + centerText(title, width - 2) + BOX.VERTICAL);
  lines.push(BOX.T_RIGHT + repeat(BOX.HORIZONTAL, width - 2) + BOX.T_LEFT);

  // Fields
  fields.forEach((field, index) => {
    const label = field.label || `Field ${index + 1}`;
    const placeholder = field.placeholder || '';

    // Label line
    lines.push(BOX.VERTICAL + leftText(` ${label}:`, width - 2) + BOX.VERTICAL);

    // Input line
    const inputDisplay = placeholder ? `[${placeholder}]` : '[___________]';
    lines.push(BOX.VERTICAL + leftText(`  ${inputDisplay}`, width - 2) + BOX.VERTICAL);

    // Spacing
    if (index < fields.length - 1) {
      lines.push(BOX.VERTICAL + repeat(' ', width - 2) + BOX.VERTICAL);
    }
  });

  // Button
  lines.push(BOX.VERTICAL + repeat(' ', width - 2) + BOX.VERTICAL);
  lines.push(BOX.VERTICAL + centerText('[Submit]', width - 2) + BOX.VERTICAL);

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.BOTTOM_RIGHT);

  return lines.join('\n');
}

/**
 * Generate a table layout
 * @param {Array<string>} headers - Table headers
 * @param {Array<Array<string>>} rows - Table rows
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateTable(headers = [], rows = [], options = {}) {
  const { columnWidth = 15 } = options;
  const lines = [];

  const totalWidth = (columnWidth * headers.length) + (headers.length - 1);

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, totalWidth) + BOX.TOP_RIGHT);

  // Headers
  let headerLine = BOX.VERTICAL;
  headers.forEach((header, index) => {
    headerLine += centerText(header, columnWidth);
    if (index < headers.length - 1) {
      headerLine += BOX.VERTICAL;
    }
  });
  headerLine += BOX.VERTICAL;
  lines.push(headerLine);

  // Header separator
  let separator = BOX.T_RIGHT;
  headers.forEach((_, index) => {
    separator += repeat(BOX.HORIZONTAL, columnWidth);
    if (index < headers.length - 1) {
      separator += BOX.CROSS;
    }
  });
  separator += BOX.T_LEFT;
  lines.push(separator);

  // Rows
  rows.forEach((row, rowIndex) => {
    let rowLine = BOX.VERTICAL;
    row.forEach((cell, colIndex) => {
      rowLine += centerText(String(cell), columnWidth);
      if (colIndex < row.length - 1) {
        rowLine += BOX.VERTICAL;
      }
    });
    rowLine += BOX.VERTICAL;
    lines.push(rowLine);

    // Row separator (except for last row)
    if (rowIndex < rows.length - 1) {
      let rowSep = BOX.T_RIGHT;
      headers.forEach((_, index) => {
        rowSep += repeat(BOX.HORIZONTAL, columnWidth);
        if (index < headers.length - 1) {
          rowSep += BOX.CROSS;
        }
      });
      rowSep += BOX.T_LEFT;
      lines.push(rowSep);
    }
  });

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, totalWidth) + BOX.BOTTOM_RIGHT);

  return lines.join('\n');
}

/**
 * Generate a card component
 * @param {string} title - Card title
 * @param {Array<string>} content - Card content lines
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateCard(title, content = [], options = {}) {
  const { width = 20, height = 8 } = options;
  const lines = [];

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.TOP_RIGHT);

  // Title
  lines.push(BOX.VERTICAL + centerText(title, width - 2) + BOX.VERTICAL);

  // Title separator
  lines.push(BOX.T_RIGHT + repeat(BOX.HORIZONTAL, width - 2) + BOX.T_LEFT);

  // Content
  const contentHeight = height - 4; // Excluding borders and title
  for (let i = 0; i < contentHeight; i++) {
    const text = content[i] || '';
    const paddedText = centerText(text, width - 2);
    lines.push(BOX.VERTICAL + paddedText + BOX.VERTICAL);
  }

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.BOTTOM_RIGHT);

  return lines.join('\n');
}

/**
 * Generate a modal dialog
 * @param {string} title - Modal title
 * @param {Array<string>} content - Modal content lines
 * @param {Array<string>} buttons - Button labels
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateModal(title, content = [], buttons = ['OK', 'Cancel'], options = {}) {
  const { width = 50, padding = 2 } = options;
  const lines = [];

  // Top border
  lines.push(BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.TOP_RIGHT);

  // Title
  lines.push(BOX.VERTICAL + centerText(title, width - 2) + BOX.VERTICAL);
  lines.push(BOX.T_RIGHT + repeat(BOX.HORIZONTAL, width - 2) + BOX.T_LEFT);

  // Padding
  for (let i = 0; i < padding; i++) {
    lines.push(BOX.VERTICAL + repeat(' ', width - 2) + BOX.VERTICAL);
  }

  // Content
  content.forEach((line) => {
    lines.push(BOX.VERTICAL + centerText(line, width - 2) + BOX.VERTICAL);
  });

  // Padding
  for (let i = 0; i < padding; i++) {
    lines.push(BOX.VERTICAL + repeat(' ', width - 2) + BOX.VERTICAL);
  }

  // Buttons
  const buttonLine = buttons.map(btn => `[${btn}]`).join('   ');
  lines.push(BOX.VERTICAL + centerText(buttonLine, width - 2) + BOX.VERTICAL);

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.BOTTOM_RIGHT);

  return lines.join('\n');
}

/**
 * Generate a grid layout
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function generateLayoutGrid(rows = 2, cols = 3, options = {}) {
  const { cellWidth = 15, cellHeight = 5, labels = [] } = options;
  const lines = [];

  const totalWidth = (cellWidth * cols) + (cols + 1);

  for (let r = 0; r < rows; r++) {
    const rowLines = [];

    for (let h = 0; h < cellHeight; h++) {
      let line = '';

      for (let c = 0; c < cols; c++) {
        const cellIndex = r * cols + c;
        const label = labels[cellIndex] || `Cell ${cellIndex + 1}`;

        if (h === 0) {
          // Top border
          if (c === 0) {
            line += (r === 0 ? BOX.TOP_LEFT : BOX.T_RIGHT);
          }
          line += repeat(BOX.HORIZONTAL, cellWidth);
          if (c < cols - 1) {
            line += (r === 0 ? BOX.T_DOWN : BOX.CROSS);
          } else {
            line += (r === 0 ? BOX.TOP_RIGHT : BOX.T_LEFT);
          }
        } else if (h === Math.floor(cellHeight / 2)) {
          // Middle line with label
          if (c === 0) line += BOX.VERTICAL;
          line += centerText(label, cellWidth);
          line += BOX.VERTICAL;
        } else if (h === cellHeight - 1) {
          // Bottom border (if last row)
          if (r === rows - 1) {
            if (c === 0) line += BOX.BOTTOM_LEFT;
            line += repeat(BOX.HORIZONTAL, cellWidth);
            if (c < cols - 1) {
              line += BOX.T_UP;
            } else {
              line += BOX.BOTTOM_RIGHT;
            }
          } else {
            // Not last row, just content
            if (c === 0) line += BOX.VERTICAL;
            line += repeat(' ', cellWidth);
            line += BOX.VERTICAL;
          }
        } else {
          // Content line
          if (c === 0) line += BOX.VERTICAL;
          line += repeat(' ', cellWidth);
          line += BOX.VERTICAL;
        }
      }

      rowLines.push(line);
    }

    lines.push(...rowLines);
  }

  return lines.join('\n');
}

/**
 * Generate a complete ASCII wireframe with layout
 * @param {Object} components - Component definitions
 * @param {Object} layout - Layout configuration
 * @returns {string}
 */
export function generateASCIIWireframe(components = {}, layout = {}) {
  const { type = 'dashboard', width = 60 } = layout;

  if (type === 'dashboard') {
    return generateDashboardLayout(components, { width });
  } else if (type === 'form') {
    return generateFormLayout(components, { width });
  } else if (type === 'table') {
    return generateTableLayout(components, { width });
  } else if (type === 'modal') {
    return generateModalLayout(components, { width });
  }

  return generateCustomLayout(components, layout);
}

/**
 * Generate a dashboard layout
 * @param {Object} components - Component definitions
 * @param {Object} options - Layout options
 * @returns {string}
 */
function generateDashboardLayout(components = {}, options = {}) {
  const { width = 60 } = options;
  const lines = [];

  // Navbar
  const navItems = components.navbar?.items || ['Dashboard', 'Settings', 'Profile'];
  const navbar = generateNavbar(navItems, { width });
  lines.push(navbar);

  // Main content area with sidebar
  const sidebarWidth = 15;
  const contentWidth = width - sidebarWidth - 3;

  const sidebarItems = components.sidebar?.items || ['Dashboard', 'Users', 'Reports', 'Settings'];
  const sidebarLines = generateSidebar(sidebarItems, { width: sidebarWidth });

  // Stats cards
  const stats = components.stats || [
    { title: 'Stat 1', value: '42' },
    { title: 'Stat 2', value: '128' },
    { title: 'Stat 3', value: '$1.2K' }
  ];

  const cardWidth = Math.floor((contentWidth - (stats.length - 1) * 2) / stats.length);

  // Welcome section
  const welcomeLines = [
    BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, contentWidth - 2) + BOX.TOP_RIGHT,
    BOX.VERTICAL + leftText('  Welcome, User!', contentWidth - 2) + BOX.VERTICAL,
    BOX.T_RIGHT + repeat(BOX.HORIZONTAL, contentWidth - 2) + BOX.T_LEFT
  ];

  // Stats section
  let statsTopLine = BOX.VERTICAL + '  ';
  let statsValueLine = BOX.VERTICAL + '  ';
  let statsBottomLine = BOX.VERTICAL + '  ';

  stats.forEach((stat, index) => {
    statsTopLine += BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, cardWidth - 2) + BOX.TOP_RIGHT;
    statsValueLine += BOX.VERTICAL + centerText(stat.title, cardWidth - 2) + BOX.VERTICAL;
    statsBottomLine += BOX.VERTICAL + centerText(stat.value, cardWidth - 2) + BOX.VERTICAL;

    if (index < stats.length - 1) {
      statsTopLine += ' ';
      statsValueLine += ' ';
      statsBottomLine += ' ';
    }
  });

  const statsEndPadding = contentWidth - 4 - (cardWidth * stats.length) - (stats.length - 1);
  statsTopLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;
  statsValueLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;
  statsBottomLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;

  welcomeLines.push(statsTopLine);
  welcomeLines.push(statsValueLine);

  // Add value lines
  stats.forEach(() => {
    let valueLine = BOX.VERTICAL + '  ';
    stats.forEach((stat, index) => {
      valueLine += BOX.VERTICAL + centerText(stat.value, cardWidth - 2) + BOX.VERTICAL;
      if (index < stats.length - 1) valueLine += ' ';
    });
    valueLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;
    welcomeLines.push(valueLine);
  });

  // Close stats boxes
  let statsClose = BOX.VERTICAL + '  ';
  stats.forEach((stat, index) => {
    statsClose += BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, cardWidth - 2) + BOX.BOTTOM_RIGHT;
    if (index < stats.length - 1) statsClose += ' ';
  });
  statsClose += repeat(' ', statsEndPadding) + BOX.VERTICAL;
  welcomeLines.push(statsClose);

  // Close content area
  welcomeLines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, contentWidth - 2) + BOX.BOTTOM_RIGHT);

  // Combine sidebar and content
  const maxLines = Math.max(sidebarLines.length, welcomeLines.length);
  for (let i = 0; i < maxLines; i++) {
    const sidebarLine = sidebarLines[i] || (BOX.VERTICAL + repeat(' ', sidebarWidth - 2) + BOX.VERTICAL);
    const contentLine = welcomeLines[i] || repeat(' ', contentWidth);
    lines.push(sidebarLine + ' ' + contentLine);
  }

  // Bottom border
  lines.push(BOX.BOTTOM_LEFT + repeat(BOX.HORIZONTAL, width - 2) + BOX.BOTTOM_RIGHT);

  return lines.join('\n');
}

/**
 * Generate a form layout
 */
function generateFormLayout(components = {}, options = {}) {
  const fields = components.fields || [
    { label: 'Email', placeholder: 'user@example.com' },
    { label: 'Password', placeholder: '********' }
  ];

  return generateForm(fields, { title: components.title || 'Login Form', ...options });
}

/**
 * Generate a table layout
 */
function generateTableLayout(components = {}, options = {}) {
  const headers = components.headers || ['Name', 'Email', 'Status'];
  const rows = components.rows || [
    ['John Doe', 'john@example.com', 'Active'],
    ['Jane Smith', 'jane@example.com', 'Active']
  ];

  return generateTable(headers, rows, options);
}

/**
 * Generate a modal layout
 */
function generateModalLayout(components = {}, options = {}) {
  const title = components.title || 'Confirmation';
  const content = components.content || ['Are you sure you want to proceed?'];
  const buttons = components.buttons || ['Confirm', 'Cancel'];

  return generateModal(title, content, buttons, options);
}

/**
 * Generate a custom layout
 */
function generateCustomLayout(components = {}, layout = {}) {
  // Default to a simple grid
  const { rows = 2, cols = 2 } = layout;
  return generateLayoutGrid(rows, cols, { labels: components.labels });
}

/**
 * Extract component list from ASCII wireframe
 * @param {string} wireframe - ASCII wireframe string
 * @returns {Array<string>} - List of detected components
 */
export function extractComponentList(wireframe) {
  const components = [];
  const lines = wireframe.split('\n');

  // Simple heuristic: look for text within boxes
  lines.forEach((line) => {
    // Remove box characters
    const text = line.replace(/[┌┐└┘│─├┤┬┴┼]/g, '').trim();

    // If line has meaningful text (not just spaces or common labels)
    if (text && text.length > 2 && !text.match(/^[\s\[\]]+$/)) {
      // Extract potential component names (text between brackets or standalone)
      const matches = text.match(/\[([^\]]+)\]/g);
      if (matches) {
        matches.forEach((match) => {
          const component = match.replace(/[\[\]]/g, '');
          if (!components.includes(component)) {
            components.push(component);
          }
        });
      }
    }
  });

  return components;
}
