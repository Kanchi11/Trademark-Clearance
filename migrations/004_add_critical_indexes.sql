-- Add critical indexes for search performance
-- These indexes will dramatically speed up UNION ALL queries

-- Index on nice_classes array for fast class filtering (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_nice_classes_gin 
ON uspto_trademarks USING gin(nice_classes);

-- Index on mark_soundex for fast soundex matching
CREATE INDEX IF NOT EXISTS idx_mark_soundex 
ON uspto_trademarks(mark_soundex) 
WHERE mark_soundex IS NOT NULL;

-- Composite index on mark_text_normalized and nice_classes for exact matches
CREATE INDEX IF NOT EXISTS idx_mark_normalized_classes 
ON uspto_trademarks(mark_text_normalized, nice_classes);

-- Index on logo_hash for fast logo similarity searches
CREATE INDEX IF NOT EXISTS idx_logo_hash 
ON uspto_trademarks(logo_hash) 
WHERE logo_hash IS NOT NULL;

-- Index on status for filtering live trademarks
CREATE INDEX IF NOT EXISTS idx_status 
ON uspto_trademarks(status);

COMMENT ON INDEX idx_nice_classes_gin IS 'GIN index for fast array containment queries on nice_classes';
COMMENT ON INDEX idx_mark_soundex IS 'Index for Soundex phonetic matching';
COMMENT ON INDEX idx_mark_normalized_classes IS 'Composite index for exact text + class matching';
COMMENT ON INDEX idx_logo_hash IS 'Index for logo perceptual hash lookups';
COMMENT ON INDEX idx_status IS 'Index for filtering by trademark status';
