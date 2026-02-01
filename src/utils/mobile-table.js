/**
 * Mobile-Friendly Table Formatter
 *
 * Provides utilities for formatting tables in a mobile-optimized layout
 * following the /pr-merge card-based design pattern:
 * - Limited width (40 chars max)
 * - Stacked columns (rows as cards)
 * - Word wrapping instead of truncation
 * - Box-drawing characters for visual structure
 */

/**
 * Wrap text to fit within a maximum width, breaking at word boundaries
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width per line
 * @returns {string[]} Array of wrapped lines
 */
export function wrapText(text, maxWidth = 36) {
  if (!text) return [''];

  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    // If word itself is longer than maxWidth, break it
    if (word.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Break long word into chunks
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Pad text to exact width
 * @param {string} text - Text to pad
 * @param {number} width - Target width
 * @returns {string} Padded text
 */
export function padToWidth(text, width = 36) {
  if (text.length >= width) return text.slice(0, width);
  return text + ' '.repeat(width - text.length);
}

/**
 * Create a mobile-friendly card for a single item
 * Max width: 40 chars (36 content + 4 for borders)
 *
 * @param {Object} options - Card options
 * @param {string} options.header - Card header (single line)
 * @param {Object[]} options.fields - Array of {label, value} objects
 * @param {boolean} options.isLast - Whether this is the last card
 * @returns {string} Formatted card
 */
export function createMobileCard({ header, fields, isLast = false }) {
  const width = 36;
  const lines = [];

  // Top border
  lines.push('┌' + '─'.repeat(width + 2) + '┐');

  // Header
  if (header) {
    lines.push('│ ' + padToWidth(header, width) + ' │');
    lines.push('├' + '─'.repeat(width + 2) + '┤');
  }

  // Fields
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const { label, value } = field;

    // If label provided, show as "Label: value"
    if (label) {
      const labelLine = `${label}: ${value}`;
      const wrappedLines = wrapText(labelLine, width);
      wrappedLines.forEach(line => {
        lines.push('│ ' + padToWidth(line, width) + ' │');
      });
    } else {
      // Just value, wrapped
      const wrappedLines = wrapText(value, width);
      wrappedLines.forEach(line => {
        lines.push('│ ' + padToWidth(line, width) + ' │');
      });
    }

    // Add separator between fields (but not after last field)
    if (i < fields.length - 1) {
      lines.push('├' + '─'.repeat(width + 2) + '┤');
    }
  }

  // Bottom border
  lines.push('└' + '─'.repeat(width + 2) + '┘');

  return lines.join('\n');
}

/**
 * Create a mobile-friendly table from an array of items
 * Each item becomes a card, stacked vertically
 *
 * @param {Object} options - Table options
 * @param {string} options.title - Table title
 * @param {Object[]} options.items - Array of items to display
 * @param {Function} options.formatter - Function to format each item into {header, fields}
 * @returns {string} Formatted table
 */
export function createMobileTable({ title, items, formatter }) {
  const lines = [];

  // Title
  if (title) {
    lines.push('');
    lines.push(title);
    lines.push('');
  }

  // Cards
  items.forEach((item, index) => {
    const cardData = formatter(item, index);
    const card = createMobileCard({
      ...cardData,
      isLast: index === items.length - 1
    });
    lines.push(card);

    // Add spacing between cards
    if (index < items.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Create a simple mobile menu list (no cards, just options)
 * Optimized for command menus like /menu
 *
 * @param {Object} options - Menu options
 * @param {string} options.title - Menu title
 * @param {Object[]} options.items - Array of {key, label, description?} objects
 * @param {number} options.width - Menu width (default: 36)
 * @returns {string} Formatted menu
 */
export function createMobileMenu({ title, items, width = 36 }) {
  const lines = [];

  // Title box
  if (title) {
    lines.push('┌' + '─'.repeat(width + 2) + '┐');
    lines.push('│ ' + padToWidth(title, width) + ' │');
    lines.push('└' + '─'.repeat(width + 2) + '┘');
    lines.push('');
  }

  // Menu items
  items.forEach(item => {
    if (item.separator) {
      // Separator line
      lines.push('  ' + '─'.repeat(width - 2));
    } else {
      const { key, label, description } = item;

      // Key and label on one line
      const mainLine = `[${key}] ${label}`;
      lines.push('  ' + mainLine);

      // Optional description (indented)
      if (description) {
        const wrappedDesc = wrapText(description, width - 6);
        wrappedDesc.forEach(line => {
          lines.push('      ' + line);
        });
      }

      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Detect if we should use mobile formatting
 * Checks Happy CLI environment variables and tech-stack.json
 * @param {Object} techStack - Optional tech-stack.json object
 * @returns {boolean} True if mobile formatting should be used
 */
export function shouldUseMobileFormatting(techStack = null) {
  // Check Happy CLI environment variables
  const isHappyMode = !!(
    process.env.HAPPY_HOME_DIR ||
    process.env.HAPPY_SERVER_URL ||
    process.env.HAPPY_WEBAPP_URL ||
    process.env.HAPPY_EXPERIMENTAL ||
    process.env.HAPPY_SESSION === 'true'
  );

  if (isHappyMode) return true;

  // Check tech-stack.json happyMode setting
  if (techStack?.happyMode?.enabled) {
    return true;
  }

  return false;
}
