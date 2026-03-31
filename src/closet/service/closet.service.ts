import { IClosetRepository } from '../repository/closet.repository';
import {
  ClosetItem,
  CreateClosetItemInput,
  UpdateClosetItemInput,
} from '../types/closet.types';
import { closetItemSchema, closetItemUpdateSchema } from '../../validation/closetItem.schema';

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
    if (!userId) throw new Error('userId is required');
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

function validateCreateInput(data: CreateClosetItemInput): void {
  closetItemSchema.parse(data);
}

function validateUpdateInput(data: UpdateClosetItemInput): void {
  closetItemUpdateSchema.parse(data);
}
