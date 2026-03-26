-- Migration: add packing_progress column to capsule_wardrobes
--
-- Stores which packing list items the user has checked off.
-- Keyed by itemId (clothing) or label string (accessories/toiletries).
-- Reset to empty array whenever the capsule is regenerated.

ALTER TABLE capsule_wardrobes
  ADD COLUMN IF NOT EXISTS packing_progress jsonb NOT NULL DEFAULT '{"packed":[]}';
