// Multi-step trip creation flow.
// Step 1: Destination (with geocoding + optional AI parse)
// Step 2: Dates
// Step 3: Activities + Vibe
// On submit: createTrip → redirect to TripDetailsPage

import { useState, useEffect, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import { searchDestination, type GeocodingResult } from '../services/geocoding/geocodingService';
import { StepForm } from '../components/shared/StepForm';
import { Button } from '../components/shared/Button';
import { FormField as Field, INPUT_CLS } from '../components/shared/FormField';
import { TagInput } from '../components/shared/TagInput';
import type { CreateTripInput } from '../features/trips/types/trip';
import type { TripActivity, TripVibe } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_ACTIVITIES: TripActivity[] = [
  'beach', 'hiking', 'business', 'sightseeing', 'dining', 'nightlife', 'skiing', 'casual',
];

const ALL_VIBES: TripVibe[] = [
  'relaxed', 'adventurous', 'formal', 'romantic', 'family', 'backpacker',
];

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface TripFormState {
  destination: string;
  startDate: string;
  endDate: string;
  activities: TripActivity[];
  vibe: TripVibe;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: TripFormState = {
  destination: '',
  startDate: '',
  endDate: '',
  activities: [],
  vibe: 'relaxed',
  latitude: '',
  longitude: '',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TripPlannerPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { createTrip } = useTrip(userId ?? '');

  const [form, setForm]             = useState<TripFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Geocoding
  const [resolvedLocation, setResolvedLocation]       = useState<GeocodingResult | null>(null);
  const [geocodingCandidates, setGeocodingCandidates] = useState<GeocodingResult[]>([]);
  const [geocoding, setGeocoding]                     = useState(false);
  const [geocodingError, setGeocodingError]           = useState<string | null>(null);
  const [showManualCoords, setShowManualCoords]       = useState(false);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI description parsing
  const [description, setDescription] = useState('');
  const [parsing, setParsing]         = useState(false);
  const [parseError, setParseError]   = useState<string | null>(null);

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  // --- Geocoding helpers ---

  function resetGeocoding() {
    setResolvedLocation(null);
    setGeocodingCandidates([]);
    setGeocodingError(null);
    setShowManualCoords(false);
  }

  function selectLocation(result: GeocodingResult) {
    setResolvedLocation(result);
    setGeocodingCandidates([]);
    setGeocodingError(null);
    setForm((p) => ({
      ...p,
      latitude:  String(result.latitude),
      longitude: String(result.longitude),
    }));
  }

  function handleDestinationChange(value: string) {
    setForm((p) => ({ ...p, destination: value, latitude: '', longitude: '' }));
    if (resolvedLocation) resetGeocoding();

    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);

    const query = value.trim();
    if (query.length < 2) {
      setGeocodingCandidates([]);
      setGeocodingError(null);
      return;
    }

    geocodeDebounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      setGeocodingError(null);
      setGeocodingCandidates([]);
      try {
        const results = await searchDestination(query);
        if (results.length === 0) {
          setGeocodingError('Location not found.');
          setShowManualCoords(true);
        } else if (results.length === 1) {
          selectLocation(results[0]);
        } else {
          setGeocodingCandidates(results);
        }
      } catch {
        setGeocodingError('Could not search location.');
        setShowManualCoords(true);
      } finally {
        setGeocoding(false);
      }
    }, 350);
  }

  useEffect(() => () => {
    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
  }, []);

  // --- AI parse ---

  async function handleParseDescription() {
    if (!description.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/gemini/parse-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ description }),
      });
      const data = await res.json() as { activities?: TripActivity[]; vibe?: TripVibe; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to parse description');
      setForm((p) => ({
        ...p,
        activities: data.activities ?? p.activities,
        vibe: data.vibe ?? p.vibe,
      }));
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  // --- Submit ---

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Location not resolved — tab off the destination field or enter coordinates manually.');
      }
      const input: CreateTripInput = {
        destination: form.destination,
        startDate:   form.startDate,
        endDate:     form.endDate,
        activities:  form.activities,
        vibe:        form.vibe,
        latitude:    lat,
        longitude:   lng,
      };
      const trip = await createTrip(input);
      void router.push(`/TripDetailsPage?tripId=${trip.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------

  const steps = [
    {
      label: 'Destination',
      content: (
        <div className="space-y-4">
          <Field label="Where are you going?">
            <input
              type="text"
              value={form.destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className={INPUT_CLS}
              placeholder="e.g. Tokyo, Japan"
            />

            <div className="mt-1 space-y-1">
              {geocoding && (
                <p className="text-xs text-gray-400">Searching location...</p>
              )}
              {resolvedLocation && !geocoding && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {resolvedLocation.name}{resolvedLocation.region ? `, ${resolvedLocation.region}` : ''}, {resolvedLocation.country}
                  </span>
                  <button
                    type="button"
                    onClick={() => { resetGeocoding(); setForm((p) => ({ ...p, latitude: '', longitude: '' })); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Re-search
                  </button>
                </div>
              )}
              {geocodingCandidates.length > 1 && !geocoding && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Multiple matches — pick one:</p>
                  {geocodingCandidates.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectLocation(c)}
                      className="block w-full text-left text-xs rounded border border-gray-200 px-2 py-1.5 hover:bg-gray-50"
                    >
                      {c.name}{c.region ? `, ${c.region}` : ''}, {c.country}
                    </button>
                  ))}
                </div>
              )}
              {geocodingError && !geocoding && (
                <p className="text-xs text-red-500">{geocodingError}</p>
              )}
            </div>
          </Field>

          {showManualCoords && (
            <div className="flex gap-3">
              <Field label="Latitude" className="flex-1">
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="e.g. 35.6762"
                />
              </Field>
              <Field label="Longitude" className="flex-1">
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="e.g. 139.6503"
                />
              </Field>
            </div>
          )}

          <Field label="Describe your trip (optional)">
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${INPUT_CLS} flex-1`}
                placeholder="e.g. beach holiday with hiking and one fancy dinner"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleParseDescription(); } }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleParseDescription}
                loading={parsing}
                disabled={!description.trim() || parsing}
              >
                Auto-fill
              </Button>
            </div>
            {parseError && <p className="text-xs text-red-600">{parseError}</p>}
            {!parseError && (
              <p className="text-xs text-gray-400">AI will suggest activities and vibe from your description.</p>
            )}
          </Field>
        </div>
      ),
      validate: () => {
        if (!form.destination.trim()) return 'Enter a destination.';
        if (!form.latitude || !form.longitude) return 'Select a location from the suggestions, or enter coordinates manually.';
        return null;
      },
    },
    {
      label: 'Dates',
      content: (
        <div className="flex gap-3">
          <Field label="Start date" className="flex-1">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="End date" className="flex-1">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      ),
      validate: () => {
        if (!form.startDate || !form.endDate) return 'Set both a start and end date.';
        if (form.endDate < form.startDate) return 'End date must be after start date.';
        return null;
      },
    },
    {
      label: 'Activities',
      content: (
        <div className="space-y-4">
          <Field label="Activities">
            <div className="space-y-3">
              {/* Selected activities as chips + custom entry */}
              <TagInput
                tags={form.activities}
                onChange={(activities) => setForm((p) => ({ ...p, activities }))}
                presets={ALL_ACTIVITIES.filter((a) => !form.activities.includes(a))}
                placeholder="Add a custom activity and press Enter"
              />
            </div>
          </Field>
          <Field label="Vibe">
            <select
              value={form.vibe}
              onChange={(e) => setForm((p) => ({ ...p, vibe: e.target.value as TripVibe }))}
              className={INPUT_CLS}
            >
              {ALL_VIBES.map((v) => (
                <option key={v} value={v} className="capitalize">{v}</option>
              ))}
            </select>
          </Field>
        </div>
      ),
      validate: () =>
        form.activities.length === 0 ? 'Pick at least one activity.' : null,
    },
  ];

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 text-sm text-gray-400 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Plan a trip</h1>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-card">
        <StepForm steps={steps} onSubmit={handleSubmit} submitting={submitting} />
        {submitError && (
          <p className="mt-4 text-sm text-red-600">{submitError}</p>
        )}
      </div>
    </main>
  );
};

export default TripPlannerPage;

