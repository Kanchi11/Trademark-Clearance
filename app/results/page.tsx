// app/results/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { downloadTrademarkReportPDF } from '@/lib/pdf-generator';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  ArrowLeft,
  Shield,
  Globe,
  Hash,
  Search,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Filter,
  SlidersHorizontal,
  FileText,
  Phone,
  Mail,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? '';
  if (s === 'live' || s === 'active' || s === 'registered') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
      </span>
    );
  }
  if (s === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pending
      </span>
    );
  }
  if (s === 'dead' || s === 'abandoned' || s === 'cancelled' || s === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Dead
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      {status ?? 'Unknown'}
    </span>
  );
}

interface SearchResults {
  success: boolean;
  requestId: string;
  searchedAt?: string;
  sourcesChecked?: string[];
  summary: {
    totalResults: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    overallRisk: 'low' | 'medium' | 'high';
    verifiedCount: number;
  };
  results: Array<{
    id: number;
    serialNumber: string;
    markText: string;
    ownerName: string;
    status: string;
    filingDate: string;
    registrationDate?: string;
    niceClasses: number[];
    similarityScore: number;
    similarityBreakdown: {
      overallScore: number;
      exact: number;
      visual: number;
      phonetic: number;
      fuzzy: number;
    };
    riskLevel: 'low' | 'medium' | 'high';
    riskExplanation: string;
    usptoUrl: string;
    logoUrl?: string; // Add logoUrl for trademark logos
  }>;
  domainResults?: {
    likelyAvailable: Array<{ domain: string; registrarUrl: string }>;
    likelyTaken: Array<{ domain: string; registrarUrl: string }>;
  };
  socialResults?: {
    handles: Array<{
      platform: string;
      username: string;
      profileUrl: string;
    }>;
  };
  commonLaw?: {
    summary: string;
    results: Array<{ title: string; link: string; snippet: string; relevanceScore?: number }>;
    manualLinks?: Array<{ platform: string; query: string; url: string }>;
    riskLevel?: 'low' | 'medium' | 'high';
  };
  alternatives?: Array<{
    text: string;
    riskLevel: 'low' | 'medium' | 'high';
    conflictCount: number;
    reason: string;
    verified: boolean;
  }>;
  logoSimilarity?: {
    checked: boolean;
    conflicts: Array<{
      serialNumber: string;
      markText: string;
      logoUrl: string;
      similarity: number;
    }>;
    summary: string;
  };
  query: {
    markText: string;
    niceClasses: number[];
    logoUrl?: string | null;
    description?: string | null;
  };
  fromCache?: boolean;
}

