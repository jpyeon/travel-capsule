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
      <div className="space-y-6">
        <Header onAdd={onAdd} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-sand-100 dark:bg-night-200" />
          ))}
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="space-y-6">
        <Header onAdd={onAdd} />
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load closet: {error}
        </p>
      </div>
    );
  }

  // --- Empty state ---
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <Header onAdd={onAdd} />
        <div className="flex flex-col items-center gap-4 rounded-xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 py-20 text-center shadow-card">
          <p className="text-sm text-sand-500">Your closet is empty.</p>
          <Button onClick={onAdd}>Add your first item</Button>
        </div>
      </div>
    );
  }

  // --- Grid ---
  return (
    <div className="space-y-6">
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
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-night-50">My Closet</h1>
      <Button onClick={onAdd}>Add item</Button>
    </div>
  );
}
