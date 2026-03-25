// Route-level component for the trip management view.
// Delegates data fetching and state to useTrip hook; no business logic here.

import { useState, type FormEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import type { Trip, CreateTripInput, UpdateTripInput } from '../features/trips/types/trip';
import type { TripActivity, TripVibe } from '../types';
import { TripCard } from '../components/trip/TripCard';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';

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
// Form state shape
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

function tripToFormState(trip: Trip): TripFormState {
  return {
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    activities: trip.activities,
    vibe: trip.vibe,
    // lat/lng not editable after creation
    latitude: '',
    longitude: '',
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TripPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  const { trips, loading, error, createTrip, updateTrip, deleteTrip } = useTrip(userId ?? '');

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [form, setForm]               = useState<TripFormState>(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // AI description parsing
  const [description, setDescription] = useState('');
  const [parsing, setParsing]         = useState(false);
  const [parseError, setParseError]   = useState<string | null>(null);

  function openCreate() {
    setEditingTrip(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDescription('');
    setParseError(null);
    setModalOpen(true);
  }

  function openEdit(trip: Trip) {
    setEditingTrip(trip);
    setForm(tripToFormState(trip));
    setFormError(null);
    setDescription('');
    setParseError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTrip(null);
  }

  async function handleParseDescription() {
    if (!description.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch('/api/gemini/parse-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  function toggleActivity(activity: TripActivity) {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingTrip) {
        const input: UpdateTripInput = {
          destination: form.destination,
          startDate:   form.startDate,
          endDate:     form.endDate,
          activities:  form.activities,
          vibe:        form.vibe,
        };
        await updateTrip(editingTrip.id, input);
      } else {
        const input: CreateTripInput = {
          destination: form.destination,
          startDate:   form.startDate,
          endDate:     form.endDate,
          activities:  form.activities,
          vibe:        form.vibe,
          latitude:    parseFloat(form.latitude),
          longitude:   parseFloat(form.longitude),
        };
        await createTrip(input);
      }
      closeModal();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Button onClick={openCreate}>New trip</Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-red-600">Failed to load trips: {error}</p>
      )}

      {/* Empty */}
      {!loading && !error && trips.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-gray-500">No trips yet.</p>
          <Button onClick={openCreate}>Plan your first trip</Button>
        </div>
      )}

      {/* Trip grid */}
      {!loading && !error && trips.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onEdit={openEdit}
              onDelete={deleteTrip}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTrip ? 'Edit trip' : 'New trip'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <Field label="Destination">
            <input
              required
              type="text"
              value={form.destination}
              onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
              className={INPUT_CLS}
              placeholder="e.g. Tokyo, Japan"
            />
          </Field>

          <div className="flex gap-3">
            <Field label="Start date" className="flex-1">
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="End date" className="flex-1">
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className={INPUT_CLS}
              />
            </Field>
          </div>

          {/* Lat/lng — only needed for weather fetch on create */}
          {!editingTrip && (
            <div className="flex gap-3">
              <Field label="Latitude" className="flex-1">
                <input
                  required
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
                  required
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

          {/* AI description — only shown on create */}
          {!editingTrip && (
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
              {parseError && <p className="text-xs text-red-600 mt-1">{parseError}</p>}
              {!parseError && (
                <p className="text-xs text-gray-400 mt-1">
                  AI will suggest activities and vibe based on your description.
                </p>
              )}
            </Field>
          )}

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

          <Field label="Activities">
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_ACTIVITIES.map((activity) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => toggleActivity(activity)}
                  className={[
                    'rounded px-2 py-1 text-xs capitalize transition-colors',
                    form.activities.includes(activity)
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {activity}
                </button>
              ))}
            </div>
          </Field>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>
              {editingTrip ? 'Save changes' : 'Create trip'}
            </Button>
          </div>

        </form>
      </Modal>
    </main>
  );
};

export default TripPage;

// ---------------------------------------------------------------------------
// Field — label wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  'rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1';
