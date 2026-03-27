-- Add luggage size and laundry access to trips.
-- luggage_size: 'backpack' | 'carry-on' | 'checked'
-- has_laundry_access: whether the user can do laundry during the trip

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS luggage_size TEXT NOT NULL DEFAULT 'carry-on',
  ADD COLUMN IF NOT EXISTS has_laundry_access BOOLEAN NOT NULL DEFAULT false;
