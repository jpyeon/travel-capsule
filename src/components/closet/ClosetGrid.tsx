// Renders a grid of ClosetItemCard components; no business logic here.

import { ClosetItem } from '@/closet/types/closet.types';
import { Button } from '../shared/Button';
import { ClosetItemCard } from './ClosetItemCard';

export interface ClosetGridProps {
  items: ClosetItem[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEdit: (item: ClosetItem) => void;
  onDelete: (itemId: string) => void;
}

export function ClosetGrid({ items, loading, error, onAdd, onEdit, onDelete }: ClosetGridProps) {
  // --- Loading state ---
  if (loading) {
    return (
      <div>
        <Header onAdd={onAdd} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div>
        <Header onAdd={onAdd} />
        <p className="text-red-600">Failed to load closet: {error}</p>
      </div>
    );
  }

  // --- Empty state ---
  if (items.length === 0) {
    return (
      <div>
        <Header onAdd={onAdd} />
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-gray-500">Your closet is empty.</p>
          <Button onClick={onAdd}>Add your first item</Button>
        </div>
      </div>
    );
  }

  // --- Grid ---
  return (
    <div>
      <Header onAdd={onAdd} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ClosetItemCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header — always visible regardless of state
// ---------------------------------------------------------------------------

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-xl font-semibold">My Closet</h2>
      <Button onClick={onAdd}>Add item</Button>
    </div>
  );
}
