import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectSmells } from '../src/site-intel/summarizer/page-analyzer.js';

describe('site-intel Lighthouse + axe-core smell detection', () => {
  // Base page data that produces no smells
  const cleanPage = {
    url: 'https://example.com/dashboard',
    statusCode: 200,
    title: 'Dashboard',
    htmlLength: 50000,
    metadata: {
      title: 'Dashboard',
      h1: 'Welcome',
      metaDescription: 'App dashboard',
      elementCount: 500,
      forms: [],
      interactiveElements: { buttons: 5, inputs: 2, modals: 0 }
    }
  };

  describe('Lighthouse performance smells', () => {
    it('detects slow FCP (> 3000ms)', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 60, accessibility: 90, seo: 80, bestPractices: 80 },
          metrics: { fcp: 4500, lcp: 2000, cls: 0.1, tbt: 100, si: 3000, tti: 5000 }
        }
      };
      const smells = detectSmells(page);
      const fcpSmell = smells.find(s => s.smell === 'Slow First Contentful Paint');
      assert.ok(fcpSmell, 'Should detect slow FCP');
      assert.equal(fcpSmell.severity, 'high');
      assert.ok(fcpSmell.detail.includes('4500'));
    });

    it('detects slow LCP (> 4000ms)', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 40, accessibility: 90, seo: 80, bestPractices: 80 },
          metrics: { fcp: 2000, lcp: 5500, cls: 0.1, tbt: 100, si: 3000, tti: 5000 }
        }
      };
      const smells = detectSmells(page);
      const lcpSmell = smells.find(s => s.smell === 'Slow Largest Contentful Paint');
      assert.ok(lcpSmell, 'Should detect slow LCP');
      assert.equal(lcpSmell.severity, 'high');
    });

    it('detects poor CLS (> 0.25)', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 70, accessibility: 90, seo: 80, bestPractices: 80 },
          metrics: { fcp: 1000, lcp: 2000, cls: 0.35, tbt: 100, si: 2000, tti: 3000 }
        }
      };
      const smells = detectSmells(page);
      const clsSmell = smells.find(s => s.smell === 'Poor Cumulative Layout Shift');
      assert.ok(clsSmell, 'Should detect poor CLS');
      assert.equal(clsSmell.severity, 'medium');
    });

    it('detects high TBT (> 600ms)', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 50, accessibility: 90, seo: 80, bestPractices: 80 },
          metrics: { fcp: 1000, lcp: 2000, cls: 0.1, tbt: 800, si: 2000, tti: 5000 }
        }
      };
      const smells = detectSmells(page);
      const tbtSmell = smells.find(s => s.smell === 'High Total Blocking Time');
      assert.ok(tbtSmell, 'Should detect high TBT');
      assert.equal(tbtSmell.severity, 'medium');
    });

    it('detects low performance score (< 50)', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 30, accessibility: 90, seo: 80, bestPractices: 80 },
          metrics: { fcp: 1000, lcp: 2000, cls: 0.1, tbt: 100, si: 2000, tti: 3000 }
        }
      };
      const smells = detectSmells(page);
      const perfSmell = smells.find(s => s.smell === 'Low Performance Score');
      assert.ok(perfSmell, 'Should detect low perf score');
      assert.equal(perfSmell.severity, 'high');
    });

    it('detects low SEO score (< 50)', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 80, accessibility: 90, seo: 30, bestPractices: 80 },
          metrics: { fcp: 1000, lcp: 2000, cls: 0.1, tbt: 100, si: 2000, tti: 3000 }
        }
      };
      const smells = detectSmells(page);
      const seoSmell = smells.find(s => s.smell === 'Low SEO Score');
      assert.ok(seoSmell, 'Should detect low SEO score');
      assert.equal(seoSmell.severity, 'medium');
    });

    it('does not detect smells when Lighthouse not successful', () => {
      const page = {
        ...cleanPage,
        lighthouse: { success: false, scores: {}, metrics: {} }
      };
      const smells = detectSmells(page);
      const perfSmells = smells.filter(s =>
        s.smell.includes('Contentful') || s.smell.includes('Performance') || s.smell.includes('SEO')
      );
      assert.equal(perfSmells.length, 0);
    });

    it('does not detect smells when metrics are good', () => {
      const page = {
        ...cleanPage,
        lighthouse: {
          success: true,
          scores: { performance: 95, accessibility: 98, seo: 100, bestPractices: 95 },
          metrics: { fcp: 800, lcp: 1500, cls: 0.05, tbt: 100, si: 1000, tti: 2000 }
        }
      };
      const smells = detectSmells(page);
      const perfSmells = smells.filter(s =>
        s.smell.includes('Contentful') || s.smell.includes('Layout') ||
        s.smell.includes('Blocking') || s.smell.includes('Performance') || s.smell.includes('SEO')
      );
      assert.equal(perfSmells.length, 0);
    });
  });

  describe('axe-core accessibility smells', () => {
    it('detects critical/serious violations', () => {
      const page = {
        ...cleanPage,
        accessibility: {
          success: true,
          violations: [
            { id: 'color-contrast', impact: 'serious', description: 'Color contrast insufficient' },
            { id: 'image-alt', impact: 'critical', description: 'Images must have alt text' }
          ],
          violationCount: 2,
          criticalCount: 1,
          seriousCount: 1,
          moderateCount: 0,
          minorCount: 0,
          passes: 50,
          incomplete: 3
        }
      };
      const smells = detectSmells(page);
      const a11ySmell = smells.find(s => s.smell === 'Critical Accessibility Violation');
      assert.ok(a11ySmell, 'Should detect critical a11y violation');
      assert.equal(a11ySmell.severity, 'high');
      assert.ok(a11ySmell.detail.includes('2 critical/serious'));
    });

    it('detects moderate violations', () => {
      const page = {
        ...cleanPage,
        accessibility: {
          success: true,
          violations: [
            { id: 'heading-order', impact: 'moderate', description: 'Heading levels should increase by one' }
          ],
          violationCount: 1,
          criticalCount: 0,
          seriousCount: 0,
          moderateCount: 1,
          minorCount: 0,
          passes: 50,
          incomplete: 3
        }
      };
      const smells = detectSmells(page);
      const moderateSmell = smells.find(s => s.smell === 'Moderate Accessibility Violation');
      assert.ok(moderateSmell, 'Should detect moderate a11y violation');
      assert.equal(moderateSmell.severity, 'medium');
    });

    it('does not detect smells when axe-core not successful', () => {
      const page = {
        ...cleanPage,
        accessibility: { success: false, violations: [], violationCount: 0, criticalCount: 0, seriousCount: 0, moderateCount: 0, minorCount: 0 }
      };
      const smells = detectSmells(page);
      const a11ySmells = smells.filter(s => s.smell.includes('Accessibility'));
      assert.equal(a11ySmells.length, 0);
    });

    it('does not detect smells when no violations', () => {
      const page = {
        ...cleanPage,
        accessibility: {
          success: true,
          violations: [],
          violationCount: 0,
          criticalCount: 0,
          seriousCount: 0,
          moderateCount: 0,
          minorCount: 0,
          passes: 80,
          incomplete: 0
        }
      };
      const smells = detectSmells(page);
      const a11ySmells = smells.filter(s => s.smell.includes('Accessibility'));
      assert.equal(a11ySmells.length, 0);
    });
  });
});
