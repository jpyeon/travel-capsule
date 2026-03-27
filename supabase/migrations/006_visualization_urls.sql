-- Add visualization URL columns to capsule_wardrobes.
-- packing_visualization_url: base64 data URL of the packed suitcase image.
-- outfit_visualizations: JSONB map of "date::activity" → base64 data URL.

ALTER TABLE capsule_wardrobes
  ADD COLUMN IF NOT EXISTS packing_visualization_url TEXT,
  ADD COLUMN IF NOT EXISTS outfit_visualizations JSONB NOT NULL DEFAULT '{}';
