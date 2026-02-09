// components/search/Step4Review.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormData } from '@/app/search/page';
import { NICE_CLASSES } from '@/lib/constants';
import Image from 'next/image';

interface Props {
  data: FormData;
  onBack: () => void;
  onEdit: (step: number) => void;
}

export default function Step4Review({ data, onBack, onEdit }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClasses = NICE_CLASSES.filter((cls) =>
    data.niceClasses.includes(cls.number)
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: data.markText,
          niceClasses: data.niceClasses,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Search failed');
        return;
      }

      // Store results in sessionStorage and redirect
      sessionStorage.setItem('searchResults', JSON.stringify(result));
      router.push('/results');
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review Your Information</h2>
        <p className="text-gray-600">
          Please review your information before submitting the search
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {/* Business Information */}
      {(data.businessName || data.businessType || data.industry) && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Business Information</h3>
            <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {data.businessName && (
              <div>
                <span className="text-gray-600">Business Name:</span>{' '}
                <span className="font-medium">{data.businessName}</span>
              </div>
            )}
            {data.businessType && (
              <div>
                <span className="text-gray-600">Type:</span>{' '}
                <span className="font-medium">{data.businessType}</span>
              </div>
            )}
            {data.industry && (
              <div>
                <span className="text-gray-600">Industry:</span>{' '}
                <span className="font-medium">{data.industry}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Trademark Details */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Trademark Details</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
            Edit
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-600">Trademark Name:</span>
            <div className="text-2xl font-bold mt-1">{data.markText}</div>
          </div>

          {data.logoUrl && (
            <div>
              <span className="text-sm text-gray-600">Logo:</span>
              <div className="mt-2 relative w-32 h-32 border rounded overflow-hidden bg-gray-50">
                <Image
                  src={data.logoUrl}
                  alt="Trademark logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {data.description && (
            <div>
              <span className="text-sm text-gray-600">Description:</span>
              <p className="mt-1 text-sm">{data.description}</p>
            </div>
          )}

          {data.firstUseDate && (
            <div>
              <span className="text-sm text-gray-600">First Use Date:</span>
              <p className="mt-1 text-sm">{data.firstUseDate}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Nice Classes */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">
            Nice Classes ({data.niceClasses.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
            Edit
          </Button>
        </div>
        <div className="space-y-3">
          {selectedClasses.map((cls) => (
            <div
              key={cls.number}
              className="p-3 bg-gray-50 rounded flex items-start gap-3"
            >
              <Badge variant="secondary">Class {cls.number}</Badge>
              <div className="flex-1">
                <p className="text-sm">{cls.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Submit */}
      <div className="p-6 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-2">Ready to Search?</h3>
        <p className="text-sm text-gray-600 mb-4">
          We&apos;ll search federal (USPTO) marks, check domain availability, 
          social handles, and common law (web) usage, then provide a risk assessment and optional alternative names.
        </p>
        <p className="text-xs text-gray-500">
          This search typically takes 5-10 seconds.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={handleSubmit} size="lg" disabled={loading}>
          {loading ? 'Searching...' : 'Start Search 🔍'}
        </Button>
      </div>

      {/* Legal Disclaimer */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        By clicking "Start Search", you acknowledge that this search is for informational 
        purposes only and does not constitute legal advice. Results may not be comprehensive. 
        Always consult with a trademark attorney before filing.
      </div>
    </div>
  );
}