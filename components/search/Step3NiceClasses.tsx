// components/search/Step3NiceClasses.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormData } from '@/app/search/page';
import { NICE_CLASSES,type NiceClass } from '@/lib/constants';

interface Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Smart keyword mappings for common searches
const KEYWORD_MAPPINGS: Record<string, number[]> = {
  // Apparel & Fashion
  'shoes': [25], 'footwear': [25], 'boots': [25], 'sneakers': [25],
  'clothing': [25], 'apparel': [25], 'shirt': [25], 'pants': [25], 'dress': [25],
  'fashion': [25], 'clothes': [25], 'wear': [25],

  // Tech & Software
  'software': [9, 42], 'app': [9, 42], 'application': [9, 42], 'program': [9],
  'computer': [9, 42], 'tech': [9, 42], 'technology': [9, 42],
  'saas': [9, 42], 'platform': [9, 42], 'mobile': [9],

  // Food & Beverage
  'food': [29, 30, 43], 'restaurant': [43], 'cafe': [43], 'coffee': [30, 43],
  'beverage': [32, 33], 'drink': [32, 33], 'beer': [32], 'wine': [33],
  'bakery': [30], 'catering': [43],

  // Business Services
  'marketing': [35], 'advertising': [35], 'business': [35], 'consulting': [35],
  'retail': [35], 'ecommerce': [35], 'store': [35], 'shop': [35],

  // Design & Creative
  'design': [42], 'creative': [42], 'graphic': [42], 'logo': [42],
  'website': [42], 'web': [42], 'development': [42],

  // Health & Beauty
  'cosmetics': [3], 'beauty': [3, 44], 'skincare': [3], 'makeup': [3],
  'healthcare': [44], 'medical': [10, 44], 'pharmaceutical': [5],

  // Entertainment
  'game': [9, 28, 41], 'gaming': [9, 28, 41], 'entertainment': [41],
  'music': [9, 41], 'video': [9, 41], 'streaming': [9, 38, 41],

  // Finance
  'finance': [36], 'financial': [36], 'banking': [36], 'investment': [36],
  'insurance': [36], 'payment': [36],

  // Education
  'education': [41], 'training': [41], 'course': [41], 'learning': [41],
  'school': [41], 'teaching': [41],
};

export default function Step3NiceClasses({ data, updateData, onNext, onBack }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestedClasses, setSuggestedClasses] = useState<number[]>([]);

  // Smart search with keyword matching
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestedClasses([]);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const suggestions = new Set<number>();

    // Check keyword mappings
    for (const [keyword, classes] of Object.entries(KEYWORD_MAPPINGS)) {
      if (keyword.includes(term) || term.includes(keyword)) {
        classes.forEach(c => suggestions.add(c));
      }
    }

    setSuggestedClasses(Array.from(suggestions));
  }, [searchTerm]);

  const filteredClasses = NICE_CLASSES.filter(
    (cls:NiceClass) =>
      cls.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.number.toString().includes(searchTerm) ||
      suggestedClasses.includes(cls.number)
  );

  const toggleClass = (classNumber: number) => {
    const currentClasses = data.niceClasses || [];
    const newClasses = currentClasses.includes(classNumber)
      ? currentClasses.filter((c) => c !== classNumber)
      : [...currentClasses, classNumber];

    updateData({ niceClasses: newClasses });
  };

  const selectSuggested = () => {
    if (suggestedClasses.length === 0) return;

    const currentClasses = data.niceClasses || [];
    const newClasses = [...new Set([...currentClasses, ...suggestedClasses])];
    updateData({ niceClasses: newClasses });
    setSearchTerm('');
    setSuggestedClasses([]);
  };

  const handleNext = () => {
    if (!data.niceClasses || data.niceClasses.length === 0) {
      setError('Please select at least one Nice class');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Nice Classes</h2>
        <p className="text-gray-600">
          Choose the classes that match your goods or services. Try searching by keyword!
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {/* Selected Count */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="font-medium">
          Selected: {data.niceClasses?.length || 0} class(es)
        </p>
        {data.niceClasses && data.niceClasses.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Classes: {data.niceClasses.sort((a, b) => a - b).join(', ')}
          </p>
        )}
      </div>

      {/* Search */}
      <div>
        <Label htmlFor="search">Search Classes by Keyword</Label>
        <Input
          id="search"
          placeholder="e.g., shoes, software, restaurant, marketing, cosmetics"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-base"
        />
        {suggestedClasses.length > 0 && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium text-green-800">
                  💡 Smart Match:
                </span>
                <span className="ml-2 text-green-700">
                  Found {suggestedClasses.length} relevant {suggestedClasses.length === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <Button
                size="sm"
                onClick={selectSuggested}
                className="bg-green-600 hover:bg-green-700"
              >
                Select All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Classes List */}
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {filteredClasses.map((cls:NiceClass) => {
          const isSelected = data.niceClasses?.includes(cls.number) || false;
          const isSuggested = suggestedClasses.includes(cls.number);

          return (
            <div
              key={cls.number}
              className={`flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-gray-50 ${
                isSuggested ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <Checkbox
                id={`class-${cls.number}`}
                checked={isSelected}
                onCheckedChange={() => toggleClass(cls.number)}
              />
              <label
                htmlFor={`class-${cls.number}`}
                className="flex-1 cursor-pointer"
              >
                <div className="font-medium">
                  Class {cls.number}
                  {cls.type && (
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      ({cls.type})
                    </span>
                  )}
                  {isSuggested && (
                    <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                      Suggested
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {cls.description}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No classes found matching "{searchTerm}". Try searching for: shoes, software, restaurant, marketing
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Continue to Review →
        </Button>
      </div>
    </div>
  );
}