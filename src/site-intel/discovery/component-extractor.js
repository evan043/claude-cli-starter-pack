/**
 * Website Intelligence - Component Extractor
 *
 * Detects UI components, shared elements, and design patterns from HTML/DOM.
 */

/**
 * Extract component patterns from HTML content
 * @param {string} html - Page HTML content
 * @param {Object} metadata - Page metadata from crawler
 * @returns {Object} Extracted components
 */
export function extractComponents(html, metadata) {
  const components = {
    navigation: [],
    forms: [],
    dataDisplay: [],
    interactive: [],
    layout: [],
    media: [],
    shared: []
  };

  if (metadata?.navLinks?.length > 0) {
    components.navigation.push({
      type: 'navbar',
      links: metadata.navLinks.length,
      items: metadata.navLinks.map(l => l.text).filter(Boolean)
    });
  }

  const sidebarPatterns = [
    /class="[^"]*sidebar[^"]*"/i,
    /class="[^"]*side-nav[^"]*"/i,
    /id="[^"]*sidebar[^"]*"/i,
    /role="complementary"/i
  ];
  if (sidebarPatterns.some(p => p.test(html))) {
    components.navigation.push({ type: 'sidebar' });
  }

  if (metadata?.forms?.length > 0) {
    for (const form of metadata.forms) {
      components.forms.push({
        type: 'form',
        method: form.method,
        inputCount: form.inputs.length,
        inputTypes: [...new Set(form.inputs.map(i => i.type))]
      });
    }
  }

  const tablePattern = /<table[\s>]/i;
  const gridPattern = /class="[^"]*(?:grid|data-grid|ag-grid)[^"]*"/i;
  const listPattern = /class="[^"]*(?:list-group|item-list|data-list)[^"]*"/i;

  if (tablePattern.test(html)) components.dataDisplay.push({ type: 'table' });
  if (gridPattern.test(html)) components.dataDisplay.push({ type: 'data-grid' });
  if (listPattern.test(html)) components.dataDisplay.push({ type: 'list' });

  const cardMatches = html.match(/class="[^"]*\bcard\b[^"]*"/gi);
  if (cardMatches && cardMatches.length > 0) {
    components.dataDisplay.push({ type: 'card', count: cardMatches.length });
  }

  if (metadata?.interactiveElements) {
    const { buttons, inputs, modals } = metadata.interactiveElements;
    if (buttons > 0) components.interactive.push({ type: 'buttons', count: buttons });
    if (modals > 0) components.interactive.push({ type: 'modal', count: modals });
  }

  const chartPatterns = [
    { pattern: /class="[^"]*chart[^"]*"/i, type: 'chart' },
    { pattern: /class="[^"]*recharts[^"]*"/i, type: 'recharts' },
    { pattern: /<canvas/i, type: 'canvas-chart' },
    { pattern: /<svg[^>]*class="[^"]*chart/i, type: 'svg-chart' }
  ];
  for (const { pattern, type } of chartPatterns) {
    if (pattern.test(html)) components.dataDisplay.push({ type });
  }

  const layoutPatterns = [
    { pattern: /class="[^"]*(?:container|wrapper|layout)[^"]*"/i, type: 'container' },
    { pattern: /class="[^"]*(?:header|app-header|top-bar)[^"]*"/i, type: 'header' },
    { pattern: /class="[^"]*(?:footer|app-footer)[^"]*"/i, type: 'footer' },
    { pattern: /class="[^"]*(?:hero|banner|jumbotron)[^"]*"/i, type: 'hero' },
    { pattern: /class="[^"]*(?:tabs|tab-panel|tab-content)[^"]*"/i, type: 'tabs' }
  ];
  for (const { pattern, type } of layoutPatterns) {
    if (pattern.test(html)) components.layout.push({ type });
  }

  if (metadata?.images > 0) {
    components.media.push({ type: 'images', count: metadata.images });
  }
  if (/<video/i.test(html)) components.media.push({ type: 'video' });
  if (/<audio/i.test(html)) components.media.push({ type: 'audio' });

  const allComponents = [
    ...components.navigation,
    ...components.forms,
    ...components.dataDisplay,
    ...components.interactive,
    ...components.layout,
    ...components.media
  ];

  return {
    ...components,
    summary: {
      totalComponents: allComponents.length,
      types: [...new Set(allComponents.map(c => c.type))],
      hasNavigation: components.navigation.length > 0,
      hasForms: components.forms.length > 0,
      hasDataDisplay: components.dataDisplay.length > 0,
      hasInteractive: components.interactive.length > 0,
      framework: metadata?.frameworkHints || {}
    }
  };
}

/**
 * Detect shared components across multiple pages
 * @param {Map<string, Object>} pageComponents - Map of URL to components
 * @returns {Object[]} Shared components with usage counts
 */
export function detectSharedComponents(pageComponents) {
  const componentUsage = new Map();

  for (const [url, components] of pageComponents) {
    const allTypes = [
      ...components.navigation.map(c => `nav:${c.type}`),
      ...components.layout.map(c => `layout:${c.type}`),
      ...components.forms.map(c => `form:${c.inputTypes?.join(',') || 'generic'}`),
      ...components.dataDisplay.map(c => `data:${c.type}`),
      ...components.interactive.map(c => `interactive:${c.type}`)
    ];

    for (const type of allTypes) {
      if (!componentUsage.has(type)) {
        componentUsage.set(type, new Set());
      }
      componentUsage.get(type).add(url);
    }
  }

  return Array.from(componentUsage.entries())
    .filter(([, urls]) => urls.size > 1)
    .map(([type, urls]) => ({
      component: type,
      usedOn: Array.from(urls),
      usageCount: urls.size,
      isGlobal: urls.size === pageComponents.size
    }))
    .sort((a, b) => b.usageCount - a.usageCount);
}

export default { extractComponents, detectSharedComponents };