function LogoWithFallback({ logoUrl, markText }: { logoUrl: string; markText: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-14 h-14 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
        {markText.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="w-14 h-14 flex-shrink-0 rounded border-2 border-gray-200 bg-white p-1 shadow-sm">
      <img
        src={logoUrl}
        alt={`${markText} logo`}
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  // Filtering & Sorting State
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('similarity');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    const resultsData = sessionStorage.getItem('searchResults');

    if (!resultsData) {
      router.push('/search');
      return;
    }

    try {
      const parsed = JSON.parse(resultsData);
      setResults(parsed);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to parse results:', err);
      router.push('/search');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRisk, filterStatus, sortBy]);

  const downloadPDF = () => {
    if (!results) return;

    try {
      // Prepare data for PDF generator
      const pdfData = {
        query: {
          ...results.query,
          logoUrl: results.query.logoUrl || undefined, // Convert null to undefined
        },
        summary: results.summary,
        results: results.results,
        logoSimilarity: results.logoSimilarity,
        commonLaw: {
          summary: results.commonLaw?.summary || 'No common law search performed',
          riskLevel: results.commonLaw?.riskLevel || 'low',
          results: results.commonLaw?.results || [],
        },
        domainResults: {
          likelyAvailable: results.domainResults?.likelyAvailable || [],
          likelyTaken: results.domainResults?.likelyTaken || [],
        },
        socialResults: {
          handles: results.socialResults?.handles || [],
        },
        alternatives: results.alternatives || [],
        searchedAt: results.searchedAt || new Date().toISOString(),
      };

      // Generate and download PDF directly on client side
      downloadTrademarkReportPDF(pdfData);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const getRiskBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getRiskPercentage = () => {
    const total = results.summary.totalResults || 1;
    return {
      high: (results.summary.highRisk / total) * 100,
      medium: (results.summary.mediumRisk / total) * 100,
      low: (results.summary.lowRisk / total) * 100,
    };
  };

  const riskPercentages = getRiskPercentage();

  // Filter and sort results
  const filteredAndSortedResults = (() => {
    if (!results.results) return [];

    let filtered = [...results.results];

    // Apply risk filter
    if (filterRisk !== 'all') {
      filtered = filtered.filter(r => r.riskLevel === filterRisk);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'similarity':
          return b.similarityBreakdown.overallScore - a.similarityBreakdown.overallScore;
        case 'risk':
          const riskOrder = { high: 3, medium: 2, low: 1 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        default:
          return 0;
      }
    });

    return filtered;
  })();

  // Calculate pagination values
  const totalResults = filteredAndSortedResults.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);

  // Ensure currentPage is within valid range
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const startIndex = (validCurrentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const paginatedResults = filteredAndSortedResults.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">ClearMark</span>
          </Link>
          <div className="flex items-center gap-3">
            {results.fromCache && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />Cached
              </span>
            )}
            <Button onClick={downloadPDF} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-3.5 w-3.5 mr-1.5" />Export PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push('/search')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
          </div>
          <p className="text-sm text-gray-500 ml-6">
            {filteredAndSortedResults.length} conflict{filteredAndSortedResults.length !== 1 ? 's' : ''} found for "<strong className="text-gray-700">{results.query.markText}</strong>"
          </p>
        </div>

        {/* Two Column Layout: Sidebar + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT SIDEBAR - Filters & Search Controls */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => router.push('/search')}
                className="w-full justify-start text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                New Search
              </Button>

              {/* Search Info Card */}
              <Card className="p-4 border-gray-200">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">
                  Query
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Trademark</div>
                    <div className="font-bold text-lg">{results.query.markText}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Nice Classes</div>
                    <div className="flex flex-wrap gap-1">
                      {results.query.niceClasses.map(cls => (
                        <Badge key={cls} variant="secondary" className="text-xs">
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Total Results</div>
                    <div className="font-bold">{results.summary.totalResults}</div>
                  </div>
                </div>
              </Card>

              {/* Risk Filter */}
              <Card className="p-4 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Risk
                </h3>
                <div className="space-y-2">
                  {['all', 'high', 'medium', 'low'].map(risk => (
                    <button
                      key={risk}
                      onClick={() => {
                        setFilterRisk(risk);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        filterRisk === risk
                          ? 'bg-blue-600 text-white font-semibold shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {risk === 'all' ? 'All Risks' : `${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk`}
                      {risk !== 'all' && (
                        <span className="ml-2 text-xs opacity-75">
                          ({results.summary[`${risk}Risk` as keyof typeof results.summary]})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Status Filter */}
              <Card className="p-4 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter by Status
                </h3>
                <div className="space-y-2">
                  {['all', 'live', 'dead', 'pending', 'abandoned'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        filterStatus === status
                          ? 'bg-blue-600 text-white font-semibold shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Sort Options */}
              <Card className="p-4 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Sort By
                </h3>
                <div className="space-y-2">
                  {[
                    { value: 'similarity', label: 'Similarity Score' },
                    { value: 'risk', label: 'Risk Level' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        sortBy === option.value
                          ? 'bg-blue-600 text-white font-semibold shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-4 border border-gray-200 bg-blue-50">
                <h3 className="font-bold text-sm uppercase tracking-wide text-gray-700 mb-3">
                  Need Help?
                </h3>
                <div className="space-y-2 text-sm">
                  <a href="tel:+1234567890" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                    <Phone className="h-4 w-4" />
                    Schedule Consultation
                  </a>
                  <a href="mailto:support@example.com" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                    <Mail className="h-4 w-4" />
                    Email Attorney
                  </a>
                  <button onClick={downloadPDF} className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                    <FileText className="h-4 w-4" />
                    Download Report
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* RIGHT MAIN AREA - Results Display */}
          <div className="lg:col-span-3 space-y-6">
            {/* Risk Summary Card - Clear & Simple */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Clearance Analysis Complete
                </h2>
                <p className="text-gray-600">
                  Found <strong>{filteredAndSortedResults.length} potential conflicts</strong> in USPTO database
                </p>
              </div>

              {/* Risk Distribution with Clear Labels */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg border-2 ${
                  results.summary.highRisk > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${
                      results.summary.highRisk > 0 ? 'text-red-900' : 'text-gray-700'
                    }`}>
                      High Risk
                    </span>
                    <span className={`text-3xl font-bold ${
                      results.summary.highRisk > 0 ? 'text-red-900' : 'text-gray-400'
                    }`}>
                      {results.summary.highRisk}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Likely to be rejected</div>
                  {results.summary.highRisk > 0 && (
                    <Progress value={riskPercentages.high} className="h-2 mt-2 bg-red-200" />
                  )}
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  results.summary.mediumRisk > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${
                      results.summary.mediumRisk > 0 ? 'text-yellow-900' : 'text-gray-700'
                    }`}>
                      Medium Risk
                    </span>
                    <span className={`text-3xl font-bold ${
                      results.summary.mediumRisk > 0 ? 'text-yellow-900' : 'text-gray-400'
                    }`}>
                      {results.summary.mediumRisk}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Proceed with caution</div>
                  {results.summary.mediumRisk > 0 && (
                    <Progress value={riskPercentages.medium} className="h-2 mt-2 bg-yellow-200" />
                  )}
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  results.summary.lowRisk > 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${
                      results.summary.lowRisk > 0 ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      Low Risk
                    </span>
                    <span className={`text-3xl font-bold ${
                      results.summary.lowRisk > 0 ? 'text-green-900' : 'text-gray-400'
                    }`}>
                      {results.summary.lowRisk}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Minor concerns only</div>
                  {results.summary.lowRisk > 0 && (
                    <Progress value={riskPercentages.low} className="h-2 mt-2 bg-green-200" />
                  )}
                </div>
              </div>

              {/* Clear Recommendation */}
              <div className={`p-4 rounded-lg border-2 ${
                results.summary.overallRisk === 'high'
                  ? 'bg-red-50 border-red-300'
                  : results.summary.overallRisk === 'medium'
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-start gap-3">
                  {results.summary.overallRisk === 'high' && (
                    <>
                      <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-red-900 text-lg mb-1">
                          ⚠️ Not Recommended to Proceed
                        </h3>
                        <p className="text-sm text-red-800">
                          <strong>{results.summary.highRisk} high-risk conflicts</strong> found.
                          Strong likelihood of USPTO rejection. Consider choosing a different name or consult a trademark attorney.
                        </p>
                      </div>
                    </>
                  )}
                  {results.summary.overallRisk === 'medium' && (
                    <>
                      <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-yellow-900 text-lg mb-1">
                          ⚠️ Proceed with Caution
                        </h3>
                        <p className="text-sm text-yellow-800">
                          <strong>{results.summary.mediumRisk} moderate conflicts</strong> detected.
                          Attorney review recommended before filing. Review conflicts below carefully.
                        </p>
                      </div>
                    </>
                  )}
                  {results.summary.overallRisk === 'low' && (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-green-900 text-lg mb-1">
                          ✓ Looks Promising
                        </h3>
                        <p className="text-sm text-green-800">
                          No significant conflicts detected. However, final clearance should still be reviewed by a trademark attorney before filing.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Logo Display & Similarity - if uploaded */}
            {results.query.logoUrl && (
              <Card className="p-6 border border-gray-200 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <img
                      src={results.query.logoUrl}
                      alt="Uploaded logo"
                      className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg bg-white p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Your Logo</h3>

                    {/* Logo Similarity Results */}
                    {results.logoSimilarity?.checked && (
                      <div className={`p-3 border rounded-lg mb-3 ${
                        results.logoSimilarity.conflicts.length > 0
                          ? 'bg-red-50 border-red-300'
                          : 'bg-green-50 border-green-300'
                      }`}>
                        <p className="text-sm font-semibold mb-1">
                          {results.logoSimilarity.summary}
                        </p>
                        {results.logoSimilarity.conflicts.length > 0 && (
                          <p className="text-xs mt-2">
                            We found visually similar logos using perceptual hashing analysis. Review conflicts below.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> Automated logo comparison uses basic perceptual hashing.
                        A trademark attorney should perform final review for design mark conflicts.
                      </p>
                    </div>

                    <div className="text-xs text-gray-600">
                      <p>• Text search completed for: <strong>"{results.query.markText}"</strong></p>
                      <p>• Visual similarity: {results.logoSimilarity?.checked ? '✓ Checked' : '✗ Skipped'}</p>
                      <p>• Logo included in PDF report for attorney review</p>
                    </div>
                  </div>
                </div>

                {/* CLIP logo matches already appear inline in the USPTO Conflicts list below */}
              </Card>
            )}

            {/* USPTO Conflicts */}
            {filteredAndSortedResults && filteredAndSortedResults.length > 0 && (
              <Card className="p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-bold">
                      USPTO Federal Marks ({totalResults})
                    </h2>
                  </div>
                </div>

                {paginatedResults.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No results on this page. Try page 1.</p>
                    <Button
                      onClick={() => setCurrentPage(1)}
                      className="mt-4"
                      variant="outline"
                    >
                      Go to Page 1
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedResults.map((conflict, idx) => {
                      const uniqueKey = `${conflict.serialNumber}-${validCurrentPage}-${idx}`;
                      return (
                        <Card key={uniqueKey} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all p-6">
                              <div className="flex items-start gap-4">
                                {/* Logo/Mark - Show USPTO logo if available */}
                                {conflict.logoUrl ? (
                                  <LogoWithFallback
                                    logoUrl={conflict.logoUrl}
                                    markText={conflict.markText}
                                  />
                                ) : (
                                  <div className="w-14 h-14 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                    {conflict.markText.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Header Row */}
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{conflict.markText}</h3>
                                      <p className="text-sm text-gray-600">{conflict.ownerName}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="flex gap-2 flex-wrap">
                                        <Badge variant={getRiskBadgeVariant(conflict.riskLevel)} className="text-xs">
                                          {conflict.riskLevel} risk
                                        </Badge>
                                        <StatusBadge status={conflict.status} />
                                        {conflict.registrationCount > 1 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            {conflict.registrationCount} registrations
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="text-3xl font-bold text-gray-900">
                                          {Math.round(conflict.similarityBreakdown.overallScore)}%
                                        </div>
                                        <div className="text-xs text-gray-500">Match</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Risk Explanation */}
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                                    {conflict.riskExplanation}
                                  </p>

                                  {/* Metadata Grid */}
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                                    <div>
                                      <span className="text-gray-500">Serial Number:</span>
                                      <span className="ml-2 text-gray-900 font-medium">{conflict.serialNumber}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Filed:</span>
                                      <span className="ml-2 text-gray-900 font-medium">{conflict.filingDate}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-gray-500">Classes:</span>
                                      <span className="ml-2">
                                        {conflict.niceClasses.map(cls => (
                                          <Badge key={cls} variant="secondary" className="ml-1 text-xs">
                                            {cls}
                                          </Badge>
                                        ))}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Similarity Breakdown */}
                                  <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg mb-4">
                                    {[
                                      { label: 'Exact', value: conflict.similarityBreakdown.exact },
                                      { label: 'Visual', value: conflict.similarityBreakdown.visual },
                                      { label: 'Phonetic', value: conflict.similarityBreakdown.phonetic },
                                      { label: 'Fuzzy', value: conflict.similarityBreakdown.fuzzy },
                                    ].map((metric) => (
                                      <div key={metric.label} className="text-center">
                                        <div className="text-2xl font-bold text-gray-900">{Math.round(metric.value)}%</div>
                                        <div className="text-xs text-gray-500 mt-1">{metric.label}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Action Button */}
                                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="text-xs text-gray-500">
                                      Last updated: {new Date().toLocaleDateString()}
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={conflict.usptoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                                        View USPTO Record
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t mt-6">
                      <div className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(endIndex, totalResults)} of {totalResults} • Page {validCurrentPage} of {totalPages}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={validCurrentPage === 1}
                        >
                          Previous
                        </Button>

                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (validCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (validCurrentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = validCurrentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={validCurrentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="min-w-[40px]"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={validCurrentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

        {/* Domains */}
        {results.domainResults && (
          <Card className="p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-bold">Domain Status</h2>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Preliminary Check
              </span>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> DNS checks are preliminary only. Always verify with registrar before relying on availability status.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {results.domainResults.likelyAvailable && results.domainResults.likelyAvailable.length > 0 && (
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                    No Active DNS ({results.domainResults.likelyAvailable.length})
                  </h3>
                  <div className="space-y-1 mb-3">
                    {results.domainResults.likelyAvailable.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 text-gray-700">
                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                        <span className="font-mono text-sm">{d.domain}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={results.domainResults.likelyAvailable[0]?.registrarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Check Availability on Namecheap →
                  </a>
                </div>
              )}

              {results.domainResults.likelyTaken && results.domainResults.likelyTaken.length > 0 && (
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                    Active DNS Found ({results.domainResults.likelyTaken.length})
                  </h3>
                  <div className="space-y-1 mb-3">
                    {results.domainResults.likelyTaken.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 text-gray-700">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="font-mono text-sm">{d.domain}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={results.domainResults.likelyTaken[0]?.registrarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Check Registration Details →
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Social Handles */}
        {results.socialResults && results.socialResults.handles && results.socialResults.handles.length > 0 && (
          <Card className="p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold">Social Media Handles</h2>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Manual Check Required
              </span>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Click each platform to check actual availability. We cannot determine availability without platform APIs.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.socialResults.handles.map((handle, idx) => (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 transition-colors">
                  <div className="mb-2">
                    <span className="font-semibold text-gray-900 text-sm">{handle.platform}</span>
                  </div>
                  <div className="font-mono text-sm text-gray-700 mb-3">@{handle.username}</div>
                  <a
                    href={handle.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 px-3 bg-gray-100 hover:bg-blue-600 hover:text-white rounded text-xs font-medium transition-colors"
                  >
                    Check on {handle.platform} →
                  </a>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Common Law */}
        {results.commonLaw && (
          <Card className="p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Common Law & Web Usage</h2>
              </div>
              {results.commonLaw.riskLevel && (
                <Badge variant={getRiskBadgeVariant(results.commonLaw.riskLevel)}>
                  {results.commonLaw.riskLevel}
                </Badge>
              )}
            </div>

            {results.commonLaw.summary && (
              <div className="p-4 bg-gray-50 rounded-lg border-l-2 border-blue-500 mb-6">
                <p className="text-sm text-gray-700">{results.commonLaw.summary}</p>
              </div>
            )}

            {results.commonLaw.results && results.commonLaw.results.length > 0 && (
              <div className="space-y-3 mb-4">
                {results.commonLaw.results.map((source, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <a
                      href={source.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2"
                    >
                      {source.title}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="text-sm text-gray-600 mt-2">{source.snippet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Verification Links */}
            {results.commonLaw.manualLinks && results.commonLaw.manualLinks.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Manual Verification Required
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click each link below to manually search for common law trademark usage:
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  {results.commonLaw.manualLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-lg transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900 group-hover:text-blue-600">{link.platform}</div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div className="text-xs text-gray-600">Search: "{link.query}"</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Alternatives - Verified USPTO Checked */}
        {results.alternatives && results.alternatives.length > 0 && (
          <Card className="p-6 shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-bold">Verified Alternative Suggestions</h2>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                ✓ USPTO Verified
              </Badge>
            </div>

            <p className="text-sm text-gray-700 mb-4 bg-blue-50 p-3 rounded border border-blue-200">
              <strong>Smart Suggestions:</strong> These alternatives were tested against the USPTO database.
              Each shows actual risk level and conflict count.
            </p>

            <div className="space-y-3">
              {results.alternatives.map((alt, idx) => {
                const riskBg = alt.riskLevel === 'low' ? 'bg-green-50' : alt.riskLevel === 'medium' ? 'bg-yellow-50' : 'bg-red-50';
                const riskBorder = alt.riskLevel === 'low' ? 'border-green-200' : alt.riskLevel === 'medium' ? 'border-yellow-200' : 'border-red-200';
                const riskText = alt.riskLevel === 'low' ? 'text-green-900' : alt.riskLevel === 'medium' ? 'text-yellow-900' : 'text-red-900';

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${riskBorder} ${riskBg} hover:shadow-md transition-all cursor-pointer relative`}
                    onClick={() => {
                      // Trigger new search with this alternative
                      const searchData = {
                        markText: alt.text,
                        niceClasses: results.query.niceClasses,
                      };
                      sessionStorage.setItem('pendingSearch', JSON.stringify(searchData));
                      router.push('/search');
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`text-lg font-bold ${riskText}`}>{alt.text}</h3>
                          {alt.riskLevel && (
                            <Badge variant="outline" className={`text-xs ${riskText}`}>
                              {alt.riskLevel.toUpperCase()} RISK
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alt.reason}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>✓ Verified against USPTO</span>
                          <span>•</span>
                          <span>{alt.conflictCount} conflicts found</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Click to search</div>
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.alternatives.filter(a => a.riskLevel === 'low').length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> No low-risk alternatives found. Consider modifying your mark more significantly or choosing a completely different name.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
      {/* End of right column */}
    </div>
    {/* End of two-column grid */}

    {/* Legal Disclaimer - Full Width */}
    <div className="mt-8 p-5 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg text-yellow-900">
      <p className="font-bold mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Legal Disclaimer
      </p>
      <p className="text-sm">
        This search is for informational purposes only and does not constitute legal advice.
        Always consult with a qualified trademark attorney before filing your application.
      </p>
    </div>
  </div>
</div>
  );
}
