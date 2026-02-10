// app/results/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  ArrowLeft,
  Shield,
  Globe,
  Hash,
  Search
} from 'lucide-react';

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
  }>;
  domainResults?: {
    available: string[];
    unavailable: string[];
  };
  socialResults?: {
    checked: Array<{
      platform: string;
      username: string;
      profileUrl: string;
      available: boolean;
    }>;
  };
  commonLaw?: {
    summary: string;
    results: Array<{ title: string; link: string; snippet: string }>;
    manualLinks?: Array<{ platform: string; query: string; url: string }>;
  };
  alternatives?: string[];
  query: {
    markText: string;
    niceClasses: number[];
  };
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    // Get results from sessionStorage
    const resultsData = sessionStorage.getItem('searchResults');

    if (!resultsData) {
      // No results found, redirect back to search
      console.log('No results in sessionStorage - redirecting to search');
      router.push('/search');
      return;
    }

    try {
      const parsed = JSON.parse(resultsData);
      console.log('Loaded results:', {
        hasResults: !!parsed,
        hasDomains: !!parsed.domainResults,
        availableDomains: parsed.domainResults?.available?.length || 0,
        unavailableDomains: parsed.domainResults?.unavailable?.length || 0,
        hasSocials: !!parsed.socialResults,
        hasCommonLaw: !!parsed.commonLaw,
      });
      setResults(parsed);
      setCurrentPage(1); // Reset pagination for new results
    } catch (err) {
      console.error('Failed to parse results:', err);
      router.push('/search');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const downloadPDF = async () => {
    if (!results) return;

    try {
      // Transform data to match API expectations
      const pdfData = {
        query: results.query,
        summary: results.summary,
        results: results.results,
        searchedAt: results.searchedAt,
        sourcesChecked: results.sourcesChecked,
        // Transform domain results back to array format for PDF
        domainResults: [
          ...(results.domainResults?.available || []).map(domain => ({ domain, available: true })),
          ...(results.domainResults?.unavailable || []).map(domain => ({ domain, available: false })),
        ],
        // Transform social results format
        socialResults: results.socialResults?.checked?.map(s => ({
          platform: s.platform,
          handle: s.username,
          url: s.profileUrl,
          available: s.available,
        })) || [],
        commonLaw: results.commonLaw,
        alternatives: results.alternatives,
      };

      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trademark-clearance-${results.query.markText}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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

  if (!results) {
    return null;
  }

  const getRiskColor = (level: string) => {
    const lower = level.toLowerCase();
    switch (lower) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    const lower = level.toLowerCase();
    switch (lower) {
      case 'low': return <CheckCircle className="h-8 w-8" />;
      case 'high': return <AlertTriangle className="h-8 w-8" />;
      default: return <Shield className="h-8 w-8" />;
    }
  };

  const getRiskMessage = () => {
    if (results.summary.overallRisk === 'high') {
      if (results.summary.highRisk > 0) {
        return results.summary.highRisk === 1
          ? 'BLOCKING CONFLICT DETECTED - Do not proceed without attorney review. One or more identical/highly similar marks found in the same class(es).'
          : `MULTIPLE BLOCKING CONFLICTS - ${results.summary.highRisk} identical/highly similar marks detected. Strong legal review required before proceeding.`;
      } else if (results.summary.mediumRisk > 2) {
        return `ELEVATED RISK FROM MULTIPLE CONFLICTS - ${results.summary.mediumRisk} moderately similar marks detected in same class(es). While individually moderate risk, multiple similar marks increase likelihood of confusion. Strong legal review required.`;
      } else {
        return 'HIGH RISK DETECTED - Strong legal review required before proceeding.';
      }
    }
    if (results.summary.overallRisk === 'medium') {
      return `CAUTION REQUIRED - ${results.summary.mediumRisk} moderately similar mark${results.summary.mediumRisk > 1 ? 's' : ''} detected. Attorney consultation recommended to assess likelihood of confusion.`;
    }
    return 'CLEARANCE FAVORABLE - No blocking conflicts found in preliminary search. However, comprehensive attorney review still recommended before filing.';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            New Search
          </Button>
          <Button onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Risk Summary Card */}
        <Card className={`p-8 mb-6 border-2 ${getRiskColor(results.summary.overallRisk)}`}>
          <div className="flex items-start gap-6">
            <div className={getRiskColor(results.summary.overallRisk)}>
              {getRiskIcon(results.summary.overallRisk)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {results.summary.overallRisk.toUpperCase()} RISK
              </h1>
              <p className="text-lg mb-4">{getRiskMessage()}</p>

              {/* Industry-standard conflict categorization */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide opacity-75 mb-1">Searched Mark</span>
                  <span className="font-mono font-bold text-lg">{results.query.markText}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide opacity-75 mb-1">Blocking Conflicts</span>
                  <span className="font-mono font-bold text-lg text-red-600">{results.summary.highRisk}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide opacity-75 mb-1">Caution Required</span>
                  <span className="font-mono font-bold text-lg text-yellow-600">{results.summary.mediumRisk}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide opacity-75 mb-1">Low Risk / Monitor</span>
                  <span className="font-mono font-bold text-lg text-green-600">{results.summary.lowRisk}</span>
                </div>
              </div>

              {/* Additional metadata */}
              <div className="text-sm opacity-75">
                Searched 1.4M+ USPTO marks across Classes {results.query.niceClasses.join(', ')}
              </div>
            </div>
          </div>
        </Card>

        {/* USPTO Conflicts */}
        {results.results && results.results.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold">
                USPTO Federal Marks ({results.results.length})
              </h2>
            </div>

            <div className="space-y-4">
              {(() => {
                // Pagination logic
                const totalResults = results.results.length;
                const totalPages = Math.ceil(totalResults / resultsPerPage);
                const startIndex = (currentPage - 1) * resultsPerPage;
                const endIndex = startIndex + resultsPerPage;
                const paginatedResults = results.results.slice(startIndex, endIndex);

                return (
                  <>
                    {paginatedResults.map((conflict, idx) => (
                      <Card key={idx} className="p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{conflict.markText}</h3>
                            <div className="flex gap-3 text-sm text-gray-600">
                              <span>Serial: {conflict.serialNumber}</span>
                              <Badge variant={conflict.status === 'live' ? 'default' : 'secondary'}>
                                {conflict.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600 mb-1">
                              {Math.round(conflict.similarityBreakdown.overallScore)}%
                            </div>
                            <div className="text-xs text-gray-500">Similarity</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                          <div>
                            <span className="text-gray-600">Exact:</span>{' '}
                            <span className="font-semibold">{Math.round(conflict.similarityBreakdown.exact)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Visual:</span>{' '}
                            <span className="font-semibold">{Math.round(conflict.similarityBreakdown.visual)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Phonetic:</span>{' '}
                            <span className="font-semibold">{Math.round(conflict.similarityBreakdown.phonetic)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Fuzzy:</span>{' '}
                            <span className="font-semibold">{Math.round(conflict.similarityBreakdown.fuzzy)}%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="text-sm">
                            <div className="text-gray-600">Owner: <span className="font-medium text-gray-900">{conflict.ownerName}</span></div>
                            <div className="text-gray-600">
                              Classes: {conflict.niceClasses.join(', ')}
                            </div>
                            <div className="text-gray-600">Filed: {conflict.filingDate}</div>
                          </div>
                          <a
                            href={conflict.usptoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            View USPTO Record
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </Card>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-6 border-t">
                        <div className="text-sm text-gray-600">
                          Showing {startIndex + 1}-{Math.min(endIndex, totalResults)} of {totalResults} conflicts
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                              // Show first page, last page, current page, and pages around current
                              const showPage = page === 1 ||
                                               page === totalPages ||
                                               Math.abs(page - currentPage) <= 1;

                              const showEllipsis = (page === 2 && currentPage > 3) ||
                                                   (page === totalPages - 1 && currentPage < totalPages - 2);

                              if (showEllipsis) {
                                return <span key={page} className="px-2 text-gray-400">...</span>;
                              }

                              if (!showPage) return null;

                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="min-w-[40px]"
                                >
                                  {page}
                                </Button>
                              );
                            })}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        )}

        {/* Domains */}
        {results.domainResults && (results.domainResults.available?.length > 0 || results.domainResults.unavailable?.length > 0) ? (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold">Domain Availability</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {results.domainResults.available && results.domainResults.available.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">✅ Available</h3>
                  <div className="space-y-1">
                    {results.domainResults.available.map((domain, idx) => (
                      <div key={idx} className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-mono">{domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.domainResults.unavailable && results.domainResults.unavailable.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2">❌ Unavailable</h3>
                  <div className="space-y-1">
                    {results.domainResults.unavailable.map((domain, idx) => (
                      <div key={idx} className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-mono">{domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-6 w-6 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-600">Domain Availability</h2>
            </div>
            <p className="text-sm text-gray-600">
              Domain checks are loading... If this message persists, try searching again.
            </p>
          </Card>
        )}

        {/* Social Handles */}
        {results.socialResults && results.socialResults.checked && results.socialResults.checked.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Hash className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Social Media Handles</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {results.socialResults.checked.filter(h => h.available).length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">Available</h3>
                  <div className="space-y-2">
                    {results.socialResults.checked.filter(h => h.available).map((handle, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{handle.platform}</span>
                        </div>
                        <a
                          href={handle.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          @{handle.username}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.socialResults.checked.filter(h => !h.available).length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2">Unavailable</h3>
                  <div className="space-y-2">
                    {results.socialResults.checked.filter(h => !h.available).map((handle, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-medium">{handle.platform}</span>
                        </div>
                        <a
                          href={handle.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          @{handle.username}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Common Law Usage */}
        {results.commonLaw && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Search className="h-6 w-6 text-orange-600" />
              <h2 className="text-2xl font-bold">Common Law & Web Usage</h2>
            </div>

            {/* API Results (if available) */}
            {results.commonLaw.results && results.commonLaw.results.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Web Search Results ({results.commonLaw.results.length} found)
                </h3>
                <div className="space-y-3">
                  {results.commonLaw.results.map((source, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      <a
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-sm text-gray-600 mt-1">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {results.commonLaw.summary && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                {results.commonLaw.summary}
              </div>
            )}

            {/* Manual Search Links */}
            {results.commonLaw.manualLinks && results.commonLaw.manualLinks.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Manual Search Links
                  {(!results.commonLaw.results || results.commonLaw.results.length === 0) && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      (Google API not configured - manual checks recommended)
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.commonLaw.manualLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{link.platform}</div>
                        <div className="text-xs text-gray-600 mt-1">{link.query}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Alternative Names */}
        {results.alternatives && results.alternatives.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Suggested Alternatives</h2>
            <div className="flex flex-wrap gap-2">
              {results.alternatives.map((alt, idx) => (
                <Badge key={idx} variant="outline" className="text-base py-2 px-4">
                  {alt}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Bottom Actions */}
        <div className="flex gap-4 justify-center mb-8">
          <Button size="lg" onClick={() => router.push('/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Start New Search
          </Button>
          <Button size="lg" variant="outline" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF Report
          </Button>
        </div>

        {/* Legal Disclaimer */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 text-center">
          ⚠️ <strong>Important:</strong> This search is for informational purposes only
          and does not constitute legal advice. Always consult with a trademark attorney
          before filing your application.
        </div>
      </div>
    </div>
  );
}
