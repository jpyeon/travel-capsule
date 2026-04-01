// Trip details — sticky header + tab navigation layout.

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripUpdateSchema, type TripUpdateFormData } from '../validation/trip.schema';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import { useCloset } from '../hooks/useCloset';
import { useCapsuleWardrobe } from '../hooks/useCapsuleWardrobe';
import type { Trip, UpdateTripInput, LuggageSize } from '../features/trips/types/trip';
import type { ClosetItem, DailyOutfit } from '../types';
import type { CapsuleWardrobe } from '../features/capsule';
import type { TripActivity, TripVibe, WeatherForecast } from '../types';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { FormField as Field, inputCls } from '../components/shared/FormField';
import { OutfitCard } from '../components/trip/OutfitCard';
import { PackingCard } from '../components/trip/PackingCard';
import { TagInput } from '../components/shared/TagInput';
import { outfitKey } from '../hooks/useOutfitVisualization';
import { formatDateShort, formatDateLong, daysBetween } from '../utils/date.utils';
import { usePackingVisualization, type BagType } from '../hooks/usePackingVisualization';
import { useTravelInfo } from '../hooks/useTravelInfo';
import { BagSelector } from '../components/trip/BagSelector';
import type { PackingList } from '../features/packing';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'capsule' | 'outfits' | 'packing';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'capsule',  label: 'Capsule'  },
  { id: 'outfits',  label: 'Outfits'  },
  { id: 'packing',  label: 'Packing'  },
];

const ALL_ACTIVITIES: TripActivity[] = [
  'beach', 'hiking', 'business', 'sightseeing', 'dining', 'nightlife', 'skiing', 'casual',
];

const ALL_VIBES: TripVibe[] = [
  'relaxed', 'adventurous', 'formal', 'romantic', 'family', 'backpacker',
];

const LUGGAGE_OPTIONS: { value: LuggageSize; label: string }[] = [
  { value: 'backpack',  label: 'Backpack'  },
  { value: 'carry-on',  label: 'Carry-on'  },
  { value: 'checked',   label: 'Checked'   },
];

const LUGGAGE_TO_BAG: Record<LuggageSize, BagType> = {
  backpack:  'backpack',
  'carry-on': 'suitcase',
  checked:   'duffel',
};

