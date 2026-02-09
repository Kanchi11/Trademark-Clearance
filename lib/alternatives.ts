// lib/alternatives.ts
// Suggest alternative mark names when risk is high (for display only; not legal advice).

const SUFFIXES = ['app', 'hub', 'io', 'pro', 'co', 'hq', 'lab', 'studio', 'now', 'plus'];
const PREFIXES = ['my', 'get', 'go', 'try', 'use', 'the'];

/**
 * Generate alternative name suggestions when the proposed mark has high conflict risk.
 * Simple variants: add suffix/prefix, slight spelling. User should verify each.
 */
export function suggestAlternatives(markText: string, limit = 5): string[] {
  const base = markText.trim();
  const normalized = base.toLowerCase().replace(/\s+/g, '');
  const suggestions = new Set<string>();

  // Base with suffix (e.g. "TechFlow" -> "TechFlow App", "TechFlow.io")
  for (const suffix of SUFFIXES.slice(0, 4)) {
    const withSuffix = `${base} ${suffix}`.trim();
    if (withSuffix.length <= 30) suggestions.add(withSuffix);
  }

  // Prefix (e.g. "Get TechFlow")
  for (const prefix of PREFIXES.slice(0, 2)) {
    const withPrefix = `${prefix}${base.charAt(0).toUpperCase()}${base.slice(1)}`.trim();
    if (withPrefix.length <= 30) suggestions.add(withPrefix);
  }

  // Numeric variant (e.g. "TechFlow360")
  if (normalized.length <= 12) {
    suggestions.add(`${base}360`);
    suggestions.add(`${base}24`);
  }

  return Array.from(suggestions).slice(0, limit);
}
