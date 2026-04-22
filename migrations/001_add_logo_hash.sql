-- Add logo_hash column to uspto_trademarks table
-- This column stores the 64-bit perceptual hash for efficient logo similarity search

ALTER TABLE uspto_trademarks
ADD COLUMN IF NOT EXISTS logo_hash TEXT;

-- Create an index on logo_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_uspto_trademarks_logo_hash
ON uspto_trademarks(logo_hash)
WHERE logo_hash IS NOT NULL;

-- Create a partial index for trademarks with logos in the logo_url column
CREATE INDEX IF NOT EXISTS idx_uspto_trademarks_has_logo
ON uspto_trademarks(logo_url)
WHERE logo_url IS NOT NULL;
