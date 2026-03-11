import type { ClothingCategory, WarmthLevel, FormalityLevel, ISODateTime } from './shared.types';

export interface ClosetItem {
  id: string;
  userId: string;
  category: ClothingCategory;
  color: string;
  material: string;
  warmthScore: WarmthLevel;
  formalityScore: FormalityLevel;
  imageUrl: string | null;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
