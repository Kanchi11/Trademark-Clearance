// app/search/page.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Step1BusinessInfo from '@/components/search/Step1BusinessInfo';
import Step2TrademarkDetails from '@/components/search/Step2TrademarkDetails';
import Step3NiceClasses from '@/components/search/Step3NiceClasses';
import Step4Review from '@/components/search/Step4Review';

export interface FormData {
  // Step 1: Business Info
  businessName?: string;
  businessType?: string;
  industry?: string;
  
  // Step 2: Trademark Details
  markText: string;
  logoFile?: File;
  logoUrl?: string;
  description?: string;
  firstUseDate?: string;
  
  // Step 3: Nice Classes
  niceClasses: number[];
  goodsServices?: string;
}

export default function SearchPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    markText: '',
    niceClasses: [],
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Trademark Clearance Search</h1>
          <p className="text-gray-600">
            Complete the form below to search for potential trademark conflicts
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 mb-6">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-600">
                {currentStep === 1 && 'Business Information'}
                {currentStep === 2 && 'Trademark Details'}
                {currentStep === 3 && 'Nice Class Selection'}
                {currentStep === 4 && 'Review & Submit'}
              </span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                onClick={() => goToStep(step)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  step === currentStep
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : step < currentStep
                    ? 'text-green-600 cursor-pointer hover:text-green-700'
                    : 'text-gray-400'
                }`}
                disabled={step > currentStep}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      step === currentStep
                        ? 'bg-blue-600 text-white'
                        : step < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  <span className="hidden sm:block text-xs">
                    {step === 1 && 'Business'}
                    {step === 2 && 'Trademark'}
                    {step === 3 && 'Classes'}
                    {step === 4 && 'Review'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Form Steps */}
        <Card className="p-8">
          {currentStep === 1 && (
            <Step1BusinessInfo
              data={formData}
              updateData={updateFormData}
              onNext={nextStep}
            />
          )}

          {currentStep === 2 && (
            <Step2TrademarkDetails
              data={formData}
              updateData={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 3 && (
            <Step3NiceClasses
              data={formData}
              updateData={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 4 && (
            <Step4Review
              data={formData}
              onBack={prevStep}
              onEdit={goToStep}
            />
          )}
        </Card>

        {/* Legal Disclaimer */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ <strong>Important:</strong> This search is for informational purposes only 
          and does not constitute legal advice. Always consult with a trademark attorney 
          before filing.
        </div>
      </div>
    </div>
  );
}