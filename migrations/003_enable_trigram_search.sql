-- Enable PostgreSQL trigram extension for fuzzy text matching
-- This enables the similarity() function for accurate fuzzy searches

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on mark_text_normalized for fast fuzzy searches
CREATE INDEX IF NOT EXISTS idx_mark_text_normalized_trgm
ON uspto_trademarks USING gin(mark_text_normalized gin_trgm_ops);

-- Create index on metaphone for fast phonetic searches
CREATE INDEX IF NOT EXISTS idx_mark_metaphone
ON uspto_trademarks(mark_metaphone)
WHERE mark_metaphone IS NOT NULL;

COMMENT ON INDEX idx_mark_text_normalized_trgm IS 'Trigram index for fuzzy text similarity searches';
COMMENT ON INDEX idx_mark_metaphone IS 'Index for fast metaphone phonetic matching';
