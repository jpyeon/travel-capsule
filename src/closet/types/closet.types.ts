// DTOs (persistence-layer input/output shapes) for the closet feature module.
// These are NOT canonical domain models — see src/types/wardrobe.types.ts for ClosetItem.

import type { ClothingCategory, WarmthLevel, FormalityLevel } from '../../types/shared.types';

export type { ClothingCategory, WarmthLevel, FormalityLevel };

export interface ClosetItem {
  id: string;
  userId: string;
  category: ClothingCategory;
  color: string;
  material: string;
  warmth: WarmthLevel;
  formality: FormalityLevel;
  imageUrl: string | null;
  // Stored as text[] in Postgres; empty array when no tags are set.
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClosetItemInput {
  category: ClothingCategory;
  color: string;
  material: string;
  warmth: WarmthLevel;
  formality: FormalityLevel;
  imageUrl?: string;
  tags?: string[];
}

export interface UpdateClosetItemInput {
  category?: ClothingCategory;
  color?: string;
  material?: string;
  warmth?: WarmthLevel;
  formality?: FormalityLevel;
  imageUrl?: string | null;
  tags?: string[];
}
