import { z } from 'zod';

export const closetItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  category: z.enum(['tops', 'bottoms', 'outerwear', 'footwear', 'accessories', 'dresses', 'activewear']),
  color: z.string().trim().min(1, 'Color is required'),
  material: z.string().trim().min(1, 'Material is required'),
  warmth: z.number().int().min(1).max(5),
  formality: z.number().int().min(1).max(5),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
});

export const closetItemUpdateSchema = closetItemSchema.partial();

export type ClosetItemFormData = z.infer<typeof closetItemSchema>;
export type ClosetItemUpdateFormData = z.infer<typeof closetItemUpdateSchema>;
