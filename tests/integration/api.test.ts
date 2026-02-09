/**
 * Integration tests for API endpoints
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Trademark Clearance API - Integration', () => {
  const API_BASE = 'http://localhost:3000/api';

  // Note: These tests assume the API server is running
  // Run with: npm run dev (in another terminal)

  describe('POST /api/search', () => {
    it('should search for trademark similarities', async () => {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'APPLE',
          niceClasses: [9, 41],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
    }, { timeout: 10000 });

    it('should handle missing required fields', async () => {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should include similarity scores in results', async () => {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'NIKE',
          niceClasses: [25],
        }),
      });

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        expect(data.results[0]).toHaveProperty('similarityScore');
        expect(data.results[0]).toHaveProperty('riskLevel');
        expect(['low', 'medium', 'high']).toContain(data.results[0].riskLevel);
      }
    }, { timeout: 10000 });
  });

  describe('POST /api/clearance', () => {
    it('should perform full clearance check', async () => {
      const response = await fetch(`${API_BASE}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'TestMark123',
          niceClasses: [35, 42],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('domainResults');
      expect(data).toHaveProperty('socialResults');
      expect(data).toHaveProperty('alternatives');
    }, { timeout: 60000 });

    it('should check domain availability', async () => {
      const response = await fetch(`${API_BASE}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'UniqueTestBrand9999',
          niceClasses: [35],
        }),
      });

      const data = await response.json();
      if (data.domainResults && data.domainResults.length > 0) {
        const domain = data.domainResults[0];
        expect(domain).toHaveProperty('domain');
        expect(domain).toHaveProperty('available');
        expect(['AVAILABLE', 'TAKEN', 'UNKNOWN']).toContain(domain.available);
      }
    }, { timeout: 60000 });

    it('should provide social media links', async () => {
      const response = await fetch(`${API_BASE}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'TestBrand',
          niceClasses: [35],
        }),
      });

      const data = await response.json();
      expect(data.socialResults).toBeDefined();
      expect(Array.isArray(data.socialResults)).toBe(true);
    }, { timeout: 60000 });

    it('should suggest alternatives for high-risk marks', async () => {
      const response = await fetch(`${API_BASE}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'NIKE', // Known trademark
          niceClasses: [25],
        }),
      });

      const data = await response.json();
      if (data.summary?.overallRiskLevel === 'high') {
        expect(data.alternatives).toBeDefined();
        expect(Array.isArray(data.alternatives)).toBe(true);
      }
    }, { timeout: 60000 });
  });

  describe('POST /api/domain-check', () => {
    it('should check domain availability', async () => {
      const response = await fetch(`${API_BASE}/domain-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'uniquebrand9999',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('domain');
        expect(data[0]).toHaveProperty('available');
      }
    }, { timeout: 10000 });

    it('should check multiple TLDs', async () => {
      const response = await fetch(`${API_BASE}/domain-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'testbrand',
        }),
      });

      const data = await response.json();
      const tlds = data.map((d: any) => d.domain.split('.')[1]);
      expect(tlds).toContain('com');
      expect(tlds.length).toBeGreaterThan(1);
    }, { timeout: 10000 });
  });

  describe('POST /api/report', () => {
    it('should generate PDF report', async () => {
      // First do a search
      const searchResponse = await fetch(`${API_BASE}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'ReportTest',
          niceClasses: [35],
        }),
      });

      const searchData = await searchResponse.json();

      // Then generate report
      const reportResponse = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData),
      });

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.headers.get('content-type')).toContain('application/pdf');
    }, { timeout: 60000 });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing API keys gracefully', async () => {
      // If API keys are not set, optional features should be skipped
      const response = await fetch(`${API_BASE}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'TestMark',
          niceClasses: [35],
        }),
      });

      // Should still work, optional features just return empty
      expect([200, 206]).toContain(response.status);
    }, { timeout: 60000 });

    it('should handle large requests gracefully', async () => {
      const longText = 'A'.repeat(1000);
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: longText,
          niceClasses: [35],
        }),
      });

      expect([200, 400, 413]).toContain(response.status);
    }, { timeout: 10000 });
  });

  describe('Performance', () => {
    it('should search within reasonable time', async () => {
      const start = Date.now();
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: 'QUICKTEST',
          niceClasses: [35],
        }),
      });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // Should complete in under 30s
    });
  });
});

/**
 * Note: Run integration tests with:
 * 1. npm run dev (in one terminal)
 * 2. npm run test:integration (in another terminal)
 */
