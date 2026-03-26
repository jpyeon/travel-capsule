import type { DailyOutfit, ClosetItem } from '../../types';

interface OutfitCardProps {
  outfit: DailyOutfit;
  itemById: Map<string, ClosetItem>;
}

export function OutfitCard({ outfit, itemById }: OutfitCardProps) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white p-4 shadow-card">
      {/* Activity badge */}
      <span className="mb-3 inline-block rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 text-xs font-medium text-accent-700 capitalize">
        {outfit.activity}
      </span>

      {/* Items */}
      <div className="flex flex-wrap gap-2">
        {outfit.items.length === 0 && outfit.warnings.length === 0 ? (
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
    </div>
  );
}
