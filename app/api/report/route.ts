/**
 * Generate exportable PDF report for trademark clearance (suitable for sharing with an attorney).
 * Includes disclaimer: "This is not legal advice; consult a trademark attorney for final clearance."
 */
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DISCLAIMER =
  'This report is for informational purposes only and does not constitute legal advice. ' +
  'Consult a qualified trademark attorney for final clearance before filing.';

interface ConflictRow {
  markText: string;
  ownerName?: string;
  serialNumber: string;
  status: string;
  similarityScore: number;
  riskLevel: string;
  riskExplanation?: string;
  usptoUrl?: string;
}

interface ReportBody {
  query: { markText: string; niceClasses?: number[] };
  summary?: {
    totalResults: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    overallRisk: string;
    verifiedCount?: number;
  };
  results?: ConflictRow[];
  searchedAt?: string;
  sourcesChecked?: string[];
  domainResults?: Array<{ domain: string; available: boolean | null }>;
  socialResults?: Array<{ platform: string; handle: string; url: string; available: boolean | null }>;
  commonLaw?: { summary: string; manualLinks?: Array<{ platform: string; query: string; url: string }> };
  alternatives?: string[];
}

export async function POST(request: Request) {
  try {
    const body: ReportBody = await request.json();

    const markText = body.query?.markText || 'Trademark';
    const niceClasses = body.query?.niceClasses || [];
    const summary = body.summary || {
      totalResults: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      overallRisk: 'low',
    };
    const results = body.results || [];
    const searchedAt = body.searchedAt || new Date().toISOString();
    const sourcesChecked = body.sourcesChecked || [];
    const domainResults = body.domainResults || [];
    const socialResults = body.socialResults || [];
    const commonLaw = body.commonLaw;
    const alternatives = body.alternatives || [];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 40;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Trademark Clearance Report', margin, y);
    y += 24;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proposed mark: ${markText}`, margin, y);
    y += 16;
    doc.text(`Nice class(es): ${niceClasses.join(', ') || '—'}`, margin, y);
    y += 16;
    doc.text(`Report generated: ${new Date(searchedAt).toLocaleString()}`, margin, y);
    y += 16;
    doc.text(`Sources checked: ${sourcesChecked.join(', ') || '—'}`, margin, y);
    y += 24;

    // Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Risk summary', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `Total potential conflicts: ${summary.totalResults}  |  High risk: ${summary.highRisk}  |  Medium: ${summary.mediumRisk}  |  Low: ${summary.lowRisk}  |  Overall: ${String(summary.overallRisk).toUpperCase()}`,
      margin,
      y
    );
    y += 20;

    // Conflicts table
    if (results.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Potential conflicts (federal marks)', margin, y);
      y += 12;

      autoTable(doc, {
        startY: y,
        head: [['Mark', 'Owner', 'Serial', 'Status', 'Similarity', 'Risk']],
        body: results.slice(0, 30).map((r) => [
          String(r.markText).slice(0, 25),
          String(r.ownerName || '').slice(0, 20),
          String(r.serialNumber).slice(0, 12),
          String(r.status),
          `${r.similarityScore}%`,
          String(r.riskLevel).toUpperCase(),
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    }

    // Domain availability
    if (domainResults.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Domain availability', margin, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const d of domainResults.slice(0, 8)) {
        const avail = d.available === true ? 'Available' : d.available === false ? 'Taken' : 'Check manually';
        doc.text(`${d.domain}: ${avail}`, margin, y);
        y += 14;
      }
      y += 8;
    }

    // Social / common law
    if (commonLaw?.summary || (commonLaw?.manualLinks && commonLaw.manualLinks.length > 0)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Common law / manual checks', margin, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (commonLaw.summary) {
        doc.text(commonLaw.summary, margin, y, { maxWidth: pageWidth - 2 * margin });
        y += doc.getTextDimensions(commonLaw.summary, { maxWidth: pageWidth - 2 * margin }).h + 8;
      }
      if (commonLaw.manualLinks?.length) {
        for (const link of commonLaw.manualLinks.slice(0, 5)) {
          doc.text(`${link.platform}: ${link.url}`, margin, y, { maxWidth: pageWidth - 2 * margin });
          y += 14;
        }
      }
      y += 8;
    }

    // Alternatives
    if (alternatives.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Suggested alternative names (verify availability)', margin, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const alt of alternatives) {
        doc.text(`• ${alt}`, margin, y);
        y += 14;
      }
      y += 8;
    }

    // Disclaimer (every page if possible, at least at end)
    y = Math.max(y, doc.internal.pageSize.getHeight() - 80);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 44);
    doc.setFillColor(255, 252, 220);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 44, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Disclaimer', margin + 6, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(DISCLAIMER, margin + 6, y + 22, { maxWidth: pageWidth - 2 * margin - 12 });
    doc.text('Generated by Trademark Clearance Tool. Not legal advice.', margin + 6, y + 38);

    const pdfBytes = doc.output('arraybuffer');

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="trademark-clearance-${markText.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
