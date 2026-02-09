'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('searchResults');
    if (stored) {
      setResults(JSON.parse(stored));
    }
  }, []);

  const handleExportPdf = async () => {
    if (!results) return;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: results.query,
          summary: results.summary,
          results: results.results,
          searchedAt: results.searchedAt,
          sourcesChecked: results.sourcesChecked,
          domainResults: results.domainResults,
          socialResults: results.socialResults,
          commonLaw: results.commonLaw,
          alternatives: results.alternatives,
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trademark-clearance-${(results.query?.markText || 'report').replace(/[^a-z0-9]/gi, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const conflicts = results.results || [];
  const summary = results.summary || {};
  const domainResults = results.domainResults || [];
  const socialResults = results.socialResults || [];
  const commonLaw = results.commonLaw || {};
  const alternatives = results.alternatives || [];
  const verifiedCount = summary.verifiedCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Button onClick={() => router.push('/search')} variant="ghost">
            ← Back to Search
          </Button>
          <Button onClick={handleExportPdf} variant="default">
            Export PDF report
          </Button>
        </div>

        <h1 className="text-4xl font-bold mb-2">Trademark Clearance Report</h1>
        <p className="text-gray-600 mb-6">
          Results for: <strong>{results.query?.markText}</strong>
        </p>

        {/* Disclaimer */}
        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertDescription>
            <strong>Disclaimer:</strong> {results.disclaimer || 'This is not legal advice. Consult a trademark attorney for final clearance before filing.'}
          </AlertDescription>
        </Alert>

        {/* Risk summary */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Risk assessment</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-5xl font-bold">{summary.totalResults ?? 0}</p>
              <p className="text-gray-600">Potential conflicts</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-red-600">{summary.highRisk ?? 0}</p>
              <p className="text-gray-600">High risk</p>
            </div>
            <div>
              <p className="text-2xl font-bold capitalize">{summary.overallRisk ?? '—'}</p>
              <p className="text-gray-600">Overall risk</p>
            </div>
          </div>
          {verifiedCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Badge className="bg-green-100 text-green-800">
                ✓ {verifiedCount} USPTO verified
              </Badge>
            </div>
          )}
        </Card>

        {/* Federal conflicts */}
        <h2 className="text-2xl font-bold mb-4">Federal (USPTO) conflicts</h2>
        {conflicts.length > 0 ? (
          <div className="space-y-4 mb-10">
            {conflicts.map((r: any, i: number) => (
              <Card key={i} className="p-6">
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold mb-1">{r.markText}</h3>
                    <p className="text-gray-600 text-sm">{r.ownerName}</p>
                    <p className="text-sm text-gray-500">Serial: {r.serialNumber}</p>
                    {r.verified && (
                      <Badge className="mt-2 bg-green-50 text-green-700 border border-green-200">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-bold">{r.similarityScore}%</p>
                    <Badge variant={r.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                      {String(r.riskLevel || '').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {r.riskExplanation && (
                  <p className="mt-3 text-sm text-gray-600">{r.riskExplanation}</p>
                )}
                {r.usptoUrl && (
                  <a
                    href={r.usptoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    View on USPTO TSDR →
                  </a>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center mb-10">
            <p className="text-6xl mb-4">✓</p>
            <h3 className="text-2xl font-bold">No federal conflicts in this search</h3>
            <p className="text-gray-600 mt-2">Common law and domain checks below still apply.</p>
          </Card>
        )}

        {/* Domain availability */}
        {domainResults.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Domain availability</h2>
            <Card className="p-6 mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {domainResults.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span className="font-mono text-sm">{d.domain}</span>
                    <Badge variant={d.available === true ? 'default' : d.available === false ? 'destructive' : 'secondary'}>
                      {d.available === true ? 'Available' : d.available === false ? 'Taken' : 'Check'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Social handles */}
        {socialResults.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Social handles</h2>
            <Card className="p-6 mb-8">
              <p className="text-sm text-gray-600 mb-3">Click to check availability on each platform.</p>
              <div className="flex flex-wrap gap-3">
                {socialResults.map((s: any, i: number) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <span className="font-medium">{s.platform}</span>
                    <span className="text-gray-600">{s.handle}</span>
                  </a>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Common law / manual links */}
        {(commonLaw.summary || (commonLaw.manualLinks && commonLaw.manualLinks.length > 0)) && (
          <>
            <h2 className="text-2xl font-bold mb-4">Common law &amp; manual checks</h2>
            <Card className="p-6 mb-8">
              {commonLaw.summary && (
                <p className="text-gray-600 mb-4">{commonLaw.summary}</p>
              )}
              {commonLaw.manualLinks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Search manually:</p>
                  <ul className="space-y-2">
                    {commonLaw.manualLinks.map((link: any, i: number) => (
                      <li key={i}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {link.platform}: {link.query}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Alternative suggestions */}
        {alternatives.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Suggested alternatives</h2>
            <Card className="p-6 mb-8">
              <p className="text-sm text-gray-600 mb-3">
                Consider verifying these alternatives; run a new search for each.
              </p>
              <ul className="list-disc list-inside space-y-1">
                {alternatives.map((alt: string, i: number) => (
                  <li key={i} className="font-medium">{alt}</li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <div className="pt-4 pb-8 text-center text-sm text-gray-500">
          Report generated {results.searchedAt ? new Date(results.searchedAt).toLocaleString() : ''}.
          Sources: {Array.isArray(results.sourcesChecked) ? results.sourcesChecked.join(', ') : '—'}
        </div>
      </div>
    </div>
  );
}
