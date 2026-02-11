/**
 * Interactive Element Liveness Checker
 *
 * Detects "dead UI" — elements that render but don't respond to interaction.
 * For each interactive element on a page, this module:
 *   1. Records the DOM state (snapshot)
 *   2. Interacts with the element (click, focus, type)
 *   3. Watches for signals: DOM mutations, network requests, focus changes
 *   4. Flags elements that produce zero response as "dead"
 *
 * This catches the common SPA bug where components render visually
 * but event handlers are missing, broken, or disconnected from state.
 */

/**
 * Run a liveness audit on all interactive elements of the current page.
 *
 * @param {import('playwright').Page} page - Playwright page (already navigated)
 * @param {Object} options
 * @param {number} options.interactionTimeout - ms to wait for response after interaction (default 1500)
 * @param {boolean} options.skipNavLinks - skip <a> tags that just navigate (default true)
 * @param {string[]} options.skipSelectors - CSS selectors to exclude from audit
 * @param {boolean} options.verbose - log every element tested
 * @returns {Promise<Object>} Liveness audit result
 */
export async function checkLiveness(page, options = {}) {
  const {
    interactionTimeout = 1500,
    skipNavLinks = true,
    skipSelectors = [],
    verbose = false,
  } = options;

  // Inject the liveness observer into the page
  const results = await page.evaluate(async ({ interactionTimeout, skipNavLinks, skipSelectors, verbose }) => {

    // ── helpers ──────────────────────────────────────────────────
    function getSelector(el) {
      if (el.dataset?.testid) return `[data-testid="${el.dataset.testid}"]`;
      if (el.id) return `#${el.id}`;
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim().slice(0, 40);
      const type = el.getAttribute('type') || '';
      const role = el.getAttribute('role') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const name = el.getAttribute('name') || '';
      let desc = tag;
      if (type) desc += `[type="${type}"]`;
      if (role) desc += `[role="${role}"]`;
      if (name) desc += `[name="${name}"]`;
      if (ariaLabel) desc += ` (${ariaLabel})`;
      else if (text) desc += ` "${text}"`;
      return desc;
    }

    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    }

    function isInViewport(el) {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0
          && rect.left < window.innerWidth && rect.right > 0;
    }

    function getInteractiveElements() {
      const selector = [
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[role="button"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="checkbox"]',
        '[role="switch"]',
        '[role="slider"]',
        '[role="combobox"]',
        '[role="option"]',
        '[contenteditable="true"]',
        '[onclick]',
        'td[class*="edit"], td[class*="click"]',
        '.editable',
        '[data-editable]',
        'a[href]:not([href^="http"]):not([href^="mailto"])',
      ].join(', ');

      let elements = Array.from(document.querySelectorAll(selector));

      // Filter out invisible, off-screen, and skipped elements
      elements = elements.filter(el => isVisible(el));

      // Optionally skip pure navigation links
      if (skipNavLinks) {
        elements = elements.filter(el => {
          if (el.tagName === 'A') {
            const href = el.getAttribute('href') || '';
            // Keep links that look like actions (# anchors, javascript:, empty)
            if (href === '#' || href === '' || href.startsWith('javascript:')) return true;
            // Skip links that are just navigation to other pages
            if (href.startsWith('/') && !href.includes('#')) return false;
          }
          return true;
        });
      }

      // Apply skip selectors
      for (const skip of skipSelectors) {
        elements = elements.filter(el => !el.matches(skip));
      }

      return elements;
    }

    function hasEventListeners(el) {
      // Check for inline handlers
      const inlineAttrs = ['onclick', 'onchange', 'oninput', 'onkeydown', 'onkeyup',
                           'onfocus', 'onblur', 'onmousedown', 'onmouseup', 'onsubmit'];
      for (const attr of inlineAttrs) {
        if (el.getAttribute(attr)) return true;
      }
      // Check for React synthetic events (React 16+ stores on __reactFiber or __reactInternalInstance)
      const reactKeys = Object.keys(el).filter(k =>
        k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance') ||
        k.startsWith('__reactEvents') || k.startsWith('__reactProps')
      );
      if (reactKeys.length > 0) {
        // Check if any React props contain event handlers
        for (const key of reactKeys) {
          const fiber = el[key];
          if (fiber?.memoizedProps) {
            const props = fiber.memoizedProps;
            for (const propKey of Object.keys(props)) {
              if (propKey.startsWith('on') && typeof props[propKey] === 'function') {
                return true;
              }
            }
          }
          // Also check __reactProps$... pattern
          if (key.startsWith('__reactProps') && typeof el[key] === 'object') {
            for (const propKey of Object.keys(el[key])) {
              if (propKey.startsWith('on') && typeof el[key][propKey] === 'function') {
                return true;
              }
            }
          }
        }
        // Has React fiber but no event handlers — likely dead
        return false;
      }
      // Fallback: can't determine
      return null; // unknown
    }

    // ── main audit loop ─────────────────────────────────────────
    const elements = getInteractiveElements();
    const audit = [];
    let deadCount = 0;
    let aliveCount = 0;
    let unknownCount = 0;

    // Group elements by region/section for better reporting
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const selector = getSelector(el);
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || '';
      const inViewport = isInViewport(el);

      // Signal 1: Check for event listeners
      const hasListeners = hasEventListeners(el);

      // Signal 2: Set up DOM mutation observer
      let mutationDetected = false;
      const observer = new MutationObserver(() => { mutationDetected = true; });
      observer.observe(document.body, {
        childList: true, subtree: true, attributes: true, characterData: true
      });

      // Signal 3: Set up network request listener
      let networkRequestFired = false;
      const origFetch = window.fetch;
      const origXhrOpen = XMLHttpRequest.prototype.open;
      window.fetch = function(...args) {
        networkRequestFired = true;
        return origFetch.apply(this, args);
      };
      XMLHttpRequest.prototype.open = function(...args) {
        networkRequestFired = true;
        return origXhrOpen.apply(this, args);
      };

      // Signal 4: Track focus/blur changes
      let focusChanged = false;
      const focusHandler = () => { focusChanged = true; };
      el.addEventListener('focus', focusHandler, { once: true });

      // ── Interact with the element ──
      try {
        if (tag === 'input' || tag === 'textarea' || el.getAttribute('contenteditable') === 'true') {
          // For inputs: focus then type a character
          el.focus();
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          if (tag === 'input' && (type === 'checkbox' || type === 'radio')) {
            el.click();
          } else {
            // Simulate keypress
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (tag === 'select') {
          el.focus();
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Buttons, roles, clickable elements
          el.click();
        }
      } catch (e) {
        // Interaction failed — element is likely broken
      }

      // Wait for async responses
      await new Promise(r => setTimeout(r, interactionTimeout));

      // Tear down observers
      observer.disconnect();
      window.fetch = origFetch;
      XMLHttpRequest.prototype.open = origXhrOpen;
      el.removeEventListener('focus', focusHandler);

      // ── Evaluate signals ──
      const signals = {
        hasEventListeners: hasListeners,
        domMutated: mutationDetected,
        networkFired: networkRequestFired,
        focusReceived: focusChanged,
      };

      const signalCount =
        (hasListeners === true ? 1 : 0) +
        (mutationDetected ? 1 : 0) +
        (networkRequestFired ? 1 : 0) +
        (focusChanged ? 1 : 0);

      let status;
      if (signalCount >= 2) {
        status = 'alive';
        aliveCount++;
      } else if (signalCount === 1 && (mutationDetected || networkRequestFired)) {
        status = 'alive';
        aliveCount++;
      } else if (hasListeners === true && signalCount === 1) {
        // Has listeners but nothing happened on interaction — suspicious
        status = 'suspicious';
        unknownCount++;
      } else if (hasListeners === false) {
        // React element with no event handlers
        status = 'dead';
        deadCount++;
      } else if (signalCount === 0 && hasListeners === null) {
        status = 'dead';
        deadCount++;
      } else {
        status = 'unknown';
        unknownCount++;
      }

      // Find containing section/panel for grouping
      const section = el.closest('[data-testid], [role="tabpanel"], [role="region"], section, [class*="panel"], [class*="tab-content"]');
      const sectionId = section ? (section.dataset?.testid || section.getAttribute('role') || section.className?.split(' ')[0] || 'unknown') : 'page-root';

      audit.push({
        index: i,
        selector,
        tag,
        type: type || el.getAttribute('role') || tag,
        text: (el.textContent || '').trim().slice(0, 60),
        section: sectionId,
        inViewport,
        status,
        signals,
      });

      // After each interaction, try to dismiss any modals/popups that appeared
      // (so they don't block subsequent interactions)
      try {
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escEvent);
      } catch {}
    }

    return {
      totalInteractive: elements.length,
      alive: aliveCount,
      dead: deadCount,
      suspicious: unknownCount,
      livenessScore: elements.length > 0
        ? Math.round((aliveCount / elements.length) * 100)
        : 100,
      elements: audit,
    };
  }, { interactionTimeout, skipNavLinks, skipSelectors, verbose });

  // Post-process: group dead elements by section
  const deadBySection = {};
  const suspiciousBySection = {};
  for (const el of results.elements) {
    if (el.status === 'dead') {
      if (!deadBySection[el.section]) deadBySection[el.section] = [];
      deadBySection[el.section].push(el);
    }
    if (el.status === 'suspicious') {
      if (!suspiciousBySection[el.section]) suspiciousBySection[el.section] = [];
      suspiciousBySection[el.section].push(el);
    }
  }

  return {
    ...results,
    deadBySection,
    suspiciousBySection,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Run liveness audit on multiple routes
 *
 * @param {import('playwright').Page} page - Playwright page (logged in)
 * @param {string[]} routes - Route paths to audit
 * @param {string} baseUrl - Base URL
 * @param {Object} options - Liveness check options
 * @returns {Promise<Object>} Multi-route liveness audit
 */
export async function auditRouteLiveness(page, routes, baseUrl, options = {}) {
  const results = [];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const url = `${baseUrl.replace(/\/$/, '')}${route}`;
    console.log(`[Liveness] ${i + 1}/${routes.length}: ${route}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000); // Let JS render

      const result = await checkLiveness(page, options);
      results.push({
        route,
        url,
        ...result,
        error: null,
      });

      const deadPct = result.totalInteractive > 0
        ? Math.round((result.dead / result.totalInteractive) * 100)
        : 0;

      const icon = result.livenessScore >= 80 ? '✅' :
                   result.livenessScore >= 50 ? '⚠️' : '❌';

      console.log(`  ${icon} Liveness: ${result.livenessScore}% | ${result.alive} alive, ${result.dead} dead, ${result.suspicious} suspicious / ${result.totalInteractive} total`);

      if (result.dead > 0) {
        for (const [section, elements] of Object.entries(result.deadBySection)) {
          console.log(`     DEAD in [${section}]: ${elements.map(e => e.selector).join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message.slice(0, 80)}`);
      results.push({
        route,
        url,
        error: error.message,
        totalInteractive: 0,
        alive: 0,
        dead: 0,
        suspicious: 0,
        livenessScore: 0,
        elements: [],
        deadBySection: {},
        suspiciousBySection: {},
      });
    }
  }

  // Aggregate
  const totalElements = results.reduce((s, r) => s + r.totalInteractive, 0);
  const totalAlive = results.reduce((s, r) => s + r.alive, 0);
  const totalDead = results.reduce((s, r) => s + r.dead, 0);
  const totalSuspicious = results.reduce((s, r) => s + r.suspicious, 0);

  return {
    summary: {
      routesScanned: routes.length,
      routesWithDeadUI: results.filter(r => r.dead > 0).length,
      totalInteractiveElements: totalElements,
      totalAlive,
      totalDead,
      totalSuspicious,
      overallLiveness: totalElements > 0
        ? Math.round((totalAlive / totalElements) * 100)
        : 100,
    },
    routes: results,
    scannedAt: new Date().toISOString(),
  };
}

export default { checkLiveness, auditRouteLiveness };
