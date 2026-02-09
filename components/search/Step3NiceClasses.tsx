// components/search/Step3NiceClasses.tsx
'use client';

import { useState } from 'react';
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

export default function Step3NiceClasses({ data, updateData, onNext, onBack }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredClasses = NICE_CLASSES.filter(
    (cls:NiceClass) =>
      cls.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.number.toString().includes(searchTerm)
  );

  const toggleClass = (classNumber: number) => {
    const currentClasses = data.niceClasses || [];
    const newClasses = currentClasses.includes(classNumber)
      ? currentClasses.filter((c) => c !== classNumber)
      : [...currentClasses, classNumber];
    
    updateData({ niceClasses: newClasses });
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
          Choose the classes that match your goods or services
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
        <Label htmlFor="search">Search Classes</Label>
        <Input
          id="search"
          placeholder="e.g., software, clothing, restaurant"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Classes List */}
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {filteredClasses.map((cls:NiceClass) => (
          <div
            key={cls.number}
            className="flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-gray-50"
          >
            <Checkbox
              id={`class-${cls.number}`}
              checked={data.niceClasses?.includes(cls.number) || false}
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
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {cls.description}
              </div>
            </label>
          </div>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No classes found matching "{searchTerm}"
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