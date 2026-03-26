// DTOs (persistence-layer input/output shapes) for the closet feature module.
// ClosetItem is the canonical domain model — imported from src/types/wardrobe.types.ts.

import type { ClothingCategory, WarmthLevel, FormalityLevel } from '../../types/shared.types';

export type { ClothingCategory, WarmthLevel, FormalityLevel };
export type { ClosetItem } from '../../types/wardrobe.types';

export interface CreateClosetItemInput {
  name: string;
  category: ClothingCategory;
  color: string;
  material: string;
  warmth: WarmthLevel;
  formality: FormalityLevel;
  imageUrl?: string;
  tags?: string[];
}

export interface UpdateClosetItemInput {
  name?: string;
  category?: ClothingCategory;
  color?: string;
  material?: string;
  warmth?: WarmthLevel;
  formality?: FormalityLevel;
  imageUrl?: string | null;
  tags?: string[];
}
