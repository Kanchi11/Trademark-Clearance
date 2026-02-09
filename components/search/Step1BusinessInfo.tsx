// components/search/Step1BusinessInfo.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormData } from '@/app/search/page';

interface Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  onNext: () => void;
}

export default function Step1BusinessInfo({ data, updateData, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Business Information</h2>
        <p className="text-gray-600">
          Tell us about your business (optional - helps with context)
        </p>
      </div>

      <div className="space-y-4">
        {/* Business Name */}
        <div>
          <Label htmlFor="businessName">Business Name (Optional)</Label>
          <Input
            id="businessName"
            placeholder="Enter your business name"
            value={data.businessName || ''}
            onChange={(e) => updateData({ businessName: e.target.value })}
          />
        </div>

        {/* Business Type */}
        <div>
          <Label htmlFor="businessType">Business Type (Optional)</Label>
          <Select
            value={data.businessType || ''}
            onValueChange={(value) => updateData({ businessType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="corporation">Corporation</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="nonprofit">Non-Profit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Industry */}
        <div>
          <Label htmlFor="industry">Industry (Optional)</Label>
          <Select
            value={data.industry || ''}
            onValueChange={(value) => updateData({ industry: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technology">Technology / Software</SelectItem>
              <SelectItem value="ecommerce">E-commerce / Retail</SelectItem>
              <SelectItem value="services">Professional Services</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="food">Food & Beverage</SelectItem>
              <SelectItem value="fashion">Fashion / Apparel</SelectItem>
              <SelectItem value="entertainment">Entertainment / Media</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button onClick={onNext} size="lg">
          Continue to Trademark Details →
        </Button>
      </div>
    </div>
  );
}