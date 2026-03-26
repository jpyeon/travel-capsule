import type { ClosetItem } from '../../types';
import { Button } from '../shared/Button';

export interface ClosetItemCardProps {
  item: ClosetItem;
  onEdit: (item: ClosetItem) => void;
  onDelete: (itemId: string) => void;
}

export function ClosetItemCard({ item, onEdit, onDelete }: ClosetItemCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-white p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">

      {/* Top row: color swatch + name */}
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 flex-shrink-0 rounded-full border border-sand-200"
          style={{ backgroundColor: item.color }}
          title={item.color}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-sand-500 capitalize">
              {item.category}
            </span>
            <span className="text-xs text-sand-400">{item.material}</span>
          </div>
        </div>
      </div>

      {/* Photo */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-32 w-full rounded-lg object-cover border border-sand-200"
        />
      )}

      {/* Warmth + formality dot scales */}
      <div className="flex flex-col gap-1">
        <DotScale value={item.warmthScore} label="Warmth" />
        <DotScale value={item.formalityScore} label="Formality" />
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-sand-100 px-2 py-0.5 text-xs text-sand-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={() => onEdit(item)}>Edit</Button>
        <Button variant="danger" onClick={() => onDelete(item.id)}>Delete</Button>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// DotScale — renders a 1–5 dot indicator for warmth and formality
// ---------------------------------------------------------------------------

function DotScale({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-16 text-xs text-sand-400">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-2 rounded-full transition-colors ${n <= value ? 'bg-accent-500' : 'bg-sand-200'}`}
        />
      ))}
    </div>
  );
}
