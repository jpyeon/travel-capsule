// Bridges ClosetService ↔ React component state.
//
// Instantiates ClosetRepository and ClosetService internally so that
// components never import service or repository classes directly.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ClosetRepository } from '../closet/repository/closet.repository';
import { ClosetService } from '../closet/service/closet.service';
import type { CreateClosetItemInput, UpdateClosetItemInput } from '../closet/types/closet.types';
import type { ClosetItem } from '../closet/types/closet.types';

// ---------------------------------------------------------------------------
// Service singleton — one instance per hook mount, shared across re-renders
// ---------------------------------------------------------------------------

function buildService(): ClosetService {
  const repository = new ClosetRepository(supabase);
  return new ClosetService(repository);
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseClosetReturn {
  items: ClosetItem[];
  loading: boolean;
  error: string | null;
  addItem: (input: CreateClosetItemInput) => Promise<void>;
  updateItem: (itemId: string, input: UpdateClosetItemInput) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCloset(userId: string): UseClosetReturn {
  const [items, setItems]     = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError]     = useState<string | null>(null);

  // Stable service reference — recreated only if userId changes
  const [service] = useState<ClosetService>(buildService);

  // --- Fetch ---

  const refresh = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const fetched = await service.getClosetItems(userId);
      setItems(fetched);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [service, userId]);

  // Fetch on mount and whenever userId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Mutations ---

  const addItem = useCallback(async (input: CreateClosetItemInput): Promise<void> => {
    setError(null);
    try {
      const created = await service.createClosetItem(userId, input);
      // Optimistic prepend — no need to re-fetch the full list
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setError((err as Error).message);
      throw err; // re-throw so the calling component can react (e.g. show a form error)
    }
  }, [service, userId]);

  const updateItem = useCallback(async (
    itemId: string,
    input: UpdateClosetItemInput,
  ): Promise<void> => {
    setError(null);
    try {
      const updated = await service.updateClosetItem(itemId, input);
      setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [service]);

  const removeItem = useCallback(async (itemId: string): Promise<void> => {
    setError(null);
    try {
      await service.deleteClosetItem(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [service]);

  return { items, loading, error, addItem, updateItem, removeItem, refresh };
}
