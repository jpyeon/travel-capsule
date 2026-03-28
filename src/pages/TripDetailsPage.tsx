// Trip details — shows trip info, edit modal, and the full capsule/outfits/packing view.

import { useState, type FormEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import { useCloset } from '../hooks/useCloset';
import { useCapsuleWardrobe } from '../hooks/useCapsuleWardrobe';
import type { Trip, UpdateTripInput, LuggageSize } from '../features/trips/types/trip';
import type { ClosetItem, DailyOutfit } from '../types';
import type { CapsuleWardrobe } from '../features/capsule';
import type { TripActivity, TripVibe } from '../types';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { FormField as Field, INPUT_CLS } from '../components/shared/FormField';
import { OutfitCard } from '../components/trip/OutfitCard';
import { PackingCard } from '../components/trip/PackingCard';
import { TagInput } from '../components/shared/TagInput';
import { outfitKey } from '../hooks/useOutfitVisualization';
import { formatDateShort, formatDateLong } from '../utils/date.utils';
import { usePackingVisualization, type BagType } from '../hooks/usePackingVisualization';
import { useTravelInfo } from '../hooks/useTravelInfo';
import { BagSelector } from '../components/trip/BagSelector';
import type { PackingList } from '../features/packing';

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
// Edit form state
// ---------------------------------------------------------------------------

const LUGGAGE_OPTIONS: { value: LuggageSize; label: string }[] = [
  { value: 'backpack',  label: 'Backpack' },
  { value: 'carry-on',  label: 'Carry-on' },
  { value: 'checked',   label: 'Checked' },
];

const LUGGAGE_TO_BAG: Record<LuggageSize, BagType> = {
  backpack:  'backpack',
  'carry-on': 'suitcase',
  checked:   'duffel',
};

interface EditFormState {
  destination: string;
  startDate: string;
  endDate: string;
  activities: TripActivity[];
  vibe: TripVibe;
  luggageSize: LuggageSize;
  hasLaundryAccess: boolean;
}

function tripToEditForm(trip: Trip): EditFormState {
  return {
    destination:      trip.destination,
    startDate:        trip.startDate,
    endDate:          trip.endDate,
    activities:       trip.activities,
    vibe:             trip.vibe,
    luggageSize:      trip.luggageSize,
    hasLaundryAccess: trip.hasLaundryAccess,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TripDetailsPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const tripId = typeof router.query.tripId === 'string' ? router.query.tripId : '';

  const { trips, loading: tripsLoading, updateTrip, deleteTrip } = useTrip(userId ?? '');
  const { items: closetItems, loading: closetLoading } = useCloset(userId ?? '');

  // Edit modal state
  const [editOpen, setEditOpen]       = useState(false);
  const [editForm, setEditForm]       = useState<EditFormState | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  const trip = trips.find((t) => t.id === tripId) ?? null;
  const loading = tripsLoading || closetLoading;

  // --- Edit handlers ---

  function openEdit() {
    if (!trip) return;
    setEditForm(tripToEditForm(trip));
    setEditError(null);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditForm(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editForm || !tripId) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      const input: UpdateTripInput = {
        destination:      editForm.destination,
        startDate:        editForm.startDate,
        endDate:          editForm.endDate,
        activities:       editForm.activities,
        vibe:             editForm.vibe,
        luggageSize:      editForm.luggageSize,
        hasLaundryAccess: editForm.hasLaundryAccess,
      };
      await updateTrip(tripId, input);
      closeEdit();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!trip) return;
    if (!confirm(`Delete trip to ${trip.destination}?`)) return;
    await deleteTrip(tripId);
    void router.replace('/DashboardPage');
  }

  // --- Loading / not found ---

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-sand-100" />
        <div className="h-40 animate-pulse rounded-xl bg-sand-100" />
        <div className="h-32 animate-pulse rounded-xl bg-sand-100" />
      </main>
    );
  }

  if (!trip && !tripsLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="rounded-xl border border-sand-200 bg-white px-6 py-12 text-center shadow-card">
          <p className="text-sm font-medium text-gray-700">Trip not found.</p>
          <p className="mt-1 text-sm text-sand-500">This trip may have been deleted.</p>
          <Button onClick={() => router.replace('/DashboardPage')} className="mt-4">
            Back to trips
          </Button>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/DashboardPage')}
        className="text-sm text-gray-400 hover:text-gray-700"
      >
        ← All trips
      </button>

      {/* Trip header */}
      {trip && (
        <div className="rounded-xl border border-sand-200 bg-white shadow-card overflow-hidden">
          {/* Subtle warm gradient header strip */}
          <div className="bg-gradient-to-r from-sand-50 to-white px-6 pt-5 pb-4 border-b border-sand-200">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-gray-900">{trip.destination}</h1>
                <p className="text-sm text-sand-500">
                  {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="secondary" onClick={openEdit}>Edit</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
          {/* Meta row */}
          <div className="px-6 py-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-sand-200 bg-sand-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">
              {trip.vibe}
            </span>
            <span className="rounded-full border border-sand-200 bg-sand-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">
              {trip.luggageSize}
            </span>
            {trip.hasLaundryAccess && (
              <span className="rounded-full border border-sand-200 bg-sand-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                laundry access
              </span>
            )}
            {trip.weatherForecast.length > 0 && (
              <span className="text-xs text-sand-400">
                {Math.round(
                  trip.weatherForecast.reduce((s, f) => s + f.temperatureHigh, 0) /
                    trip.weatherForecast.length,
                )}°C avg
              </span>
            )}
            {trip.activities.map((a) => (
              <span key={a} className="rounded-md bg-accent-50 px-2 py-0.5 text-xs text-accent-700 capitalize">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Capsule section */}
      {trip && userId && (
        <CapsuleSection
          trip={trip}
          closetItems={closetItems}
          userId={userId}
        />
      )}

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={closeEdit} title="Edit trip">
        {editForm && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">

            <Field label="Destination">
              <input
                required
                type="text"
                value={editForm.destination}
                onChange={(e) => setEditForm((p) => p && ({ ...p, destination: e.target.value }))}
                className={INPUT_CLS}
              />
            </Field>

            <div className="flex gap-3">
              <Field label="Start date" className="flex-1">
                <input
                  required
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, startDate: e.target.value }))}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="End date" className="flex-1">
                <input
                  required
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, endDate: e.target.value }))}
                  className={INPUT_CLS}
                />
              </Field>
            </div>

            <Field label="Vibe">
              <select
                value={editForm.vibe}
                onChange={(e) => setEditForm((p) => p && ({ ...p, vibe: e.target.value as TripVibe }))}
                className={INPUT_CLS}
              >
                {ALL_VIBES.map((v) => (
                  <option key={v} value={v} className="capitalize">{v}</option>
                ))}
              </select>
            </Field>

            <Field label="Activities">
              <TagInput
                tags={editForm.activities}
                onChange={(activities) => setEditForm((p) => p && ({ ...p, activities }))}
                presets={ALL_ACTIVITIES.filter((a) => !editForm.activities.includes(a))}
                placeholder="Add a custom activity and press Enter"
              />
            </Field>

            <Field label="Luggage">
              <div className="flex gap-2 pt-1">
                {LUGGAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditForm((p) => p && ({ ...p, luggageSize: opt.value }))}
                    className={[
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                      editForm.luggageSize === opt.value
                        ? 'border-accent-400 bg-accent-50 text-accent-700 font-medium'
                        : 'border-sand-200 bg-white text-gray-600 hover:border-sand-300',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Laundry access">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  role="switch"
                  aria-checked={editForm.hasLaundryAccess}
                  onClick={() => setEditForm((p) => p && ({ ...p, hasLaundryAccess: !p.hasLaundryAccess }))}
                  className={[
                    'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                    editForm.hasLaundryAccess ? 'bg-accent-500' : 'bg-sand-300',
                  ].join(' ')}
                >
                  <span className={[
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    editForm.hasLaundryAccess ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')} />
                </div>
                <span className="text-sm text-gray-600">
                  {editForm.hasLaundryAccess ? 'Yes — I can do laundry' : 'No — packing for full trip'}
                </span>
              </label>
            </Field>

            {editError && <p className="text-sm text-red-600">{editError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeEdit}>Cancel</Button>
              <Button type="submit" loading={editSubmitting}>Save changes</Button>
            </div>

          </form>
        )}
      </Modal>

    </main>
  );
};

export default TripDetailsPage;

// ---------------------------------------------------------------------------
// CapsuleSection — owns useCapsuleWardrobe so it only runs with a real trip
// ---------------------------------------------------------------------------

function CapsuleSection({
  trip,
  closetItems,
  userId,
}: {
  trip: Trip;
  closetItems: ClosetItem[];
  userId: string;
}) {
  const {
    capsule, outfits, packingList, packedItems,
    loading, generating, error, savedAt,
    packingVisualizationUrl, outfitVisualizationUrls,
    generate, togglePacked, savePackingVisualizationUrl, saveOutfitVisualizationUrl, reset,
  } = useCapsuleWardrobe(trip, closetItems, userId);

  const travelInfo = useTravelInfo(trip);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-sand-100" />
        <div className="h-40 animate-pulse rounded-xl bg-sand-100" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Generate / Reset controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {closetItems.length < 6 ? (
          <div className="rounded-xl border border-sand-200 bg-white px-6 py-10 text-center shadow-card">
            <p className="text-sm font-medium text-gray-700">Not enough closet items</p>
            <p className="mt-1 text-sm text-sand-500">
              Add at least 6 items to your closet before generating a capsule.
              {' '}You have {closetItems.length} so far.
            </p>
            <a
              href="/ClosetPage"
              className="mt-4 inline-block rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
            >
              Go to Closet
            </a>
          </div>
        ) : (
          <Button
            onClick={() => {
              if (capsule && packedItems.size > 0) {
                if (!confirm('Regenerating will reset your packing progress. Continue?')) return;
              }
              generate();
            }}
            loading={generating}
            disabled={generating}
          >
            {capsule ? 'Regenerate' : 'Generate capsule'}
          </Button>
        )}
        {capsule && (
          <Button variant="secondary" onClick={reset}>Reset</Button>
        )}
        {savedAt && (
          <span className="text-xs text-sand-400">
            Last generated {formatDateShort(savedAt.split('T')[0])}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <TravelInfoSection travelInfo={travelInfo} destination={trip.destination} />

      {capsule && (
        <>
          <CapsuleItemsSection capsule={capsule} />
          <DailyOutfitsSection
            outfits={outfits}
            capsule={capsule}
            destination={trip.destination}
            vibe={trip.vibe}
            outfitVisualizationUrls={outfitVisualizationUrls}
            onSaveOutfitVisualization={saveOutfitVisualizationUrl}
          />
          {packingList && (
            <PackingCard
              packingList={packingList}
              capsule={capsule}
              luggageSize={trip.luggageSize}
              packedItems={packedItems}
              onToggle={togglePacked}
            />
          )}
          {packingList && (
            <PackingVisualizationSection
              packingList={packingList}
              capsule={capsule}
              destination={trip.destination}
              vibe={trip.vibe}
              luggageSize={trip.luggageSize}
              initialUrl={packingVisualizationUrl}
              onSave={savePackingVisualizationUrl}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capsule items
// ---------------------------------------------------------------------------

function CapsuleItemsSection({ capsule }: { capsule: CapsuleWardrobe }) {
  return (
    <section>
      <h2 className="mb-4 text-base font-bold text-gray-900">
        Capsule items{' '}
        <span className="text-sm font-normal text-sand-400">({capsule.items.length})</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {capsule.items.map((item) => {
          const score = capsule.scoreBreakdown[item.id];
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-sand-200 bg-white p-3 shadow-card"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full border border-sand-200"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-700">{item.name}</p>
                  <span className="text-xs capitalize text-sand-400">{item.category}</span>
                </div>
              </div>
              <p className="text-xs text-sand-500 capitalize">{item.material}</p>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-sand-100 px-1.5 py-0.5 text-xs text-sand-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {score && (
                <p className="text-xs text-sand-400">
                  Score: {score.versatilityScore.toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Daily outfits
// ---------------------------------------------------------------------------

function DailyOutfitsSection({
  outfits,
  capsule,
  destination,
  vibe,
  outfitVisualizationUrls,
  onSaveOutfitVisualization,
}: {
  outfits: DailyOutfit[];
  capsule: CapsuleWardrobe;
  destination: string;
  vibe: string;
  outfitVisualizationUrls: Record<string, string>;
  onSaveOutfitVisualization: (key: string, url: string) => void;
}) {
  if (outfits.length === 0) return null;

  const byDate = new Map<string, DailyOutfit[]>();
  for (const outfit of outfits) {
    const list = byDate.get(outfit.date) ?? [];
    list.push(outfit);
    byDate.set(outfit.date, list);
  }

  const itemById = new Map(capsule.items.map((i) => [i.id, i]));

  return (
    <section>
      <h2 className="mb-4 text-base font-bold text-gray-900">Daily outfits</h2>
      <div className="space-y-6">
        {[...byDate.entries()].map(([date, dayOutfits]) => (
          <div key={date}>
            <div className="mb-3 flex items-baseline gap-3">
              <p className="text-sm font-semibold text-gray-800">{formatDateLong(date)}</p>
              <span className="text-xs text-sand-400">
                {dayOutfits[0]?.weatherContext.temperatureHigh}°C high
                · {dayOutfits[0]?.weatherContext.rainProbability}% rain
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dayOutfits.map((outfit) => (
                <OutfitCard
                  key={outfitKey(outfit.date, outfit.activity)}
                  outfit={outfit}
                  itemById={itemById}
                  destination={destination}
                  vibe={vibe}
                  initialUrl={outfitVisualizationUrls[outfitKey(outfit.date, outfit.activity)] ?? null}
                  onSave={onSaveOutfitVisualization}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Packing visualization
// ---------------------------------------------------------------------------

function PackingVisualizationSection({
  packingList,
  capsule,
  destination,
  vibe,
  luggageSize,
  initialUrl,
  onSave,
}: {
  packingList: PackingList;
  capsule: CapsuleWardrobe;
  destination: string;
  vibe: string;
  luggageSize: LuggageSize;
  initialUrl: string | null;
  onSave: (url: string) => void;
}) {
  const [bagType, setBagType] = useState<BagType>(LUGGAGE_TO_BAG[luggageSize]);

  const { imageData, generating, error, generate, stale } = usePackingVisualization(
    packingList,
    capsule,
    destination,
    vibe,
    bagType,
    initialUrl,
    onSave,
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-gray-900">Packing visualization</h2>
        <BagSelector value={bagType} onChange={setBagType} disabled={generating} />
        <Button
          variant={imageData && !stale ? 'secondary' : 'primary'}
          onClick={generate}
          loading={generating}
          disabled={generating}
        >
          {generating ? 'Generating…' : imageData && !stale ? 'Regenerate' : 'Visualize packing'}
        </Button>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      {/* Stale banner — bag type changed, prompt to regenerate */}
      {stale && imageData && !generating && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          <span>Bag type changed — regenerate to update the image.</span>
        </div>
      )}

      {/* Loading skeleton */}
      {generating && !imageData && (
        <div className="flex h-72 w-full items-center justify-center rounded-xl bg-sand-100">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-accent-500" />
            <p className="text-xs text-sand-400">Generating {bagType} visualization…</p>
          </div>
        </div>
      )}

      {/* Generating overlay on existing image */}
      {generating && imageData && (
        <div className="relative overflow-hidden rounded-xl border border-sand-200 shadow-card">
          <img
            src={imageData}
            alt={`Packing visualization for ${destination}`}
            className="w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-accent-500" />
              <p className="text-xs text-sand-500">Regenerating…</p>
            </div>
          </div>
        </div>
      )}

      {/* Image */}
      {imageData && !generating && (
        <div className="overflow-hidden rounded-xl border border-sand-200 shadow-card">
          <img
            src={imageData}
            alt={`Packing visualization for ${destination}`}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Empty fallback */}
      {!imageData && !generating && !error && (
        <p className="text-sm text-sand-400">
          Generate a visual preview of your packed {bagType}.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Travel info
// ---------------------------------------------------------------------------

function TravelInfoSection({
  travelInfo,
  destination,
}: {
  travelInfo: ReturnType<typeof useTravelInfo>;
  destination: string;
}) {
  const { info, loading, error, fetch } = travelInfo;

  return (
    <section className="rounded-xl border border-sand-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-sand-100">
        <h2 className="text-base font-bold text-gray-900">Travel info</h2>
        <Button
          variant="secondary"
          onClick={fetch}
          loading={loading}
          disabled={loading}
          className="text-xs px-3 py-1.5"
        >
          {info ? 'Refresh' : `Tips for ${destination}`}
        </Button>
      </div>

      {error && <p className="px-5 py-4 text-sm text-red-500">{error}</p>}

      {loading && !info && (
        <div className="space-y-2 px-5 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-sand-100" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
      )}

      {info && (
        <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-sand-100">
          {/* What not to bring */}
          <div className="px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-400">
              Don&apos;t bother packing
            </h3>
            <ul className="space-y-2">
              {info.savings.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Considerations */}
          <div className="px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-400">
              Things to consider
            </h3>
            <ul className="space-y-2">
              {info.considerations.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 text-amber-400 flex-shrink-0">!</span>
                  {tip}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-sand-400">
              AI-generated — verify all requirements before travel.
            </p>
          </div>
        </div>
      )}

      {!info && !loading && !error && (
        <p className="px-5 py-4 text-sm text-sand-400">
          Get destination-specific tips: what to buy locally, visa reminders, cultural notes.
        </p>
      )}
    </section>
  );
}
