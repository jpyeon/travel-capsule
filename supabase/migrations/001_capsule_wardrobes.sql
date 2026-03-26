-- Migration: capsule_wardrobes table
--
-- Persists the output of the capsule generation pipeline so users can
-- return to their results without regenerating. One row per trip;
-- regenerating overwrites the existing row via upsert on trip_id.

CREATE TABLE IF NOT EXISTS capsule_wardrobes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items          jsonb       NOT NULL DEFAULT '[]',
  score_breakdown jsonb      NOT NULL DEFAULT '{}',
  outfits        jsonb       NOT NULL DEFAULT '[]',
  packing_list   jsonb       NOT NULL DEFAULT '{}',
  generated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

-- Row Level Security: users can only access their own rows.
ALTER TABLE capsule_wardrobes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own capsules"
  ON capsule_wardrobes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capsules"
  ON capsule_wardrobes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capsules"
  ON capsule_wardrobes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capsules"
  ON capsule_wardrobes FOR DELETE
  USING (auth.uid() = user_id);