function tripToEditDefaults(trip: Trip): TripUpdateFormData {
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
  const router  = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const tripId  = typeof router.query.tripId === 'string' ? router.query.tripId : '';

  const { trips, loading: tripsLoading, updateTrip, deleteTrip } = useTrip(userId ?? '');
  const { items: closetItems, loading: closetLoading } = useCloset(userId ?? '');

  const [activeTab, setActiveTab]           = useState<Tab>('overview');
  const [editOpen, setEditOpen]             = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    formState: { errors: editErrors, isValid: editIsValid },
    reset: editReset,
    setValue: editSetValue,
    watch: editWatch,
  } = useForm<TripUpdateFormData>({
    resolver: zodResolver(tripUpdateSchema),
    mode: 'onTouched',
  });

  const editActivities  = editWatch('activities');
  const editLuggageSize = editWatch('luggageSize');
  const editHasLaundry  = editWatch('hasLaundryAccess');

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  const trip    = trips.find((t) => t.id === tripId) ?? null;
  const loading = tripsLoading || closetLoading;

  function openEdit() {
    if (!trip) return;
    editReset(tripToEditDefaults(trip));
    setEditOpen(true);
  }

  function closeEdit() { setEditOpen(false); }

  async function onEditSubmit(data: TripUpdateFormData) {
    if (!tripId) return;
    setEditSubmitting(true);
    try {
      const input: UpdateTripInput = {
        destination:      data.destination,
        startDate:        data.startDate,
        endDate:          data.endDate,
        activities:       data.activities as TripActivity[] | undefined,
        vibe:             data.vibe,
        luggageSize:      data.luggageSize,
        hasLaundryAccess: data.hasLaundryAccess,
      };
      await updateTrip(tripId, input);
      toast.success('Trip updated');
      closeEdit();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update trip');
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

  // --- Loading skeleton ---
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-sand-100 dark:bg-night-200" />
        <div className="h-40 animate-pulse rounded-xl bg-sand-100 dark:bg-night-200" />
        <div className="h-32 animate-pulse rounded-xl bg-sand-100 dark:bg-night-200" />
      </main>
    );
  }

  // --- Not found ---
  if (!trip && !tripsLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 px-6 py-12 text-center shadow-card">
          <p className="text-sm font-medium text-gray-700 dark:text-sand-300">Trip not found.</p>
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
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Sticky header                                                       */}
      {/* ------------------------------------------------------------------ */}
      {trip && (
        <div className="sticky top-0 z-20 bg-white dark:bg-night-200 border-b border-sand-200 dark:border-night-100 shadow-[0_1px_4px_0_rgb(0_0_0/0.06)]">
          <div className="max-w-4xl mx-auto px-6">

            {/* Row 1: back link + actions */}
            <div className="flex items-center justify-between gap-4 pt-3 pb-2">
              <button
                type="button"
                onClick={() => router.push('/DashboardPage')}
                className="flex items-center gap-1 text-sm text-sand-400 hover:text-gray-700 transition-colors"
              >
                ← All trips
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={openEdit}>Edit</Button>
                <Button variant="danger"    onClick={handleDelete}>Delete</Button>
              </div>
            </div>

            {/* Row 2: destination + meta */}
            <div className="pb-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-night-50 leading-snug">
                {trip.destination}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm text-sand-500">
                  {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
                </span>
                <span className="text-sand-300" aria-hidden>·</span>
                <span className="text-sm text-sand-500 capitalize">{trip.vibe}</span>
                <span className="text-sand-300" aria-hidden>·</span>
                <span className="text-sm text-sand-500 capitalize">{trip.luggageSize}</span>
                {trip.hasLaundryAccess && (
                  <>
                    <span className="text-sand-300" aria-hidden>·</span>
                    <span className="text-sm text-sand-500">laundry ✓</span>
                  </>
                )}
                {trip.weatherForecast.length > 0 && (
                  <>
                    <span className="text-sand-300" aria-hidden>·</span>
                    <span className="text-sm text-sand-500">
                      {Math.round(
                        trip.weatherForecast.reduce((s, f) => s + f.temperatureHigh, 0) /
                          trip.weatherForecast.length,
                      )}°C avg
                    </span>
                  </>
                )}
                {trip.activities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-accent-50 border border-accent-200 px-2 py-0.5 text-xs text-accent-700 capitalize"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Row 3: tab bar */}
            <div className="flex -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-accent-500 text-accent-600'
                      : 'border-transparent text-sand-500 hover:text-gray-700 dark:hover:text-sand-300 hover:border-sand-300',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tab content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {trip && userId && (
          <CapsuleSection
            trip={trip}
            closetItems={closetItems}
            userId={userId}
            activeTab={activeTab}
          />
        )}
      </main>

      {/* Edit modal */}
      {trip && (
        <Modal isOpen={editOpen} onClose={closeEdit} title="Edit trip">
          <form onSubmit={editHandleSubmit(onEditSubmit)} className="flex flex-col gap-4">

            <Field label="Destination">
              <input
                type="text"
                {...editRegister('destination')}
                className={inputCls(!!editErrors.destination)}
              />
              {editErrors.destination && (
                <p className="text-sm text-red-500">{editErrors.destination.message}</p>
              )}
            </Field>

            <div className="flex gap-3">
              <Field label="Start date" className="flex-1">
                <input
                  type="date"
                  {...editRegister('startDate')}
                  className={inputCls(!!editErrors.startDate)}
                />
                {editErrors.startDate && (
                  <p className="text-sm text-red-500">{editErrors.startDate.message}</p>
                )}
              </Field>
              <Field label="End date" className="flex-1">
                <input
                  type="date"
                  {...editRegister('endDate')}
                  className={inputCls(!!editErrors.endDate)}
                />
                {editErrors.endDate && (
                  <p className="text-sm text-red-500">{editErrors.endDate.message}</p>
                )}
              </Field>
            </div>

            <Field label="Vibe">
              <select {...editRegister('vibe')} className={inputCls(!!editErrors.vibe)}>
                {ALL_VIBES.map((v) => (
                  <option key={v} value={v} className="capitalize">{v}</option>
                ))}
              </select>
              {editErrors.vibe && (
                <p className="text-sm text-red-500">{editErrors.vibe.message}</p>
              )}
            </Field>

            <Field label="Activities">
              <TagInput
                tags={(editActivities as string[]) ?? []}
                onChange={(activities) =>
                  editSetValue('activities', activities, { shouldValidate: true })
                }
                presets={ALL_ACTIVITIES.filter((a) => !(editActivities ?? []).includes(a))}
                placeholder="Add a custom activity and press Enter"
              />
              {editErrors.activities && (
                <p className="text-sm text-red-500">{editErrors.activities.message}</p>
              )}
            </Field>

            <Field label="Luggage">
              <div className="flex gap-2 pt-1">
                {LUGGAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      editSetValue('luggageSize', opt.value, { shouldValidate: true })
                    }
                    className={[
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                      editLuggageSize === opt.value
                        ? 'border-accent-400 bg-accent-50 text-accent-700 font-medium'
                        : 'border-sand-200 bg-white dark:bg-night-200 dark:border-night-100 text-gray-600 dark:text-sand-400 hover:border-sand-300 dark:hover:border-night-100',
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
                  aria-checked={editHasLaundry ?? false}
                  onClick={() =>
                    editSetValue('hasLaundryAccess', !editHasLaundry, { shouldValidate: true })
                  }
                  className={[
                    'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                    editHasLaundry ? 'bg-accent-500' : 'bg-sand-300',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                      editHasLaundry ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-sand-400">
                  {editHasLaundry ? 'Yes — I can do laundry' : 'No — packing for full trip'}
                </span>
              </label>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeEdit}>Cancel</Button>
              <Button
                type="submit"
                loading={editSubmitting}
                disabled={!editIsValid || editSubmitting}
              >
                Save changes
              </Button>
            </div>

          </form>
        </Modal>
      )}
    </>
  );
};

export default TripDetailsPage;

// ---------------------------------------------------------------------------
// CapsuleSection — owns useCapsuleWardrobe; routes content to the active tab
// ---------------------------------------------------------------------------

function CapsuleSection({
  trip,
  closetItems,
  userId,
  activeTab,
}: {
  trip: Trip;
  closetItems: ClosetItem[];
  userId: string;
  activeTab: Tab;
}) {
  const {
    capsule, outfits, packingList, packedItems,
    loading, generating, savedAt,
    packingVisualizationUrl, outfitVisualizationUrls,
    generate, togglePacked, savePackingVisualizationUrl, saveOutfitVisualizationUrl, reset,
  } = useCapsuleWardrobe(trip, closetItems, userId);

  const travelInfo = useTravelInfo(trip);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-sand-100 dark:bg-night-200" />
        <div className="h-40 animate-pulse rounded-xl bg-sand-100 dark:bg-night-200" />
      </div>
    );
  }

  return (
    <>
      {activeTab === 'overview' && (
        <OverviewTab trip={trip} travelInfo={travelInfo} />
      )}

      {activeTab === 'capsule' && (
        <CapsuleTab
          capsule={capsule}
          closetItems={closetItems}
          generating={generating}
          savedAt={savedAt}
          onGenerate={() => {
            if (capsule && packedItems.size > 0) {
              if (!confirm('Regenerating will reset your packing progress. Continue?')) return;
            }
            generate();
          }}
          onReset={reset}
        />
      )}

      {activeTab === 'outfits' && (
        <OutfitsTab
          outfits={outfits}
          capsule={capsule}
          destination={trip.destination}
          vibe={trip.vibe}
          outfitVisualizationUrls={outfitVisualizationUrls}
          onSaveOutfitVisualization={saveOutfitVisualizationUrl}
        />
      )}

      {activeTab === 'packing' && (
        <PackingTab
          packingList={packingList}
          capsule={capsule}
          luggageSize={trip.luggageSize}
          packedItems={packedItems}
          onToggle={togglePacked}
          destination={trip.destination}
          vibe={trip.vibe}
          packingVisualizationUrl={packingVisualizationUrl}
          onSavePackingVisualization={savePackingVisualizationUrl}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({
  trip,
  travelInfo,
}: {
  trip: Trip;
  travelInfo: ReturnType<typeof useTravelInfo>;
}) {
  const duration = daysBetween(trip.startDate, trip.endDate);

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Duration" value={`${duration} day${duration !== 1 ? 's' : ''}`} />
        <StatCard label="Luggage"  value={trip.luggageSize}  capitalize />
        <StatCard label="Laundry"  value={trip.hasLaundryAccess ? 'Available' : 'No access'} />
      </div>

      {/* Weather forecast — horizontal scroll strip */}
      {trip.weatherForecast.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-sand-300">Weather forecast</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {trip.weatherForecast.map((forecast) => (
              <WeatherCard key={forecast.date} forecast={forecast} />
            ))}
          </div>
        </section>
      )}

      {/* Travel info */}
      <TravelInfoSection travelInfo={travelInfo} destination={trip.destination} />

    </div>
  );
}

function StatCard({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 px-4 py-3 shadow-card">
      <p className="text-xs text-sand-400 mb-1">{label}</p>
      <p className={`text-sm font-medium text-gray-800 dark:text-night-50 ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function WeatherCard({ forecast }: { forecast: WeatherForecast }) {
  const rain = forecast.rainProbability;
  const icon = rain >= 70 ? '🌧' : rain >= 40 ? '⛅' : '☀️';

  return (
    <div className="flex-shrink-0 w-20 rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 px-3 py-3 shadow-card text-center">
      <p className="text-xs text-sand-400 mb-1">
        {new Date(forecast.date).toLocaleDateString('en-GB', {
          weekday: 'short',
          timeZone: 'UTC',
        })}
      </p>
      <p className="text-lg leading-none mb-1.5">{icon}</p>
      <p className="text-xs font-medium text-gray-800 dark:text-night-50">{forecast.temperatureHigh}°</p>
      <p className="text-xs text-sand-400">{forecast.temperatureLow}°</p>
      {rain > 0 && <p className="mt-1 text-[10px] text-blue-400">{rain}%</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capsule tab
// ---------------------------------------------------------------------------

function CapsuleTab({
  capsule,
  closetItems,
  generating,
  savedAt,
  onGenerate,
  onReset,
}: {
  capsule: CapsuleWardrobe | null;
  closetItems: ClosetItem[];
  generating: boolean;
  savedAt: string | null;
  onGenerate: () => void;
  onReset: () => void;
}) {
  if (closetItems.length < 6) {
    return (
      <EmptyState
        title="Not enough closet items"
        description={`Add at least 6 items to your closet before generating a capsule. You have ${closetItems.length} so far.`}
        action={{ label: 'Go to Closet', href: '/ClosetPage' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={onGenerate} loading={generating} disabled={generating}>
          {capsule ? 'Regenerate capsule' : 'Generate capsule'}
        </Button>
        {capsule && <Button variant="secondary" onClick={onReset}>Reset</Button>}
        {savedAt && (
          <span className="text-xs text-sand-400">
            Last generated {formatDateShort(savedAt.split('T')[0])}
          </span>
        )}
      </div>

      {capsule && <CapsuleItemsGrid capsule={capsule} />}

      {!capsule && !generating && (
        <EmptyState
          title="No capsule yet"
          description="Generate your travel capsule to see which items from your closet to bring."
        />
      )}
    </div>
  );
}

function CapsuleItemsGrid({ capsule }: { capsule: CapsuleWardrobe }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-sand-300">
        Your capsule{' '}
        <span className="font-normal text-sand-400">({capsule.items.length} items)</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {capsule.items.map((item) => {
          const score = capsule.scoreBreakdown[item.id];
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 p-3 shadow-card"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full border border-sand-200 dark:border-night-100"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-700 dark:text-sand-300">{item.name}</p>
                  <span className="text-xs capitalize text-sand-400">{item.category}</span>
                </div>
              </div>
              <p className="text-xs text-sand-500 capitalize">{item.material}</p>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-sand-100 dark:bg-night-100 px-1.5 py-0.5 text-xs text-sand-500"
                    >
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
// Outfits tab
// ---------------------------------------------------------------------------

function OutfitsTab({
  outfits,
  capsule,
  destination,
  vibe,
  outfitVisualizationUrls,
  onSaveOutfitVisualization,
}: {
  outfits: DailyOutfit[];
  capsule: CapsuleWardrobe | null;
  destination: string;
  vibe: string;
  outfitVisualizationUrls: Record<string, string>;
  onSaveOutfitVisualization: (key: string, url: string) => void;
}) {
  if (!capsule) {
    return (
      <EmptyState
        title="No capsule yet"
        description="Generate a capsule first — your daily outfit suggestions will appear here."
        hint="Go to the Capsule tab to get started."
      />
    );
  }

  if (outfits.length === 0) {
    return (
      <EmptyState
        title="No outfits generated"
        description="No daily outfits could be built from your current capsule."
      />
    );
  }

  const byDate = new Map<string, DailyOutfit[]>();
  for (const outfit of outfits) {
    const list = byDate.get(outfit.date) ?? [];
    list.push(outfit);
    byDate.set(outfit.date, list);
  }

  const itemById = new Map(capsule.items.map((i) => [i.id, i]));

  return (
    <div className="space-y-6">
      {[...byDate.entries()].map(([date, dayOutfits]) => (
        <div key={date}>
          <div className="mb-3 flex items-baseline gap-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-night-50">{formatDateLong(date)}</p>
            <span className="text-xs text-sand-400">
              {dayOutfits[0]?.weatherContext.temperatureHigh}°C
              {' · '}{dayOutfits[0]?.weatherContext.rainProbability}% rain
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
                initialUrl={
                  outfitVisualizationUrls[outfitKey(outfit.date, outfit.activity)] ?? null
                }
                onSave={onSaveOutfitVisualization}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Packing tab
// ---------------------------------------------------------------------------

function PackingTab({
  packingList,
  capsule,
  luggageSize,
  packedItems,
  onToggle,
  destination,
  vibe,
  packingVisualizationUrl,
  onSavePackingVisualization,
}: {
  packingList: PackingList | null;
  capsule: CapsuleWardrobe | null;
  luggageSize: LuggageSize;
  packedItems: Set<string>;
  onToggle: (key: string) => void;
  destination: string;
  vibe: string;
  packingVisualizationUrl: string | null;
  onSavePackingVisualization: (url: string) => void;
}) {
  if (!capsule || !packingList) {
    return (
      <EmptyState
        title="No packing list yet"
        description="Generate a capsule first — your packing list will appear here."
        hint="Go to the Capsule tab to get started."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PackingCard
        packingList={packingList}
        capsule={capsule}
        luggageSize={luggageSize}
        packedItems={packedItems}
        onToggle={onToggle}
      />
      <PackingVisualizationSection
        packingList={packingList}
        capsule={capsule}
        destination={destination}
        vibe={vibe}
        luggageSize={luggageSize}
        initialUrl={packingVisualizationUrl}
        onSave={onSavePackingVisualization}
      />
    </div>
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

  const { imageData, generating, error, generate, stale, timedOut, retry } =
    usePackingVisualization(packingList, capsule, destination, vibe, bagType, initialUrl, onSave);

  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!generating) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [generating]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-sand-300">Packing visualization</h2>
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

      {stale && imageData && !generating && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          Bag type changed — regenerate to update the image.
        </div>
      )}

      {generating && !imageData && (
        <div className="flex h-72 w-full items-center justify-center rounded-xl bg-sand-100 dark:bg-night-200">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-accent-500" />
            <p className="text-xs text-sand-400">Generating {bagType} visualization…</p>
            {slow && <p className="text-sm text-gray-500 mt-1">Taking longer than expected…</p>}
          </div>
        </div>
      )}

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
              {slow && <p className="text-sm text-gray-500 mt-1">Taking longer than expected…</p>}
            </div>
          </div>
        </div>
      )}

      {imageData && !generating && (
        <div className="overflow-hidden rounded-xl border border-sand-200 dark:border-night-100 shadow-card">
          <img
            src={imageData}
            alt={`Packing visualization for ${destination}`}
            className="w-full object-cover"
          />
        </div>
      )}

      {!imageData && !generating && !error && !timedOut && (
        <p className="text-sm text-sand-400">
          Generate a visual preview of your packed {bagType}.
        </p>
      )}

      {(timedOut || error) && !generating && (
        <button
          onClick={retry}
          className="mt-2 rounded-lg border border-sand-200 bg-white px-4 py-2 text-sm text-gray-700 hover:border-sand-300 transition-colors"
        >
          Retry
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Travel info section
// ---------------------------------------------------------------------------

function TravelInfoSection({
  travelInfo,
  destination,
}: {
  travelInfo: ReturnType<typeof useTravelInfo>;
  destination: string;
}) {
  const { info, loading, error, timedOut, fetch, retry } = travelInfo;

  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <section className="rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-sand-100 dark:border-night-100">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-sand-300">Travel info</h2>
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

      {loading && !info && (
        <div className="space-y-2 px-5 py-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-sand-100 dark:bg-night-100"
              style={{ width: `${60 + i * 10}%` }}
            />
          ))}
          {slow && <p className="text-sm text-gray-500 mt-1">Taking longer than expected…</p>}
        </div>
      )}

      {info && (
        <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-sand-100 dark:divide-night-100">
          <div className="px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-400">
              Don&apos;t bother packing
            </h3>
            <ul className="space-y-2">
              {info.savings.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-sand-300">
                  <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-400">
              Things to consider
            </h3>
            <ul className="space-y-2">
              {info.considerations.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-sand-300">
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

      {!info && !loading && !error && !timedOut && (
        <p className="px-5 py-4 text-sm text-sand-400">
          Get destination-specific tips: what to buy locally, visa reminders, cultural notes.
        </p>
      )}

      {(timedOut || error) && !loading && (
        <div className="px-5 py-4">
          <button
            onClick={retry}
            className="rounded-lg border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 px-4 py-2 text-sm text-gray-700 dark:text-sand-300 hover:border-sand-300 dark:hover:border-night-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared empty state
// ---------------------------------------------------------------------------

function EmptyState({
  title,
  description,
  hint,
  action,
}: {
  title: string;
  description: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 px-6 py-12 text-center shadow-card">
      <p className="text-sm font-medium text-gray-700 dark:text-sand-300">{title}</p>
      <p className="mt-1 text-sm text-sand-500 max-w-sm mx-auto">{description}</p>
      {hint && <p className="mt-1 text-xs text-sand-400">{hint}</p>}
      {action && (
        <a
          href={action.href}
          className="mt-4 inline-block rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
