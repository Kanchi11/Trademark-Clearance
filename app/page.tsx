'use client';

import Link from 'next/link';
import { Shield, ArrowRight, Database, Globe, CheckCircle, Zap, Brain, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-white h-4 w-4" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">ClearMark</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/search">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">How it works</Button>
            </Link>
            <Link href="/search">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Start Search</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-16 max-w-7xl">
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full border border-blue-100">
            <Zap className="h-3.5 w-3.5" />
            Powered by AI + 527K USPTO records
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Trademark Clearance<br className="hidden md:block" />{' '}
            <span className="text-blue-600">in seconds</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Search USPTO trademarks, domains, and social handles. Get instant risk analysis before you file.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link href="/search">
              <Button size="lg" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white text-base w-full sm:w-auto">
                Start free search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-xs text-gray-400">No signup required · Results in under 10 seconds</p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="container mx-auto px-6 py-6 max-w-7xl">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">527K+</div>
              <div className="text-xs text-gray-500 mt-0.5">USPTO Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">8</div>
              <div className="text-xs text-gray-500 mt-0.5">Data Sources</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">&lt;10s</div>
              <div className="text-xs text-gray-500 mt-0.5">Search Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Check */}
      <section className="container mx-auto px-6 py-20 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything in one search</h2>
          <p className="text-gray-500">We run all checks simultaneously so you don't have to.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Database, label: 'USPTO Database', desc: 'Federal trademark registrations and applications', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Globe, label: 'Domain Names', desc: 'Availability across .com, .net, .io and more', color: 'text-violet-600', bg: 'bg-violet-50' },
            { icon: CheckCircle, label: 'Social Media', desc: 'Handle availability on major platforms', color: 'text-green-600', bg: 'bg-green-50' },
            { icon: Shield, label: 'Common Law', desc: 'Web search for unregistered prior use', color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ icon: Icon, label, desc, color, bg }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-6 hover:border-gray-200 hover:shadow-sm transition-all">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{label}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Features */}
      <section className="bg-gray-50/60 border-y border-gray-100">
        <div className="container mx-auto px-6 py-20 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">AI-powered analysis</h2>
            <p className="text-gray-500">Not just keyword matching — we use ML to find real conflicts.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Brain, label: 'Semantic Search', desc: 'RAG pipeline finds conceptually similar marks even with different spelling', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: ImageIcon, label: 'Logo Similarity', desc: 'CLIP neural network detects visually similar logos via image embeddings', color: 'text-violet-600', bg: 'bg-violet-50' },
              { icon: Zap, label: 'Phonetic Matching', desc: 'Soundex + Metaphone algorithms catch marks that sound the same', color: 'text-green-600', bg: 'bg-green-50' },
            ].map(({ icon: Icon, label, desc, color, bg }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-6">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple 3-step process</h2>
        </div>
        <div className="space-y-6">
          {[
            { n: '1', title: 'Enter your trademark', desc: 'Type the name, upload an optional logo, and pick your Nice classes.' },
            { n: '2', title: 'We search everything', desc: 'USPTO DB, semantic AI, CLIP logo matching, domains, and social handles — all in parallel.' },
            { n: '3', title: 'Review your risk report', desc: 'Get a clear conflict list with risk levels, status, and direct USPTO links.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-5 items-start">
              <div className="flex-shrink-0 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {n}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 pb-24 max-w-7xl">
        <div className="bg-blue-600 rounded-2xl p-10 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to clear your trademark?</h2>
          <p className="text-blue-100 mb-8 max-w-lg mx-auto text-sm">
            Verify availability across federal registrations, domains, and social media before you file.
          </p>
          <Link href="/search">
            <Button size="lg" className="h-12 px-10 bg-white text-blue-600 hover:bg-blue-50 font-semibold">
              Start free search
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="container mx-auto px-6 py-8 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-700 text-sm">ClearMark</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Preliminary clearance tool — not legal advice. Consult a trademark attorney before filing. Data from USPTO public records.
          </p>
          <p className="text-xs text-gray-400">© 2026</p>
        </div>
      </footer>
    </div>
  );
}
