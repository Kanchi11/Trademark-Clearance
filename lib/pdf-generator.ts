/**
 * PDF Report Generator for Trademark Clearance Results
 * Generates professional PDF reports suitable for sharing with attorneys
 */

import jsPDF from 'jspdf';

interface TrademarkReport {
  query: {
    markText: string;
    niceClasses: number[];
    logoUrl?: string;
  };
  summary: {
    totalResults: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    overallRisk: 'low' | 'medium' | 'high';
  };
  results: Array<{
    serialNumber: string;
    markText: string;
    ownerName?: string;
    status: string;
    filingDate?: string;
    niceClasses?: number[];
    similarityScore: number;
    riskLevel: string;
    usptoUrl?: string;
  }>;
  logoSimilarity?: {
    checked: boolean;
    conflicts: Array<{
      serialNumber: string;
      markText: string;
      similarity: number;
      logoUrl: string;
    }>;
    summary: string;
  };
  commonLaw: {
    summary: string;
    riskLevel: string;
    results: Array<{
      title: string;
      link: string;
      snippet: string;
    }>;
  };
  domainResults: {
    likelyAvailable: Array<{ domain: string }>;
    likelyTaken: Array<{ domain: string }>;
  };
  socialResults: {
    handles: Array<{
      platform: string;
      username: string;
    }>;
  };
  alternatives: Array<{
    text: string;
    riskLevel: string;
    conflictCount: number;
    reason: string;
  }>;
  searchedAt: string;
}

