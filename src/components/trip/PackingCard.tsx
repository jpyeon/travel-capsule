import type { PackingList, ClothingPackEntry, ToiletryEntry, PackingPriority } from '../../features/packing';
import type { CapsuleWardrobe } from '../../features/capsule';
import type { LuggageSize } from '../../features/trips/types/trip';
import { estimatePackingCapacity, type PackingStatus } from '../../utils/packingCapacity';

interface PackingCardProps {
  packingList: PackingList;
  capsule: CapsuleWardrobe;
  luggageSize: LuggageSize;
  packedItems: Set<string>;
  onToggle: (key: string) => void;
}

const PRIORITY_ORDER: PackingPriority[] = ['essential', 'recommended', 'optional'];
const PRIORITY_LABEL: Record<PackingPriority, string> = {
  essential: 'Essential',
  recommended: 'Recommended',
  optional: 'Nice to have',
};
const PRIORITY_COLOR: Record<PackingPriority, string> = {
  essential: 'text-gray-900',
  recommended: 'text-sand-600',
  optional: 'text-sand-400',
};

const STATUS_STYLE: Record<PackingStatus, { bg: string; text: string; label: string }> = {
  underpacked: { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Room to spare' },
  optimal:     { bg: 'bg-green-50',   text: 'text-green-700',   label: 'Good fit' },
  overpacked:  { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Tight fit' },
};

export function PackingCard({ packingList, capsule, luggageSize, packedItems, onToggle }: PackingCardProps) {
  const itemById = new Map(capsule.items.map((i) => [i.id, i]));
  const categoryById = new Map(capsule.items.map((i) => [i.id, i.category]));

  const totalCount =
    packingList.clothing.length +
    packingList.accessories.length +
    packingList.toiletries.length;

  const capacity = estimatePackingCapacity(packingList, luggageSize, categoryById);

  function clothingLabel(entry: ClothingPackEntry): string {
    return itemById.get(entry.itemId)?.name ?? entry.itemId;
  }

  // Group clothing by priority
  const clothingByPriority = groupBy(packingList.clothing, (e) => e.priority);
  // Group toiletries by priority
  const toiletriesByPriority = groupBy(packingList.toiletries, (e) => e.priority);

  return (
    <div className="rounded-xl border border-sand-200 bg-white shadow-card">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3 rounded-t-xl border-b border-sand-200 bg-gradient-to-r from-sand-50 to-white px-5 py-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-bold text-gray-900">Packing list</h2>
          <span className="text-sm text-sand-400">{packedItems.size} / {totalCount} packed</span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-xs text-sand-400 hover:text-gray-700 transition-colors print:hidden"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Capacity bar */}
      <CapacityBar percentageUsed={capacity.percentageUsed} status={capacity.status} suggestion={capacity.suggestion} />

      {/* Three columns */}
      <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3">

        {/* Clothing — grouped by priority */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-500">Clothing</h3>
          {PRIORITY_ORDER.map((tier) => {
            const entries = clothingByPriority.get(tier);
            if (!entries?.length) return null;
            return (
              <PriorityGroup key={tier} tier={tier}>
                {entries.map((entry) => (
                  <PackingRow
                    key={entry.itemId}
                    itemKey={entry.itemId}
                    packed={packedItems.has(entry.itemId)}
                    onToggle={onToggle}
                  >
                    {clothingLabel(entry)}
                    {entry.count > 1 && <span className="ml-1 text-sand-400">x{entry.count}</span>}
                  </PackingRow>
                ))}
              </PriorityGroup>
            );
          })}
        </div>

        {/* Accessories — all recommended tier */}
        {packingList.accessories.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-500">Accessories</h3>
            <ul className="space-y-1.5">
              {packingList.accessories.map((label) => (
                <PackingRow
                  key={label}
                  itemKey={label}
                  packed={packedItems.has(label)}
                  onToggle={onToggle}
                >
                  {label}
                </PackingRow>
              ))}
            </ul>
          </div>
        )}

        {/* Toiletries — grouped by priority */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-500">Toiletries</h3>
          {PRIORITY_ORDER.map((tier) => {
            const entries = toiletriesByPriority.get(tier);
            if (!entries?.length) return null;
            return (
              <PriorityGroup key={tier} tier={tier}>
                {entries.map((entry) => (
                  <PackingRow
                    key={entry.label}
                    itemKey={entry.label}
                    packed={packedItems.has(entry.label)}
                    onToggle={onToggle}
                  >
                    {entry.label}
                  </PackingRow>
                ))}
              </PriorityGroup>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function PriorityGroup({ tier, children }: { tier: PackingPriority; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className={`mb-1 text-[10px] font-medium uppercase tracking-wider ${PRIORITY_COLOR[tier]}`}>
        {PRIORITY_LABEL[tier]}
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function PackingRow({
  children,
  itemKey,
  packed,
  onToggle,
}: {
  children: React.ReactNode;
  itemKey: string;
  packed: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <button
        type="button"
        onClick={() => onToggle(itemKey)}
        aria-label={packed ? 'Mark as unpacked' : 'Mark as packed'}
        className={[
          'h-4 w-4 flex-shrink-0 rounded-full border-2 transition-all duration-150',
          packed
            ? 'border-accent-500 bg-accent-500 scale-90'
            : 'border-sand-300 bg-white hover:border-accent-400',
        ].join(' ')}
      />
      <span className={packed ? 'text-sand-400 line-through' : 'text-gray-700'}>
        {children}
      </span>
    </li>
  );
}

function CapacityBar({
  percentageUsed,
  status,
  suggestion,
}: {
  percentageUsed: number;
  status: PackingStatus;
  suggestion?: string;
}) {
  const style = STATUS_STYLE[status];
  const barWidth = Math.min(percentageUsed, 100);

  return (
    <div className={`mx-5 mt-4 rounded-lg px-4 py-3 ${style.bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
        <span className={`text-xs ${style.text}`}>{percentageUsed}% full</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/60">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            status === 'overpacked' ? 'bg-amber-400' : status === 'optimal' ? 'bg-green-400' : 'bg-blue-300'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {suggestion && (
        <p className={`mt-1.5 text-xs ${style.text}`}>{suggestion}</p>
      )}
    </div>
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => PackingPriority): Map<PackingPriority, T[]> {
  const map = new Map<PackingPriority, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}
