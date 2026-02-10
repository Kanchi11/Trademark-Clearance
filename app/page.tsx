'use client';

import Link from 'next/link';
import { Shield, Search, FileText, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 pt-20 pb-32 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
                <Zap className="mr-2 h-4 w-4" />
                Save $500-$5,000 in Legal Fees
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                Trademark Clearance
                <span className="block text-blue-600 mt-2">Made Simple</span>
              </h1>
              <p className="mt-6 text-xl leading-8 text-gray-600">
                Fast, accurate trademark searches across USPTO, state registries, domains, and social media.
                Get instant risk assessment and alternatives before filing.
              </p>
              <div className="mt-10 flex gap-4">
                <Link href="/search">
                  <Button size="lg" className="h-14 px-8 text-base font-semibold">
                    Start Free Search
                    <Shield className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-base font-semibold">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                ✓ No credit card required  •  ✓ Search in seconds  •  ✓ Export attorney-ready reports
              </p>
            </div>

            <div className="relative lg:ml-auto">
              <div className="relative rounded-2xl border-8 border-gray-900 bg-gray-900 shadow-2xl">
                <div className="bg-white p-8 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <div className="font-semibold text-gray-900">No Conflicts Found</div>
                          <div className="text-sm text-gray-600">97 sources checked</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">✓</div>
                    </div>

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">Risk Assessment</div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[15%]"></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Low Risk - 15%</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        USPTO Database Clear
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Domains Available
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Social Handles Free
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16 px-6 sm:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">23K+</div>
              <div className="mt-2 text-gray-600">USPTO Trademarks</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">8</div>
              <div className="mt-2 text-gray-600">Data Sources</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">&lt;60s</div>
              <div className="mt-2 text-gray-600">Search Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-24 px-6 sm:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Everything You Need</h2>
            <p className="mt-4 text-xl text-gray-600">
              Comprehensive trademark clearance in one powerful tool
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Source Search</h3>
              <p className="text-gray-600">
                Search USPTO federal marks, state registries, domains, social media handles, and common law sources simultaneously.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600 text-white mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Risk Assessment</h3>
              <p className="text-gray-600">
                Intelligent scoring with similarity analysis, phonetic matching, and visual comparison to identify potential conflicts.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600 text-white mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">PDF Reports</h3>
              <p className="text-gray-600">
                Generate attorney-ready reports with evidence links, similarity scores, and recommendations for your filing.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600 text-white mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Alternative Suggestions</h3>
              <p className="text-gray-600">
                Get AI-powered alternative names when conflicts are detected, with phonetic, synonym, and variation strategies.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Logo Similarity</h3>
              <p className="text-gray-600">
                Upload your logo for visual similarity matching using perceptual hashing and color histogram analysis.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Verification</h3>
              <p className="text-gray-600">
                Live checks for domain availability, social media handles, and USPTO status to ensure accuracy.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-24 px-6 sm:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-xl text-gray-600">
              Get your trademark clearance in 3 simple steps
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-3">
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Enter Your Mark</h3>
                <p className="text-gray-600">
                  Provide your proposed trademark name, upload your logo, and select your Nice class categories.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-white text-2xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Instant Search</h3>
                <p className="text-gray-600">
                  Our system searches 8 data sources in parallel - USPTO, states, domains, social media, and web.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white text-2xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Get Results</h3>
                <p className="text-gray-600">
                  Review conflict analysis, risk scores, alternatives, and export a PDF report for your attorney.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20 px-6 sm:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Clear Your Trademark?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of founders, designers, and entrepreneurs who cleared their marks without lawyers.
          </p>
          <Link href="/search">
            <Button size="lg" variant="secondary" className="h-14 px-12 text-lg font-semibold">
              Start Your Free Search Now
            </Button>
          </Link>
          <p className="mt-6 text-sm text-blue-100">
            No credit card • No signup required • Results in 60 seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 px-6 sm:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm text-gray-400">
              ⚠️ <strong>Legal Disclaimer:</strong> This tool is for informational purposes only and does not constitute legal advice.
              Always consult a registered trademark attorney before filing your application.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              © 2026 Trademark Clearance Tool. USPTO data sourced from official public bulk datasets.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