export function generateTrademarkReportPDF(data: TrademarkReport): jsPDF {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  // Helper function to add new page if needed
  const checkPageBreak = (neededSpace: number = 20) => {
    if (yPos + neededSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Helper to add wrapped text
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak();
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.5;
    });
  };

  // ========== COVER PAGE ==========
  doc.setFillColor(41, 98, 255); // Blue header
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TRADEMARK CLEARANCE REPORT', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprehensive Search Results', pageWidth / 2, 45, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 80;

  // Trademark Information
  addText('MARK INFORMATION', 16, true);
  yPos += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Trademark:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.query.markText, margin + 35, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Nice Classes:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.query.niceClasses.join(', '), margin + 35, yPos);
  yPos += 10;

  if (data.query.logoUrl) {
    doc.setFont('helvetica', 'bold');
    doc.text('Logo:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('Included', margin + 35, yPos);
    yPos += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Search Date:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.searchedAt).toLocaleString(), margin + 35, yPos);
  yPos += 20;

  // ========== EXECUTIVE SUMMARY ==========
  checkPageBreak(40);
  addText('EXECUTIVE SUMMARY', 16, true);
  yPos += 10;

  // Risk Assessment Box
  const riskColor: [number, number, number] = data.summary.overallRisk === 'high' ? [220, 38, 38] :
                    data.summary.overallRisk === 'medium' ? [245, 158, 11] :
                    [34, 197, 94];

  doc.setFillColor(...riskColor);
  doc.roundedRect(margin, yPos, maxWidth, 25, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const riskText = `OVERALL RISK: ${data.summary.overallRisk.toUpperCase()}`;
  doc.text(riskText, pageWidth / 2, yPos + 15, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPos += 35;

  // Risk Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Conflicts Found: ${data.summary.totalResults}`, margin, yPos);
  yPos += 7;
  doc.text(`High Risk: ${data.summary.highRisk} | Medium Risk: ${data.summary.mediumRisk} | Low Risk: ${data.summary.lowRisk}`, margin, yPos);
  yPos += 15;

  // ========== USPTO CONFLICTS ==========
  checkPageBreak(40);
  addText('USPTO TRADEMARK CONFLICTS', 16, true);
  yPos += 10;

  if (data.results.length === 0) {
    addText('✓ No conflicting trademarks found in USPTO database.', 11);
    yPos += 10;
  } else {
    addText(`Found ${data.results.length} potential conflicts:`, 11);
    yPos += 10;

    // Show top 10 conflicts
    data.results.slice(0, 10).forEach((result, index) => {
      checkPageBreak(35);

      // Conflict box
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(margin, yPos, maxWidth, 30, 2, 2);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${result.markText}`, margin + 3, yPos + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Serial: ${result.serialNumber}`, margin + 3, yPos + 13);
      if (result.ownerName) {
        doc.text(`Owner: ${result.ownerName.substring(0, 50)}`, margin + 3, yPos + 18);
      }
      doc.text(`Status: ${result.status} | Similarity: ${result.similarityScore}% | Risk: ${result.riskLevel.toUpperCase()}`, margin + 3, yPos + 23);
      doc.text(`Classes: ${result.niceClasses?.join(', ') || 'N/A'}`, margin + 3, yPos + 28);

      yPos += 35;
    });

    if (data.results.length > 10) {
      yPos += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`... and ${data.results.length - 10} more conflicts (see online results for complete list)`, margin, yPos);
      yPos += 10;
    }
  }

  yPos += 10;

  // ========== LOGO SIMILARITY ==========
  if (data.logoSimilarity?.checked) {
    checkPageBreak(40);
    addText('LOGO SIMILARITY ANALYSIS', 16, true);
    yPos += 10;

    addText(data.logoSimilarity.summary, 11);
    yPos += 10;

    if (data.logoSimilarity.conflicts.length > 0) {
      addText(`Found ${data.logoSimilarity.conflicts.length} visually similar logos:`, 11);
      yPos += 10;

      data.logoSimilarity.conflicts.slice(0, 5).forEach((logo, index) => {
        checkPageBreak(15);
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${logo.markText} (${logo.serialNumber}) - Similarity: ${logo.similarity}%`, margin + 5, yPos);
        yPos += 7;
      });
    }

    yPos += 10;
  }

  // ========== COMMON LAW SEARCH ==========
  checkPageBreak(40);
  addText('COMMON LAW SEARCH', 16, true);
  yPos += 10;

  addText(data.commonLaw.summary, 10);
  yPos += 10;

  if (data.commonLaw.results.length > 0) {
    addText('Top web findings:', 11, true);
    yPos += 5;

    data.commonLaw.results.slice(0, 5).forEach((result) => {
      checkPageBreak(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(result.title.substring(0, 80), margin + 5, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const snippetLines = doc.splitTextToSize(result.snippet.substring(0, 150) + '...', maxWidth - 10);
      snippetLines.slice(0, 2).forEach((line: string) => {
        doc.text(line, margin + 5, yPos);
        yPos += 4;
      });
      doc.setTextColor(100, 100, 255);
      doc.text(result.link, margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
    });
  }

  yPos += 10;

  // ========== DOMAIN & SOCIAL AVAILABILITY ==========
  checkPageBreak(40);
  addText('DOMAIN & SOCIAL HANDLE AVAILABILITY', 16, true);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Domains - Likely Available:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.domainResults.likelyAvailable.length > 0) {
    data.domainResults.likelyAvailable.slice(0, 5).forEach((d) => {
      doc.text(`• ${d.domain}`, margin + 5, yPos);
      yPos += 5;
    });
  } else {
    doc.text('None available', margin + 5, yPos);
    yPos += 5;
  }

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Social Handles to Check:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  data.socialResults.handles.slice(0, 5).forEach((s) => {
    doc.text(`• ${s.platform}: @${s.username}`, margin + 5, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ========== ALTERNATIVE SUGGESTIONS ==========
  if (data.alternatives.length > 0) {
    checkPageBreak(40);
    addText('SUGGESTED ALTERNATIVES', 16, true);
    yPos += 10;

    addText('Based on your search, here are verified alternative names with lower conflict risk:', 10);
    yPos += 10;

    data.alternatives.forEach((alt, index) => {
      checkPageBreak(20);

      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, yPos, maxWidth, 18, 2, 2, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${alt.text}`, margin + 3, yPos + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Risk: ${alt.riskLevel.toUpperCase()} | Conflicts: ${alt.conflictCount} | ${alt.reason}`, margin + 3, yPos + 14);

      yPos += 23;
    });
  }

  // ========== DISCLAIMER ==========
  doc.addPage();
  yPos = 20;

  doc.setFillColor(255, 243, 205);
  doc.roundedRect(margin, yPos, maxWidth, 60, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('⚠️  IMPORTANT LEGAL DISCLAIMER', pageWidth / 2, yPos + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 20;

  const disclaimerText = 'This is not legal advice; consult a trademark attorney for final clearance. This report is provided for informational purposes only. The information is based on automated searches of public databases and may not be complete or up-to-date. A comprehensive trademark search should be conducted by a licensed trademark attorney before filing any application.';

  const disclaimerLines = doc.splitTextToSize(disclaimerText, maxWidth - 10);
  disclaimerLines.forEach((line: string) => {
    doc.text(line, margin + 5, yPos);
    yPos += 5;
  });

  yPos += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended Next Steps:', margin, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const steps = [
    '1. Review all conflicts carefully, especially high and medium risk matches',
    '2. Conduct manual verification using the common law search links provided online',
    '3. Consult with a trademark attorney for professional clearance opinion',
    '4. Consider hiring a professional search firm for comprehensive clearance',
    '5. If proceeding, monitor for any opposition during the USPTO application process'
  ];

  steps.forEach((step) => {
    doc.text(step, margin, yPos);
    yPos += 7;
  });

  // Footer on last page
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Report generated by Trademark Clearance Tool', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc;
}

/**
 * Generate and download PDF report from search results
 */
export function downloadTrademarkReportPDF(data: TrademarkReport, filename?: string) {
  const doc = generateTrademarkReportPDF(data);
  const name = filename || `trademark-clearance-${data.query.markText.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(name);
}
