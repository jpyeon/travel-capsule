import { SupabaseClient } from '@supabase/supabase-js';
import {
  ClosetItem,
  CreateClosetItemInput,
  UpdateClosetItemInput,
} from '../types/closet.types';

const TABLE = 'closet_items';

export interface IClosetRepository {
  create(userId: string, data: CreateClosetItemInput): Promise<ClosetItem>;
  findAllByUser(userId: string): Promise<ClosetItem[]>;
  update(itemId: string, data: UpdateClosetItemInput): Promise<ClosetItem>;
  delete(itemId: string): Promise<void>;
}

export class ClosetRepository implements IClosetRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(userId: string, data: CreateClosetItemInput): Promise<ClosetItem> {
    const { data: row, error } = await this.supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        category: data.category,
        color: data.color,
        warmth: data.warmth,
        formality: data.formality,
        image_url: data.imageUrl ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create closet item: ${error.message}`);

    return toClosetItem(row);
  }

  async findAllByUser(userId: string): Promise<ClosetItem[]> {
    const { data: rows, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch closet items: ${error.message}`);

    return (rows ?? []).map(toClosetItem);
  }

  async update(itemId: string, data: UpdateClosetItemInput): Promise<ClosetItem> {
    const patch: Record<string, unknown> = {};
    if (data.category !== undefined) patch.category = data.category;
    if (data.color !== undefined) patch.color = data.color;
    if (data.warmth !== undefined) patch.warmth = data.warmth;
    if (data.formality !== undefined) patch.formality = data.formality;
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;

    const { data: row, error } = await this.supabase
      .from(TABLE)
      .update(patch)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update closet item: ${error.message}`);

    return toClosetItem(row);
  }

  async delete(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Failed to delete closet item: ${error.message}`);
  }
}

// Maps snake_case DB row → camelCase domain type
function toClosetItem(row: Record<string, unknown>): ClosetItem {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as ClosetItem['category'],
    color: row.color as string,
    warmth: row.warmth as ClosetItem['warmth'],
    formality: row.formality as ClosetItem['formality'],
    imageUrl: (row.image_url as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
