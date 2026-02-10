/**
 * Alternative Trademark Suggestion Engine
 * Generates similar marks when proposed mark conflicts
 */

export interface AlternativeMark {
  text: string;
  strategy: 'prefix' | 'suffix' | 'rhyme' | 'synonym' | 'abbreviation' | 'variation';
  reason: string;
  confidence: number;
}

/**
 * Generate prefix alternatives (e.g., "App" -> "ProApp", "MyApp")
 */
function generatePrefixAlternatives(mark: string): AlternativeMark[] {
  const prefixes = ['Pro', 'Ultra', 'Super', 'Meta', 'Neo', 'Quantum', 'Nexus', 'Ai', 'Smart', 'My', 'Get'];
  return prefixes.map(prefix => ({
    text: prefix + mark,
    strategy: 'prefix' as const,
    reason: `Adds "${prefix}" to distinguish from conflict`,
    confidence: 0.7,
  }));
}

/**
 * Generate suffix alternatives (e.g., "App" -> "AppIO", "AppHub")
 */
function generateSuffixAlternatives(mark: string): AlternativeMark[] {
  const suffixes = ['io', 'ai', 'hub', 'lab', 'co', 'app', 'kit', 'os', 'zen', 'pro', '360', 'plus'];
  return suffixes.map(suffix => ({
    text: mark + suffix,
    strategy: 'suffix' as const,
    reason: `Adds ".${suffix}" suffix for distinction`,
    confidence: 0.7,
  }));
}

/**
 * Generate phonetic variations (using Soundex)
 */
function generatePhoneticVariations(mark: string): AlternativeMark[] {
  const variations: AlternativeMark[] = [];

  // Common phonetic substitutions
  const replacements: { [key: string]: string[] } = {
    'c': ['k', 's'],
    's': ['z', 'ss'],
    'f': ['ph', 'v'],
    'k': ['c', 'cc'],
    'z': ['s', 'x'],
    'x': ['z', 'ks'],
  };

  for (const [from, tos] of Object.entries(replacements)) {
    for (const to of tos) {
      if (mark.toLowerCase().includes(from)) {
        const variant = mark.toLowerCase().replace(from, to);
        if (variant !== mark.toLowerCase()) {
          variations.push({
            text: variant.charAt(0).toUpperCase() + variant.slice(1),
            strategy: 'variation' as const,
            reason: `Phonetic variation: "${from}" → "${to}"`,
            confidence: 0.6,
          });
        }
      }
    }
  }

  return variations.slice(0, 5);
}

/**
 * Generate abbreviations
 */
function generateAbbreviations(mark: string): AlternativeMark[] {
  const variations: AlternativeMark[] = [];

  // First letters
  const firstLetters = mark
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  if (firstLetters.length > 1 && firstLetters !== mark) {
    variations.push({
      text: firstLetters,
      strategy: 'abbreviation' as const,
      reason: 'Acronym from initials',
      confidence: 0.65,
    });
  }

  return variations;
}

/**
 * Generate rhyming variations
 */
function generateRhymingVariations(mark: string): AlternativeMark[] {
  const rhymes: AlternativeMark[] = [];

  const ending = mark.slice(-2).toLowerCase();
  const rhymingEndings: { [key: string]: string[] } = {
    'le': ['ly', 'al', 'el'],
    'ad': ['ed', 'id', 'od'],
    'ot': ['at', 'it', 'ut'],
  };

  if (rhymingEndings[ending]) {
    rhymingEndings[ending].forEach(newEnding => {
      const variant = mark.slice(0, -2) + newEnding;
      rhymes.push({
        text: variant.charAt(0).toUpperCase() + variant.slice(1),
        strategy: 'rhyme' as const,
        reason: `Rhyming variant of "${mark}"`,
        confidence: 0.5,
      });
    });
  }

  return rhymes;
}

/**
 * Common synonym/related terms mapping
 */
function generateSynonymVariations(mark: string): AlternativeMark[] {
  const synonymMap: { [key: string]: string[] } = {
    'app': ['application', 'software', 'tool', 'platform'],
    'flow': ['stream', 'move', 'sync', 'drive'],
    'snap': ['click', 'catch', 'quick', 'fast'],
    'connect': ['link', 'join', 'sync', 'bridge'],
    'smart': ['intelligent', 'clever', 'sharp', 'wise'],
    'pay': ['charge', 'billing', 'settle', 'transact'],
  };

  const variations: AlternativeMark[] = [];
  const lowerMark = mark.toLowerCase();

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (lowerMark.includes(key)) {
      synonyms.forEach(syn => {
        const variant = lowerMark.replace(key, syn);
        if (variant !== lowerMark) {
          variations.push({
            text: variant.charAt(0).toUpperCase() + variant.slice(1),
            strategy: 'synonym' as const,
            reason: `Synonym replacement: "${key}" → "${syn}"`,
            confidence: 0.65,
          });
        }
      });
    }
  }

  return variations;
}

/**
 * Main function: Generate all alternatives
 */
export function generateAlternatives(mark: string, riskLevel: 'high' | 'medium' | 'low' = 'high'): AlternativeMark[] {
  if (!mark || mark.length < 2) return [];

  // Generate all types of alternatives
  const all = [
    ...generatePrefixAlternatives(mark),
    ...generateSuffixAlternatives(mark),
    ...generatePhoneticVariations(mark),
    ...generateAbbreviations(mark),
    ...generateRhymingVariations(mark),
    ...generateSynonymVariations(mark),
  ];

  // Filter out duplicates and empty strings
  const unique = Array.from(new Map(all.map(a => [a.text.toLowerCase(), a])).values())
    .filter(a => a.text && a.text.length > 1);

  // Sort by confidence and limit results
  return unique
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

/**
 * Format alternatives for display
 */
export function formatAlternatives(alternatives: AlternativeMark[]): string {
  if (alternatives.length === 0) return 'No alternatives generated.';

  return alternatives
    .map((alt, i) => `${i + 1}. ${alt.text} (${alt.strategy}) - ${alt.reason}`)
    .join('\n');
}

/**
 * Backwards compatibility function
 */
export function suggestAlternatives(markText: string, limit = 5): string[] {
  const alternatives = generateAlternatives(markText);
  return alternatives.slice(0, limit).map(a => a.text);
}
