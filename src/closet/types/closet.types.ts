// DTOs (persistence-layer input/output shapes) for the closet feature module.
// These are NOT canonical domain models — see src/types/wardrobe.types.ts for ClosetItem.

import type { ClothingCategory, WarmthLevel, FormalityLevel } from '../../types/shared.types';

export type { ClothingCategory, WarmthLevel, FormalityLevel };

export interface ClosetItem {
  id: string;
  userId: string;
  category: ClothingCategory;
  color: string;
  warmth: WarmthLevel;
  formality: FormalityLevel;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClosetItemInput {
  category: ClothingCategory;
  color: string;
  warmth: WarmthLevel;
  formality: FormalityLevel;
  imageUrl?: string;
}

export interface UpdateClosetItemInput {
  category?: ClothingCategory;
  color?: string;
  warmth?: WarmthLevel;
  formality?: FormalityLevel;
  imageUrl?: string | null;
}
