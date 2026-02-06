/**
 * ASCII Layout Orchestrators
 * High-level wireframe generators that compose components
 */

import { BOX, repeat, centerText, leftText } from './primitives.js';
import { generateNavbar, generateSidebar, generateForm, generateTable, generateModal, generateLayoutGrid } from './components.js';

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
  let statsTopLine = `${BOX.VERTICAL}  `;
  let statsValueLine = `${BOX.VERTICAL}  `;

  stats.forEach((stat, index) => {
    statsTopLine += BOX.TOP_LEFT + repeat(BOX.HORIZONTAL, cardWidth - 2) + BOX.TOP_RIGHT;
    statsValueLine += BOX.VERTICAL + centerText(stat.title, cardWidth - 2) + BOX.VERTICAL;

    if (index < stats.length - 1) {
      statsTopLine += ' ';
      statsValueLine += ' ';
    }
  });

  const statsEndPadding = contentWidth - 4 - (cardWidth * stats.length) - (stats.length - 1);
  statsTopLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;
  statsValueLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;

  welcomeLines.push(statsTopLine);
  welcomeLines.push(statsValueLine);

  // Add value lines
  stats.forEach(() => {
    let valueLine = `${BOX.VERTICAL}  `;
    stats.forEach((stat, index) => {
      valueLine += BOX.VERTICAL + centerText(stat.value, cardWidth - 2) + BOX.VERTICAL;
      if (index < stats.length - 1) valueLine += ' ';
    });
    valueLine += repeat(' ', statsEndPadding) + BOX.VERTICAL;
    welcomeLines.push(valueLine);
  });

  // Close stats boxes
  let statsClose = `${BOX.VERTICAL}  `;
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
    lines.push(`${sidebarLine} ${contentLine}`);
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
    if (text && text.length > 2 && !text.match(/^[\s[\]]+$/)) {
      // Extract potential component names (text between brackets or standalone)
      const matches = text.match(/\[([^\]]+)\]/g);
      if (matches) {
        matches.forEach((match) => {
          const component = match.replace(/[[\]]/g, '');
          if (!components.includes(component)) {
            components.push(component);
          }
        });
      }
    }
  });

  return components;
}
