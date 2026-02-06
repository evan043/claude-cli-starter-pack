import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { toChromaDocuments, storeToChroma, loadChromaPending } from '../src/site-intel/memory/store.js';

describe('site-intel ChromaDB integration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-intel-chroma-'));

  const mockSummaryResult = {
    summaries: [
      {
        url: 'https://example.com/',
        purpose: 'Main entry point',
        classification: { type: 'homepage' },
        primaryUser: 'All users',
        businessValue: { value: 'High', score: 8 },
        features: ['Navigation menu', 'Search'],
        smells: [{ smell: 'Missing meta description', severity: 'low' }],
        dependencies: { apis: ['/api/health'] }
      },
      {
        url: 'https://example.com/login',
        purpose: 'User authentication',
        classification: { type: 'authentication' },
        primaryUser: 'All users',
        businessValue: { value: 'High', score: 9 },
        features: ['Login form'],
        smells: [],
        dependencies: { apis: ['/api/auth'] }
      }
    ]
  };

  describe('toChromaDocuments', () => {
    it('generates correct document count', () => {
      const result = toChromaDocuments(mockSummaryResult, 'scan-123');
      assert.equal(result.documents.length, 2);
      assert.equal(result.ids.length, 2);
      assert.equal(result.metadatas.length, 2);
    });

    it('generates document text with expected fields', () => {
      const result = toChromaDocuments(mockSummaryResult, 'scan-123');
      assert.ok(result.documents[0].includes('Page: https://example.com/'));
      assert.ok(result.documents[0].includes('Purpose: Main entry point'));
      assert.ok(result.documents[0].includes('Type: homepage'));
      assert.ok(result.documents[0].includes('Business Value: High (8/10)'));
    });

    it('generates safe IDs under 200 chars', () => {
      const result = toChromaDocuments(mockSummaryResult, 'scan-123');
      for (const id of result.ids) {
        assert.ok(id.length <= 200);
        assert.ok(id.startsWith('scan-123__'));
      }
    });

    it('includes correct metadata fields', () => {
      const result = toChromaDocuments(mockSummaryResult, 'scan-123');
      const meta = result.metadatas[0];
      assert.equal(meta.url, 'https://example.com/');
      assert.equal(meta.scanId, 'scan-123');
      assert.equal(meta.type, 'homepage');
      assert.equal(meta.businessValue, '8');
      assert.equal(meta.smellCount, '1');
      assert.ok(meta.scanDate);
    });

    it('handles empty input gracefully', () => {
      const result = toChromaDocuments(null, 'scan-123');
      assert.equal(result.documents.length, 0);
    });
  });

  describe('storeToChroma', () => {
    it('writes pending file to disk', () => {
      const docs = toChromaDocuments(mockSummaryResult, 'scan-456');
      const result = storeToChroma(docs, 'example_com', { projectRoot: tmpDir });

      assert.equal(result.stored, true);
      assert.equal(result.count, 2);
      assert.ok(result.collection.startsWith('site_intel_'));
      assert.ok(fs.existsSync(result.pendingFile));
    });

    it('pending file has correct structure', () => {
      const docs = toChromaDocuments(mockSummaryResult, 'scan-456');
      storeToChroma(docs, 'example_com', { projectRoot: tmpDir });

      const dataDir = path.join(tmpDir, '.claude', 'site-intel', 'example_com');
      const pending = JSON.parse(fs.readFileSync(path.join(dataDir, 'chroma-pending.json'), 'utf8'));

      assert.ok(pending.collection);
      assert.equal(pending.documents.length, 2);
      assert.equal(pending.ids.length, 2);
      assert.equal(pending.metadatas.length, 2);
      assert.ok(pending.createdAt);
    });

    it('returns error for empty docs', () => {
      const result = storeToChroma({ documents: [], ids: [], metadatas: [] }, 'test', { projectRoot: tmpDir });
      assert.equal(result.stored, false);
      assert.ok(result.error);
    });
  });

  describe('loadChromaPending', () => {
    it('loads previously stored pending docs', () => {
      const docs = toChromaDocuments(mockSummaryResult, 'scan-789');
      storeToChroma(docs, 'loadtest_com', { projectRoot: tmpDir });

      const loaded = loadChromaPending(tmpDir, 'loadtest_com');
      assert.ok(loaded);
      assert.equal(loaded.documents.length, 2);
      assert.ok(loaded.collection);
    });

    it('returns null for non-existent domain', () => {
      const loaded = loadChromaPending(tmpDir, 'nonexistent_com');
      assert.equal(loaded, null);
    });
  });

  // Cleanup
  it('cleanup temp dir', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
