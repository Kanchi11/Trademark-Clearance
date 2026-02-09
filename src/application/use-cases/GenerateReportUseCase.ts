/**
 * Use Case: Generate Report
 * Generates a PDF report from search results
 */

import { injectable } from 'inversify';
import { SearchResult } from '../../core/domain/SearchResult';
import { logger } from '../../infrastructure/monitoring/logger';

@injectable()
export class GenerateReportUseCase {
  async execute(searchResult: SearchResult): Promise<Buffer> {
    logger.info({
      markText: searchResult.query.markText,
      conflictsCount: searchResult.conflicts.length,
    }, 'Executing generate report use case');

    try {
      const pdfBuffer = await this.generatePDF(searchResult);

      logger.info({ size: pdfBuffer.length }, 'Report generated successfully');

      return pdfBuffer;

    } catch (error) {
      logger.error({ err: error }, 'Report generation failed');
      throw error;
    }
  }

  private async generatePDF(result: SearchResult): Promise<Buffer> {
    // TODO: Implement PDF generation
    // For now, return a placeholder
    const html = this.generateHTML(result);
    return Buffer.from(html, 'utf-8');
  }

  private generateHTML(result: SearchResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Trademark Search Report - ${result.query.markText}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #1e40af; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; }
    .conflict { border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; }
    .high-risk { background: #fee2e2; }
    .medium-risk { background: #fef3c7; }
    .low-risk { background: #d1fae5; }
  </style>
</head>
<body>
  <h1>Trademark Clearance Report</h1>
  <div class="summary">
    <h2>Search Query: ${result.query.markText}</h2>
    <p>Nice Classes: ${result.query.niceClasses.join(', ')}</p>
    <p>Overall Risk: ${result.summary.overallRisk.toUpperCase()}</p>
    <p>Total Conflicts: ${result.summary.totalResults}</p>
  </div>
  
  <h2>Conflicts Found (${result.conflicts.length})</h2>
  ${result.conflicts.map(c => `
    <div class="conflict ${c.riskLevel}-risk">
      <h3>${c.trademark.markText}</h3>
      <p>Owner: ${c.trademark.ownerName}</p>
      <p>Serial: ${c.trademark.serialNumber}</p>
      <p>Similarity: ${c.similarityScore.toFixed(0)}%</p>
      <p>Risk: ${c.riskLevel.toUpperCase()}</p>
      <p>${c.riskExplanation}</p>
    </div>
  `).join('')}
  
  <p style="margin-top: 40px; font-size: 12px; color: #6b7280;">
    Generated: ${result.metadata.searchedAt}<br>
    This is not legal advice. Consult a trademark attorney.
  </p>
</body>
</html>
    `;
  }
}