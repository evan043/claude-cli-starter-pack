/**
 * ASCII UI Components
 * Individual component generators (box, navbar, sidebar, form, table, card, modal, grid)
 */

import { BOX, repeat, centerText, leftText } from './primitives.js';

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
