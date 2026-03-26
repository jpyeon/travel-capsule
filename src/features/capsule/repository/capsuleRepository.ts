import { SupabaseClient } from '@supabase/supabase-js';
import type { CapsuleWardrobe } from '../../../algorithms/capsule/capsuleGenerator';
import type { DailyOutfit } from '../../../types';
import type { PackingList } from '../../packing';

const TABLE = 'capsule_wardrobes';

// ---------------------------------------------------------------------------
// Domain type
// ---------------------------------------------------------------------------

export interface SavedCapsule {
  tripId: string;
  userId: string;
  capsule: CapsuleWardrobe;
  outfits: DailyOutfit[];
  packingList: PackingList;
  generatedAt: string; // ISO string
  packedItems: string[]; // itemIds + label strings that are checked off
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class CapsuleRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Insert or replace the capsule for a trip. Resets packing progress. */
  async upsert(data: SavedCapsule): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .upsert(
        {
          trip_id:          data.tripId,
          user_id:          data.userId,
          items:            data.capsule.items,
          score_breakdown:  data.capsule.scoreBreakdown,
          outfits:          data.outfits,
          packing_list:     data.packingList,
          generated_at:     data.generatedAt,
          packing_progress: { packed: [] },
        },
        { onConflict: 'trip_id' },
      );

    if (error) throw new Error(`Failed to save capsule: ${error.message}`);
  }

  /** Patch only the packing_progress column — no full round-trip needed. */
  async updatePackingProgress(tripId: string, packed: string[]): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .update({ packing_progress: { packed } })
      .eq('trip_id', tripId);

    if (error) throw new Error(`Failed to update packing progress: ${error.message}`);
  }

  /** Returns null if no capsule has been generated for this trip yet. */
  async findByTripId(tripId: string): Promise<SavedCapsule | null> {
    const { data: row, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch capsule: ${error.message}`);
    if (!row) return null;

    return toSavedCapsule(row);
  }
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toSavedCapsule(row: Record<string, unknown>): SavedCapsule {
  const generatedAt = row.generated_at as string;

  const capsule: CapsuleWardrobe = {
    items:          row.items as CapsuleWardrobe['items'],
    scoreBreakdown: row.score_breakdown as CapsuleWardrobe['scoreBreakdown'],
    generatedAt:    new Date(generatedAt),
  };

  const progress = row.packing_progress as { packed?: string[] } | null;

  return {
    tripId:      row.trip_id as string,
    userId:      row.user_id as string,
    capsule,
    outfits:     row.outfits as DailyOutfit[],
    packingList: row.packing_list as PackingList,
    generatedAt,
    packedItems: progress?.packed ?? [],
  };
}
