/**
 * ASCII Primitives
 * Box-drawing characters and text formatting utilities
 */

// Box-drawing characters
export const BOX = {
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
export function repeat(char, count) {
  return char.repeat(Math.max(0, count));
}

/**
 * Pad text to center it within a given width
 * @param {string} text - Text to center
 * @param {number} width - Total width
 * @returns {string}
 */
export function centerText(text, width) {
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
export function leftText(text, width) {
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
export function rightText(text, width) {
  const textLen = text.length;
  if (textLen >= width) return text.substring(0, width);
  return repeat(' ', width - textLen) + text;
}
