// Route-level component for the capsule wardrobe view.
// Delegates pipeline orchestration to useCapsuleWardrobe; no business logic here.

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import { useCloset } from '../hooks/useCloset';
import { useCapsuleWardrobe } from '../hooks/useCapsuleWardrobe';
import type { Trip } from '../features/trips/types/trip';
import type { ClosetItem as CanonicalClosetItem } from '../types';
import type { ClosetItem } from '../closet/types/closet.types';
import type { DailyOutfit } from '../types';
import type { PackingList, ClothingPackEntry } from '../features/packing/services/packingService';
import type { CapsuleWardrobe } from '../algorithms/capsule/capsuleGenerator';
import { Button } from '../components/shared/Button';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CapsulePage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const queryTripId = typeof router.query.tripId === 'string' ? router.query.tripId : '';

  const { trips, loading: tripsLoading } = useTrip(userId ?? '');
  const { items: closetItems, loading: closetLoading } = useCloset(userId ?? '');

  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  // Prefer URL query param; fall back to first trip once loaded
  useEffect(() => {
    if (queryTripId) {
      setSelectedTripId(queryTripId);
    } else if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }
  }, [queryTripId, trips, selectedTripId]);

  const loading = tripsLoading || closetLoading;

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Capsule Wardrobe</h1>

      {/* Trip selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600">Trip</label>
        {tripsLoading ? (
          <div className="h-9 w-48 animate-pulse rounded bg-gray-100" />
        ) : trips.length === 0 ? (
          <p className="text-sm text-gray-500">No trips yet — create one on the Trips page.</p>
        ) : (
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.destination} ({trip.startDate} – {trip.endDate})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Capsule generator — only mounts when a trip is selected */}
      {!loading && selectedTrip && (
        <CapsuleSection
          trip={selectedTrip}
          // The closet module uses `warmth`/`formality` field names while the
          // canonical ClosetItem type (used by the algorithm) uses
          // `warmthScore`/`formalityScore`. This pre-existing mismatch should
          // be resolved by unifying the two ClosetItem types.
          closetItems={closetItems as unknown as CanonicalClosetItem[]}
        />
      )}
    </main>
  );
};

export default CapsulePage;

// ---------------------------------------------------------------------------
// CapsuleSection — owns useCapsuleWardrobe so it only runs with a real trip
// ---------------------------------------------------------------------------

function CapsuleSection({
  trip,
  closetItems,
}: {
  trip: Trip;
  closetItems: CanonicalClosetItem[];
}) {
  const { capsule, outfits, packingList, generating, error, generate, reset } =
    useCapsuleWardrobe(trip, closetItems);

  return (
    <div className="flex flex-col gap-10">
      {/* Generate / Reset controls */}
      <div className="flex items-center gap-3">
        <Button onClick={generate} loading={generating} disabled={generating}>
          {capsule ? 'Regenerate' : 'Generate capsule'}
        </Button>
        {capsule && (
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {capsule && (
        <>
          <CapsuleItemsSection capsule={capsule} />
          <DailyOutfitsSection outfits={outfits} capsule={capsule} />
          {packingList && <PackingListSection packingList={packingList} capsule={capsule} />}
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
      <h2 className="mb-4 text-lg font-semibold">
        Capsule items <span className="text-sm font-normal text-gray-400">({capsule.items.length})</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {capsule.items.map((item) => {
          const score = capsule.scoreBreakdown[item.id];
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full border border-gray-200"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium capitalize text-gray-700">{item.category}</span>
              </div>
              <p className="text-xs text-gray-500 capitalize">{item.material}</p>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {score && (
                <p className="text-xs text-gray-400">
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
}: {
  outfits: DailyOutfit[];
  capsule: CapsuleWardrobe;
}) {
  if (outfits.length === 0) return null;

  // Group outfits by date
  const byDate = new Map<string, DailyOutfit[]>();
  for (const outfit of outfits) {
    const list = byDate.get(outfit.date) ?? [];
    list.push(outfit);
    byDate.set(outfit.date, list);
  }

  const itemById = new Map(capsule.items.map((i) => [i.id, i]));

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Daily outfits</h2>
      <div className="flex flex-col gap-6">
        {[...byDate.entries()].map(([date, dayOutfits]) => (
          <div key={date}>
            <p className="mb-2 text-sm font-medium text-gray-700">
              {formatDate(date)}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {dayOutfits[0]?.weatherContext.temperatureHigh}°C high
                · {dayOutfits[0]?.weatherContext.rainProbability}% rain
              </span>
            </p>
            <div className="flex flex-col gap-2">
              {dayOutfits.map((outfit, i) => (
                <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <span className="mb-2 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs capitalize text-gray-600">
                    {outfit.activity}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {outfit.items.length === 0 ? (
                      <span className="text-xs text-gray-400">No items assigned</span>
                    ) : (
                      outfit.items.map((item) => {
                        const full = itemById.get(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-1.5 rounded bg-white px-2 py-1 text-xs shadow-sm"
                          >
                            <div
                              className="h-3 w-3 rounded-full border border-gray-200"
                              style={{ backgroundColor: full?.color ?? item.color }}
                            />
                            <span className="capitalize text-gray-600">{item.category}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Packing list
// ---------------------------------------------------------------------------

function PackingListSection({
  packingList,
  capsule,
}: {
  packingList: PackingList;
  capsule: CapsuleWardrobe;
}) {
  const itemById = new Map(capsule.items.map((i) => [i.id, i]));

  function clothingLabel(entry: ClothingPackEntry): string {
    const item = itemById.get(entry.itemId);
    if (!item) return entry.itemId;
    return `${capitalise(item.color)} ${item.category}`;
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Packing list</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">

        <PackingSection title="Clothing">
          {packingList.clothing.map((entry) => (
            <PackingRow key={entry.itemId}>
              {clothingLabel(entry)}
              {entry.count > 1 && (
                <span className="ml-1 text-gray-400">×{entry.count}</span>
              )}
            </PackingRow>
          ))}
        </PackingSection>

        {packingList.accessories.length > 0 && (
          <PackingSection title="Accessories">
            {packingList.accessories.map((label) => (
              <PackingRow key={label}>{label}</PackingRow>
            ))}
          </PackingSection>
        )}

        <PackingSection title="Toiletries">
          {packingList.toiletries.map((item) => (
            <PackingRow key={item}>{item}</PackingRow>
          ))}
        </PackingSection>

      </div>
    </section>
  );
}

function PackingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-600">{title}</h3>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

function PackingRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2 text-sm text-gray-700">
      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
      {children}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function capitalise(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
