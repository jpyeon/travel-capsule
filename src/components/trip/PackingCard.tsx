import type { PackingList, ClothingPackEntry } from '../../features/packing';
import type { CapsuleWardrobe } from '../../features/capsule';

interface PackingCardProps {
  packingList: PackingList;
  capsule: CapsuleWardrobe;
  packedItems: Set<string>;
  onToggle: (key: string) => void;
}

export function PackingCard({ packingList, capsule, packedItems, onToggle }: PackingCardProps) {
  const itemById = new Map(capsule.items.map((i) => [i.id, i]));

  const totalCount =
    packingList.clothing.length +
    packingList.accessories.length +
    packingList.toiletries.length;

  function clothingLabel(entry: ClothingPackEntry): string {
    return itemById.get(entry.itemId)?.name ?? entry.itemId;
  }

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

      {/* Three columns */}
      <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3">

        <PackingSection title="Clothing">
          {packingList.clothing.map((entry) => (
            <PackingRow
              key={entry.itemId}
              itemKey={entry.itemId}
              packed={packedItems.has(entry.itemId)}
              onToggle={onToggle}
            >
              {clothingLabel(entry)}
              {entry.count > 1 && <span className="ml-1 text-sand-400">×{entry.count}</span>}
            </PackingRow>
          ))}
        </PackingSection>

        {packingList.accessories.length > 0 && (
          <PackingSection title="Accessories">
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
          </PackingSection>
        )}

        <PackingSection title="Toiletries">
          {packingList.toiletries.map((item) => (
            <PackingRow
              key={item}
              itemKey={item}
              packed={packedItems.has(item)}
              onToggle={onToggle}
            >
              {item}
            </PackingRow>
          ))}
        </PackingSection>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function PackingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-500">{title}</h3>
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
