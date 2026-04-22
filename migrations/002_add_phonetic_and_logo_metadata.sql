-- Migration: Add phonetic and logo metadata columns
-- This enhances text similarity (phonetic matching) and logo comparison (color/aspect ratio)

-- Add phonetic column for better text matching
ALTER TABLE uspto_trademarks
ADD COLUMN IF NOT EXISTS mark_metaphone TEXT;

-- Add logo metadata for enhanced logo comparison
ALTER TABLE uspto_trademarks
ADD COLUMN IF NOT EXISTS logo_color_histogram TEXT,
ADD COLUMN IF NOT EXISTS logo_aspect_ratio TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mark_metaphone ON uspto_trademarks(mark_metaphone) WHERE mark_metaphone IS NOT NULL;

-- Note: We already have mark_soundex, so we're adding metaphone for even better phonetic matching
-- Metaphone is generally more accurate than Soundex for English words

COMMENT ON COLUMN uspto_trademarks.mark_metaphone IS 'Double metaphone phonetic encoding for improved sound-alike matching';
COMMENT ON COLUMN uspto_trademarks.logo_color_histogram IS 'Color distribution histogram (JSON) for fast color-based filtering';
COMMENT ON COLUMN uspto_trademarks.logo_aspect_ratio IS 'Logo aspect ratio as width:height for shape-based pre-filtering';
