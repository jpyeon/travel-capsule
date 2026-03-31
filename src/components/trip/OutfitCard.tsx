import { useState, useEffect } from 'react';
import type { DailyOutfit, ClosetItem } from '../../types';
import { useOutfitVisualization, outfitKey } from '../../hooks/useOutfitVisualization';
import { Button } from '../shared/Button';

interface OutfitCardProps {
  outfit: DailyOutfit;
  itemById: Map<string, ClosetItem>;
  destination: string;
  vibe: string;
  initialUrl: string | null;
  onSave: (key: string, url: string) => void;
}

export function OutfitCard({ outfit, itemById, destination, vibe, initialUrl, onSave }: OutfitCardProps) {
  const { imageData, generating, error, timedOut, generate, retry } = useOutfitVisualization(
    outfit,
    itemById,
    destination,
    vibe,
    initialUrl,
    onSave,
  );

  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!generating) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [generating]);

  const hasItems = outfit.items.length > 0;

  return (
    <div className="rounded-xl border border-sand-200 bg-white shadow-card overflow-hidden">
      <div className="p-4">
        {/* Activity badge */}
        <span className="mb-3 inline-block rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 text-xs font-medium text-accent-700 capitalize">
          {outfit.activity}
        </span>

        {/* Items */}
        <div className="flex flex-wrap gap-2">
          {!hasItems && outfit.warnings.length === 0 ? (
            <span className="text-xs text-sand-400">No items assigned</span>
          ) : (
            outfit.items.map((item) => {
              const full = itemById.get(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-sand-50 px-2.5 py-1 text-xs"
                >
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full border border-sand-300"
                    style={{ backgroundColor: full?.color ?? item.color }}
                  />
                  <span className="text-gray-700">{full?.name ?? item.category}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Warnings */}
        {outfit.warnings.length > 0 && (
          <ul className="mt-3 space-y-0.5 border-t border-amber-100 pt-2">
            {outfit.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700">{w}</li>
            ))}
          </ul>
        )}

        {/* Visualize button */}
        {hasItems && (
          <div className="mt-3 flex flex-col gap-1 border-t border-sand-100 pt-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={generate}
                loading={generating}
                disabled={generating}
                className="text-xs px-3 py-1.5"
              >
                {imageData ? 'Regenerate' : 'Visualize outfit'}
              </Button>
              {error && !timedOut && <p className="text-xs text-red-500">{error}</p>}
            </div>
            {generating && slow && (
              <p className="text-sm text-gray-500 mt-1">Taking longer than expected...</p>
            )}
            {(timedOut || error) && !generating && (
              <button
                onClick={retry}
                className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generated image */}
      {generating && !imageData && (
        <div className="h-48 w-full animate-pulse bg-sand-100" />
      )}
      {imageData && (
        <img
          src={imageData}
          alt={`${outfit.activity} outfit flat-lay`}
          className="w-full object-cover border-t border-sand-100"
        />
      )}
    </div>
  );
}
