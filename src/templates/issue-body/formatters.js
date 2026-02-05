/**
 * Formatting utilities and markdown helpers
 */

/**
 * Get language name for syntax highlighting
 */
export function getLanguageForExt(ext) {
  const map = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
  };
  return map[ext] || ext;
}
