// components/search/Step2TrademarkDetails.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormData } from '@/app/search/page';
import Image from 'next/image';

interface Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2TrademarkDetails({ data, updateData, onNext, onBack }: Props) {
  const [logoPreview, setLogoPreview] = useState<string | null>(data.logoUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, SVG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      updateData({ 
        logoFile: file,
        logoUrl: reader.result as string 
      });
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    // Validate required field
    if (!data.markText || data.markText.trim().length < 2) {
      setError('Trademark name must be at least 2 characters');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Trademark Details</h2>
        <p className="text-gray-600">
          Enter the trademark name you want to search
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Trademark Text */}
        <div>
          <Label htmlFor="markText">
            Trademark Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="markText"
            placeholder="e.g., TechFlow, Nike, Apple"
            value={data.markText}
            onChange={(e) => updateData({ markText: e.target.value })}
            className="text-lg"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the exact name as you intend to use it
          </p>
        </div>

        {/* Logo Upload */}
        <div>
          <Label htmlFor="logo">Logo / Image (Optional)</Label>
          <div className="mt-2">
            {logoPreview ? (
              <div className="flex items-start gap-4">
                <div className="relative w-32 h-32 border rounded overflow-hidden bg-gray-50">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Logo uploaded</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoPreview(null);
                      updateData({ logoFile: undefined, logoUrl: undefined });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Label
                  htmlFor="logo"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <span className="text-2xl">📁</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    Click to upload logo
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG, SVG up to 5MB
                  </span>
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">
            Description (Optional)
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your trademark, its design elements, colors, etc."
            value={data.description || ''}
            onChange={(e) => updateData({ description: e.target.value })}
            rows={3}
          />
        </div>

        {/* First Use Date */}
        <div>
          <Label htmlFor="firstUseDate">
            First Use Date (Optional)
          </Label>
          <Input
            id="firstUseDate"
            type="date"
            value={data.firstUseDate || ''}
            onChange={(e) => updateData({ firstUseDate: e.target.value })}
          />
          <p className="text-sm text-gray-500 mt-1">
            When did you first start using this trademark?
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Continue to Classes →
        </Button>
      </div>
    </div>
  );
}