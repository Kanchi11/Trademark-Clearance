// app/search/page.tsx
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Search, Shield, X, ExternalLink, ArrowRight, AlertTriangle, CheckCircle, AlertCircle, Globe, Hash } from 'lucide-react';
import Image from 'next/image';

export interface SearchData {
  markText: string;
  logoFile?: File;
  logoUrl?: string;
  niceClasses: number[];
  description?: string;
  goodsServices?: string;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? '';
  if (s === 'live' || s === 'active' || s === 'registered') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Active</span>;
  }
  if (s === 'pending') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Pending</span>;
  }
  if (s === 'dead' || s === 'abandoned' || s === 'cancelled' || s === 'expired') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />Dead</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">{status}</span>;
}

function RiskBadge({ level }: { level: string }) {
  if (level === 'high') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">High Risk</span>;
  if (level === 'medium') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Medium</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">Low Risk</span>;
}

const NICE_CLASS_LABELS: Record<number, string> = {
  1:'Chemicals',2:'Paints',3:'Cosmetics',4:'Lubricants',5:'Pharma',6:'Metal goods',7:'Machinery',
  8:'Hand tools',9:'Electronics/Software',10:'Medical devices',11:'Lighting/HVAC',12:'Vehicles',
  13:'Firearms',14:'Jewelry',15:'Musical instruments',16:'Paper/Print',17:'Rubber',18:'Leather',
  19:'Building materials',20:'Furniture',21:'Housewares',22:'Ropes/Fibers',23:'Yarns',24:'Textiles',
  25:'Clothing',26:'Lace/Embroidery',27:'Floor coverings',28:'Games/Toys',29:'Meat/Dairy',
  30:'Staple food',31:'Agriculture',32:'Beer/Water',33:'Spirits',34:'Tobacco',35:'Business services',
  36:'Finance/Insurance',37:'Construction',38:'Telecommunications',39:'Transport',40:'Material treatment',
  41:'Education/Entertainment',42:'Tech/SaaS',43:'Food & Drinks services',44:'Medical services',45:'Legal services',
};

