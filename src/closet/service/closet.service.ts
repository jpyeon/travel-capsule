import { IClosetRepository } from '../repository/closet.repository';
import {
  ClosetItem,
  CreateClosetItemInput,
  UpdateClosetItemInput,
} from '../types/closet.types';

export interface IClosetService {
  createClosetItem(userId: string, data: CreateClosetItemInput): Promise<ClosetItem>;
  getClosetItems(userId: string): Promise<ClosetItem[]>;
  updateClosetItem(itemId: string, data: UpdateClosetItemInput): Promise<ClosetItem>;
  deleteClosetItem(itemId: string): Promise<void>;
}

export class ClosetService implements IClosetService {
  constructor(private readonly repository: IClosetRepository) {}

  async createClosetItem(
    userId: string,
    data: CreateClosetItemInput
  ): Promise<ClosetItem> {
    validateCreateInput(data);
    return this.repository.create(userId, data);
  }

  async getClosetItems(userId: string): Promise<ClosetItem[]> {
    if (!userId) throw new Error('userId is required');
    return this.repository.findAllByUser(userId);
  }

  async updateClosetItem(
    itemId: string,
    data: UpdateClosetItemInput
  ): Promise<ClosetItem> {
    if (!itemId) throw new Error('itemId is required');
    if (Object.keys(data).length === 0) throw new Error('No fields provided to update');
    validateUpdateInput(data);
    return this.repository.update(itemId, data);
  }

  async deleteClosetItem(itemId: string): Promise<void> {
    if (!itemId) throw new Error('itemId is required');
    return this.repository.delete(itemId);
  }
}

// --- Validation helpers ---

const VALID_LEVELS = new Set([1, 2, 3, 4, 5]);

function validateCreateInput(data: CreateClosetItemInput): void {
  if (!data.category) throw new Error('category is required');
  if (!data.color?.trim()) throw new Error('color is required');
  if (!VALID_LEVELS.has(data.warmth))
    throw new Error('warmth must be between 1 and 5');
  if (!VALID_LEVELS.has(data.formality))
    throw new Error('formality must be between 1 and 5');
}

function validateUpdateInput(data: UpdateClosetItemInput): void {
  if (data.warmth !== undefined && !VALID_LEVELS.has(data.warmth))
    throw new Error('warmth must be between 1 and 5');
  if (data.formality !== undefined && !VALID_LEVELS.has(data.formality))
    throw new Error('formality must be between 1 and 5');
  if (data.color !== undefined && !data.color.trim())
    throw new Error('color cannot be empty');
}
