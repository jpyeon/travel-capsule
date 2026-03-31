// Multi-step trip creation flow.
// Step 1: Destination (with geocoding + optional AI parse)
// Step 2: Dates
// Step 3: Activities + Vibe
// On submit: createTrip → redirect to TripDetailsPage

import { useState, useEffect, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripSchema, type TripFormData } from '../validation/trip.schema';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import { searchDestination, type GeocodingResult } from '../services/geocoding/geocodingService';
import { StepForm } from '../components/shared/StepForm';
import { Button } from '../components/shared/Button';
import { FormField as Field, INPUT_CLS, inputCls } from '../components/shared/FormField';
import { TagInput } from '../components/shared/TagInput';
import type { CreateTripInput, LuggageSize } from '../features/trips/types/trip';
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

const LUGGAGE_OPTIONS: { value: LuggageSize; label: string; description: string }[] = [
  { value: 'backpack',  label: 'Backpack',  description: 'Up to 6 items' },
  { value: 'carry-on',  label: 'Carry-on',  description: 'Up to 10 items' },
  { value: 'checked',   label: 'Checked',   description: 'Up to 14 items' },
];

// ---------------------------------------------------------------------------
// Form defaults
// ---------------------------------------------------------------------------

const DEFAULT_VALUES: TripFormData = {
  destination: '',
  startDate: '',
  endDate: '',
  activities: [],
  vibe: 'relaxed',
  latitude: 0,
  longitude: 0,
  luggageSize: 'carry-on',
  hasLaundryAccess: false,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TripPlannerPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { createTrip } = useTrip(userId ?? '');

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    mode: 'onTouched',
    defaultValues: DEFAULT_VALUES,
  });

  // Watch fields needed by UI
  const watchDestination    = watch('destination');
  const watchLatitude       = watch('latitude');
  const watchLongitude      = watch('longitude');
  const watchStartDate      = watch('startDate');
  const watchEndDate        = watch('endDate');
  const watchActivities     = watch('activities');
  const watchVibe           = watch('vibe');
  const watchLuggageSize    = watch('luggageSize');
  const watchHasLaundry     = watch('hasLaundryAccess');

  const [submitting, setSubmitting] = useState(false);

  // Geocoding
  const [resolvedLocation, setResolvedLocation]       = useState<GeocodingResult | null>(null);
  const [geocodingCandidates, setGeocodingCandidates] = useState<GeocodingResult[]>([]);
  const [geocoding, setGeocoding]               = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI description parsing
  const [description, setDescription] = useState('');
  const [parsing, setParsing]         = useState(false);

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  // --- Geocoding helpers ---

  function resetGeocoding() {
    setResolvedLocation(null);
    setGeocodingCandidates([]);
    setShowManualCoords(false);
  }

  function selectLocation(result: GeocodingResult) {
    setResolvedLocation(result);
    setGeocodingCandidates([]);
    setValue('latitude', result.latitude, { shouldValidate: true });
    setValue('longitude', result.longitude, { shouldValidate: true });
  }

  function handleDestinationChange(value: string) {
    setValue('destination', value, { shouldValidate: true });
    setValue('latitude', 0, { shouldValidate: true });
    setValue('longitude', 0, { shouldValidate: true });
    if (resolvedLocation) resetGeocoding();

    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);

    const query = value.trim();
    if (query.length < 2) {
      setGeocodingCandidates([]);
      return;
    }

    geocodeDebounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      setGeocodingCandidates([]);
      try {
        const results = await searchDestination(query);
        if (results.length === 0) {
          setShowManualCoords(true);
        } else if (results.length === 1) {
          selectLocation(results[0]);
        } else {
          setGeocodingCandidates(results);
        }
      } catch {
        toast.error('Failed to find destination');
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
      if (data.activities) setValue('activities', data.activities, { shouldValidate: true });
      if (data.vibe) setValue('vibe', data.vibe, { shouldValidate: true });
    } catch {
      toast.error('Failed to parse trip description');
    } finally {
      setParsing(false);
    }
  }

  // --- Submit ---

  async function onSubmit(data: TripFormData) {
    setSubmitting(true);
    try {
      if (!data.latitude || !data.longitude) {
        throw new Error('Location not resolved — tab off the destination field or enter coordinates manually.');
      }
      const input: CreateTripInput = {
        destination:      data.destination,
        startDate:        data.startDate,
        endDate:          data.endDate,
        activities:       data.activities as TripActivity[],
        vibe:             data.vibe,
        latitude:         data.latitude,
        longitude:        data.longitude,
        luggageSize:      data.luggageSize,
        hasLaundryAccess: data.hasLaundryAccess,
      };
      const trip = await createTrip(input);
      toast.success('Trip created');
      void router.push(`/TripDetailsPage?tripId=${trip.id}`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    await rhfHandleSubmit(onSubmit)();
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
              value={watchDestination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className={inputCls(!!errors.destination)}
              placeholder="e.g. Tokyo, Japan"
            />
            {errors.destination && <p className="text-sm text-red-500">{errors.destination.message}</p>}

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
                    onClick={() => { resetGeocoding(); setValue('latitude', 0); setValue('longitude', 0); }}
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
            </div>
          </Field>

          {showManualCoords && (
            <div className="flex gap-3">
              <Field label="Latitude" className="flex-1">
                <input
                  type="number"
                  step="any"
                  {...register('latitude', { valueAsNumber: true })}
                  className={inputCls(!!errors.latitude)}
                  placeholder="e.g. 35.6762"
                />
                {errors.latitude && <p className="text-sm text-red-500">{errors.latitude.message}</p>}
              </Field>
              <Field label="Longitude" className="flex-1">
                <input
                  type="number"
                  step="any"
                  {...register('longitude', { valueAsNumber: true })}
                  className={inputCls(!!errors.longitude)}
                  placeholder="e.g. 139.6503"
                />
                {errors.longitude && <p className="text-sm text-red-500">{errors.longitude.message}</p>}
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
            <p className="text-xs text-gray-400">AI will suggest activities and vibe from your description.</p>
          </Field>
        </div>
      ),
      validate: () => {
        if (!watchDestination?.trim()) return 'Enter a destination.';
        if (!watchLatitude || !watchLongitude) return 'Select a location from the suggestions, or enter coordinates manually.';
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
              {...register('startDate')}
              className={inputCls(!!errors.startDate)}
            />
            {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
          </Field>
          <Field label="End date" className="flex-1">
            <input
              type="date"
              {...register('endDate')}
              className={inputCls(!!errors.endDate)}
            />
            {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
          </Field>
        </div>
      ),
      validate: () => {
        if (!watchStartDate || !watchEndDate) return 'Set both a start and end date.';
        if (watchEndDate < watchStartDate) return 'End date must be after start date.';
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
                tags={watchActivities ?? []}
                onChange={(activities) => setValue('activities', activities, { shouldValidate: true })}
                presets={ALL_ACTIVITIES.filter((a) => !(watchActivities ?? []).includes(a))}
                placeholder="Add a custom activity and press Enter"
              />
            </div>
            {errors.activities && <p className="text-sm text-red-500">{errors.activities.message}</p>}
          </Field>
          <Field label="Vibe">
            <select
              {...register('vibe')}
              className={inputCls(!!errors.vibe)}
            >
              {ALL_VIBES.map((v) => (
                <option key={v} value={v} className="capitalize">{v}</option>
              ))}
            </select>
            {errors.vibe && <p className="text-sm text-red-500">{errors.vibe.message}</p>}
          </Field>

          <Field label="Luggage">
            <div className="flex gap-2 pt-1">
              {LUGGAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('luggageSize', opt.value, { shouldValidate: true })}
                  className={[
                    'flex-1 rounded-lg border px-3 py-2 text-left transition-colors',
                    watchLuggageSize === opt.value
                      ? 'border-accent-400 bg-accent-50 text-accent-700'
                      : 'border-sand-200 bg-white text-gray-600 hover:border-sand-300',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-sand-400">{opt.description}</p>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Laundry access">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                role="switch"
                aria-checked={watchHasLaundry}
                onClick={() => setValue('hasLaundryAccess', !watchHasLaundry, { shouldValidate: true })}
                className={[
                  'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                  watchHasLaundry ? 'bg-accent-500' : 'bg-sand-300',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  watchHasLaundry ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')} />
              </div>
              <span className="text-sm text-gray-600">
                {watchHasLaundry ? 'Yes — I can do laundry' : 'No — I need to pack for the full trip'}
              </span>
            </label>
          </Field>
        </div>
      ),
      validate: () =>
        (watchActivities ?? []).length === 0 ? 'Pick at least one activity.' : null,
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
      </div>
    </main>
  );
};

export default TripPlannerPage;

