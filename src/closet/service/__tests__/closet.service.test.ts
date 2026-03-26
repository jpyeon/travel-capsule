import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClosetService } from '../closet.service';
import type { IClosetRepository } from '../../repository/closet.repository';
import type { ClosetItem, CreateClosetItemInput, UpdateClosetItemInput } from '../../types/closet.types';

// ---------------------------------------------------------------------------
// Mock repository
// ---------------------------------------------------------------------------

function makeClosetItem(overrides: Partial<ClosetItem> = {}): ClosetItem {
  return {
    id: 'item-1',
    userId: 'user-1',
    name: 'Blue shirt',
    category: 'tops',
    color: 'blue',
    material: 'cotton',
    warmthScore: 3,
    formalityScore: 2,
    imageUrl: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRepo(): IClosetRepository {
  return {
    create: vi.fn().mockResolvedValue(makeClosetItem()),
    findAllByUser: vi.fn().mockResolvedValue([makeClosetItem()]),
    update: vi.fn().mockResolvedValue(makeClosetItem()),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

const VALID_CREATE: CreateClosetItemInput = {
  name: 'Blue shirt',
  category: 'tops',
  color: 'blue',
  material: 'cotton',
  warmth: 3,
  formality: 2,
};

// ---------------------------------------------------------------------------
// createClosetItem
// ---------------------------------------------------------------------------

describe('ClosetService.createClosetItem', () => {
  let repo: IClosetRepository;
  let service: ClosetService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ClosetService(repo);
  });

  it('delegates to repository on valid input', async () => {
    await service.createClosetItem('user-1', VALID_CREATE);
    expect(repo.create).toHaveBeenCalledWith('user-1', VALID_CREATE);
  });

  it('rejects empty userId', async () => {
    await expect(service.createClosetItem('', VALID_CREATE)).rejects.toThrow('userId is required');
  });

  it('rejects missing name', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, name: '' }),
    ).rejects.toThrow('name is required');
  });

  it('rejects whitespace-only name', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, name: '   ' }),
    ).rejects.toThrow('name is required');
  });

  it('rejects missing category', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, category: '' as never }),
    ).rejects.toThrow('category is required');
  });

  it('rejects missing color', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, color: '' }),
    ).rejects.toThrow('color is required');
  });

  it('rejects missing material', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, material: '' }),
    ).rejects.toThrow('material is required');
  });

  it('rejects warmth out of range', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, warmth: 0 as never }),
    ).rejects.toThrow('warmth must be between 1 and 5');
  });

  it('rejects formality out of range', async () => {
    await expect(
      service.createClosetItem('user-1', { ...VALID_CREATE, formality: 6 as never }),
    ).rejects.toThrow('formality must be between 1 and 5');
  });
});

// ---------------------------------------------------------------------------
// getClosetItems
// ---------------------------------------------------------------------------

describe('ClosetService.getClosetItems', () => {
  it('delegates to repository', async () => {
    const repo = makeRepo();
    const service = new ClosetService(repo);
    await service.getClosetItems('user-1');
    expect(repo.findAllByUser).toHaveBeenCalledWith('user-1');
  });

  it('rejects empty userId', async () => {
    const service = new ClosetService(makeRepo());
    await expect(service.getClosetItems('')).rejects.toThrow('userId is required');
  });
});

// ---------------------------------------------------------------------------
// updateClosetItem
// ---------------------------------------------------------------------------

describe('ClosetService.updateClosetItem', () => {
  let repo: IClosetRepository;
  let service: ClosetService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ClosetService(repo);
  });

  it('delegates valid partial update to repository', async () => {
    const patch: UpdateClosetItemInput = { color: 'red' };
    await service.updateClosetItem('item-1', patch);
    expect(repo.update).toHaveBeenCalledWith('item-1', patch);
  });

  it('rejects empty itemId', async () => {
    await expect(service.updateClosetItem('', { color: 'red' })).rejects.toThrow('itemId is required');
  });

  it('rejects empty update payload', async () => {
    await expect(service.updateClosetItem('item-1', {})).rejects.toThrow('No fields provided');
  });

  it('rejects empty name in update', async () => {
    await expect(service.updateClosetItem('item-1', { name: '' })).rejects.toThrow('name cannot be empty');
  });

  it('rejects whitespace-only name in update', async () => {
    await expect(service.updateClosetItem('item-1', { name: '   ' })).rejects.toThrow('name cannot be empty');
  });

  it('rejects empty material in update', async () => {
    await expect(service.updateClosetItem('item-1', { material: '' })).rejects.toThrow('material cannot be empty');
  });

  it('rejects empty color in update', async () => {
    await expect(service.updateClosetItem('item-1', { color: '' })).rejects.toThrow('color cannot be empty');
  });

  it('rejects invalid warmth in update', async () => {
    await expect(service.updateClosetItem('item-1', { warmth: 7 as never })).rejects.toThrow('warmth must be between 1 and 5');
  });

  it('rejects invalid formality in update', async () => {
    await expect(service.updateClosetItem('item-1', { formality: 0 as never })).rejects.toThrow('formality must be between 1 and 5');
  });
});

// ---------------------------------------------------------------------------
// deleteClosetItem
// ---------------------------------------------------------------------------

describe('ClosetService.deleteClosetItem', () => {
  it('delegates to repository', async () => {
    const repo = makeRepo();
    const service = new ClosetService(repo);
    await service.deleteClosetItem('item-1');
    expect(repo.delete).toHaveBeenCalledWith('item-1');
  });

  it('rejects empty itemId', async () => {
    const service = new ClosetService(makeRepo());
    await expect(service.deleteClosetItem('')).rejects.toThrow('itemId is required');
  });
});