export default function SearchPage() {
  const [searchData, setSearchData] = useState<SearchData>({
    markText: '',
    logoUrl: '',
    niceClasses: [],
    description: '',
    goodsServices: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file (PNG, JPG, SVG)'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File size must be less than 5MB'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      setSearchData(prev => ({ ...prev, logoFile: file, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async () => {
    if (!searchData.markText.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await fetch('/api/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markText: searchData.markText,
          logoUrl: searchData.logoUrl,
          niceClasses: searchData.niceClasses,
          description: searchData.description,
          goodsServices: searchData.goodsServices || undefined,
        }),
      });
      const result = await response.json();
      if (!result.success) { setError(result.error || 'Search failed'); return; }
      setResults(result);
    } catch {
      setError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (cls: number) => {
    setSearchData(prev => ({
      ...prev,
      niceClasses: prev.niceClasses.includes(cls)
        ? prev.niceClasses.filter(c => c !== cls)
        : [...prev.niceClasses, cls],
    }));
  };

  const overallRisk = results?.summary?.overallRisk;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">ClearMark</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/search" className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">Search</Link>
            <Link href="/results" className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-md">Results</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Trademark Search</h1>
          <p className="text-sm text-gray-500">Search USPTO records, domains, social handles, and more.</p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          {/* Main search row */}
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Enter trademark name…"
              className="h-11 text-base flex-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              value={searchData.markText}
              onChange={e => setSearchData(prev => ({ ...prev, markText: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              autoFocus
            />
            <Button
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              onClick={handleSearch}
              disabled={loading || !searchData.markText.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Searching…</span>
              ) : (
                <span className="flex items-center gap-2"><Search className="h-4 w-4" />Search</span>
              )}
            </Button>
          </div>

          {/* Optional fields */}
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Goods/services description (optional)"
              value={searchData.goodsServices || ''}
              onChange={e => setSearchData(prev => ({ ...prev, goodsServices: e.target.value }))}
              className="border-gray-200 text-sm h-9"
            />

            {/* Nice Classes picker */}
            <div>
              <button
                type="button"
                onClick={() => setShowClassPicker(p => !p)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {showClassPicker ? '▲' : '▼'} Nice Classes
                {searchData.niceClasses.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs font-semibold">{searchData.niceClasses.length}</span>
                )}
              </button>
              {showClassPicker && (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto">
                  {Array.from({ length: 45 }, (_, i) => i + 1).map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`text-xs px-2 py-1 rounded-md border transition-all ${
                        searchData.niceClasses.includes(cls)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                      title={NICE_CLASS_LABELS[cls]}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              )}
              {searchData.niceClasses.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {searchData.niceClasses.map(cls => (
                    <span key={cls} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200">
                      Class {cls} · {NICE_CLASS_LABELS[cls]}
                      <button onClick={() => toggleClass(cls)} className="hover:text-blue-900"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Logo upload */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-all"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                {logoPreview ? 'Change logo' : 'Upload logo (optional)'}
              </button>
              {logoPreview && (
                <div className="flex items-center gap-2">
                  <Image src={logoPreview} alt="Logo preview" width={28} height={28} className="rounded shadow-sm border border-gray-200 object-contain" />
                  <button onClick={() => { setLogoPreview(null); setSearchData(prev => ({ ...prev, logoFile: undefined, logoUrl: '' })); }} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-4">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p className="font-medium text-gray-800 mb-1">Searching USPTO database…</p>
            <p className="text-sm text-gray-500">Running AI semantic search, checking domains & social handles</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-5">
            {/* Risk summary banner */}
            <div className={`rounded-2xl border-2 p-5 ${
              overallRisk === 'high' ? 'bg-red-50 border-red-200' :
              overallRisk === 'medium' ? 'bg-amber-50 border-amber-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                {overallRisk === 'high' && <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
                {overallRisk === 'medium' && <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
                {overallRisk === 'low' && <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 mb-0.5">
                    {overallRisk === 'high' && '⚠️ High risk — consider a different name'}
                    {overallRisk === 'medium' && '⚠️ Proceed with caution'}
                    {overallRisk === 'low' && '✓ Looks clear — low conflicts found'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {results.summary.highRisk} high · {results.summary.mediumRisk} medium · {results.summary.lowRisk} low risk conflicts
                    {' '}· {results.summary.totalResults} total
                  </div>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => {
                    sessionStorage.setItem('searchResults', JSON.stringify(results));
                    window.location.href = '/results';
                  }}
                >
                  Full report <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Conflicts list */}
            {results.results?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Potential Conflicts</h2>
                  <span className="text-xs text-gray-400">{results.results.length} results</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {results.results.map((conflict: any, i: number) => (
                    <li key={i} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                      {/* Logo or avatar */}
                      {conflict.logoUrl ? (
                        <div className="w-9 h-9 shrink-0 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                          <img
                            src={conflict.logoUrl}
                            alt={conflict.markText}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              el.parentElement!.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600', 'rounded-full');
                              el.parentElement!.innerHTML = `<span class="text-white font-bold text-sm">${conflict.markText.charAt(0).toUpperCase()}</span>`;
                            }}
                          />
                        </div>
                      ) : (
                        <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          conflict.riskLevel === 'high' ? 'bg-red-500' :
                          conflict.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`}>
                          {conflict.markText.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Mark info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm truncate">{conflict.markText}</span>
                          {conflict.registrationCount > 1 && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{conflict.registrationCount} registrations</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <RiskBadge level={conflict.riskLevel} />
                          <StatusBadge status={conflict.status} />
                          <span className="text-xs text-gray-400">{conflict.similarityScore}% match</span>
                        </div>
                      </div>
                      {/* USPTO link */}
                      {conflict.usptoUrl && (
                        <a href={conflict.usptoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-500 hover:text-blue-700">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Domain availability */}
            {results.domainResults && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-violet-600" />
                  <h2 className="font-semibold text-gray-900">Domain Availability</h2>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
                  {results.domainResults.likelyAvailable?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-2 uppercase tracking-wide">Likely Available</div>
                      <ul className="space-y-1">
                        {results.domainResults.likelyAvailable.map((d: any, i: number) => (
                          <li key={i}>
                            <a href={d.registrarUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600">
                              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                              <span className="font-mono">{d.domain}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.domainResults.likelyTaken?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-700 mb-2 uppercase tracking-wide">Likely Taken</div>
                      <ul className="space-y-1">
                        {results.domainResults.likelyTaken.map((d: any, i: number) => (
                          <li key={i}>
                            <a href={d.registrarUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-red-600">
                              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              <span className="font-mono">{d.domain}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Handles */}
            {results.socialResults?.handles?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Social Handles</h2>
                  <span className="text-xs text-gray-400 ml-auto">manual check required</span>
                </div>
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  {results.socialResults.handles.map((h: any, i: number) => (
                    <a key={i} href={h.profileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-all">
                      @{h.username} <span className="text-xs text-gray-400">· {h.platform}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Common law */}
            {results.commonLaw && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-900">Common Law</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-600 mb-3">{results.commonLaw.summary}</p>
                  {results.commonLaw.manualLinks?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {results.commonLaw.manualLinks.slice(0, 8).map((l: any, i: number) => (
                        <a key={`${l.platform}-${i}`} href={l.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2">
                          {l.platform}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 text-center px-2">
              ⚠️ Preliminary results only — not legal advice. Consult a trademark attorney before filing.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

