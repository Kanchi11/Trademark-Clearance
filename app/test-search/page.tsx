// app/test-search/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestSearchPage() {
  const [markText, setMarkText] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!markText.trim()) {
      setError('Please enter a trademark name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: markText.trim(),
          niceClasses: [9, 42], // Tech classes for testing
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Search failed');
        return;
      }
      
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Trademark Search Test</h1>

      {/* Search Input */}
      <Card className="p-6 mb-8">
        <div className="flex gap-4">
          <Input
            placeholder="Enter trademark name (e.g., NIKE, TECHFLOW)"
            value={markText}
            onChange={(e) => setMarkText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-lg"
          />
          <Button onClick={handleSearch} disabled={loading} size="lg">
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Search Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Searched For</p>
                <p className="text-xl font-bold">{results.query.markText}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Results</p>
                <p className="text-xl font-bold">{results.summary.totalResults}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {results.summary.highRisk}
                </p>
                <p className="text-sm text-gray-600">High Risk</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {results.summary.mediumRisk}
                </p>
                <p className="text-sm text-gray-600">Medium Risk</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {results.summary.lowRisk}
                </p>
                <p className="text-sm text-gray-600">Low Risk</p>
              </div>
            </div>
          </Card>

          {/* Results List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">
              Conflicts Found ({results.results.length})
            </h2>
            
            {results.results.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  🎉 No conflicts found! This trademark appears to be available.
                </p>
              </Card>
            ) : (
              results.results.map((result: any) => (
                <Card key={result.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{result.markText}</h3>
                      <p className="text-sm text-gray-600">
                        {result.ownerName || 'Owner not specified'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Serial: {result.serialNumber} • Status: {result.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{result.similarityScore}%</p>
                      <p className="text-sm text-gray-600">Similarity</p>
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <div className="mb-4">
                    <Badge
                      variant={
                        result.riskLevel === 'high'
                          ? 'destructive'
                          : result.riskLevel === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {result.riskLevel.toUpperCase()} RISK
                    </Badge>
                    {result.sameClass && (
                      <Badge variant="outline" className="ml-2">
                        Same Class
                      </Badge>
                    )}
                  </div>

                  {/* Similarity Breakdown */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded">
                    <div>
                      <p className="text-xs text-gray-600">Exact</p>
                      <p className="text-lg font-semibold">
                        {result.similarityBreakdown.exact}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Visual</p>
                      <p className="text-lg font-semibold">
                        {result.similarityBreakdown.visual}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Phonetic</p>
                      <p className="text-lg font-semibold">
                        {result.similarityBreakdown.phonetic}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Fuzzy</p>
                      <p className="text-lg font-semibold">
                        {result.similarityBreakdown.fuzzy}%
                      </p>
                    </div>
                  </div>

                  {/* Risk Explanation */}
                  <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm">{result.riskExplanation}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}