import type { ClosetItem } from '../../types';
import { Button } from '../shared/Button';

export interface ClosetItemCardProps {
  item: ClosetItem;
  onEdit: (item: ClosetItem) => void;
  onDelete: (itemId: string) => void;
}

export function ClosetItemCard({ item, onEdit, onDelete }: ClosetItemCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">

      {/* Top row: color swatch + category badge */}
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 flex-shrink-0 rounded-full border border-gray-200"
          style={{ backgroundColor: item.color }}
          title={item.color}
        />
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {item.category}
        </span>
        <span className="text-xs text-gray-400">{item.material}</span>
      </div>

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
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={() => onEdit(item)}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete(item.id)}>
          Delete
        </Button>
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
      <span className="w-16 text-xs text-gray-400">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-2 rounded-full ${n <= value ? 'bg-black' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  );
}
