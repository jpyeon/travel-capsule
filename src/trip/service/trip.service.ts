import { ITripRepository } from '../repository/trip.repository';
import { CreateTripInput, UpdateTripInput } from '../types/trip.types';
import type { Trip } from '../../types';

export interface ITripService {
  createTrip(userId: string, data: CreateTripInput): Promise<Trip>;
  getTrips(userId: string): Promise<Trip[]>;
  getTripById(tripId: string): Promise<Trip | null>;
  updateTrip(tripId: string, data: UpdateTripInput): Promise<Trip>;
  deleteTrip(tripId: string): Promise<void>;
}

export class TripService implements ITripService {
  constructor(private readonly repository: ITripRepository) {}

  async createTrip(userId: string, data: CreateTripInput): Promise<Trip> {
    validateCreateInput(data);
    return this.repository.create(userId, data);
  }

  async getTrips(userId: string): Promise<Trip[]> {
    if (!userId) throw new Error('userId is required');
    return this.repository.findAllByUser(userId);
  }

  async getTripById(tripId: string): Promise<Trip | null> {
    if (!tripId) throw new Error('tripId is required');
    return this.repository.findById(tripId);
  }

  async updateTrip(tripId: string, data: UpdateTripInput): Promise<Trip> {
    if (!tripId) throw new Error('tripId is required');
    if (Object.keys(data).length === 0) throw new Error('No fields provided to update');
    validateUpdateInput(data);
    return this.repository.update(tripId, data);
  }

  async deleteTrip(tripId: string): Promise<void> {
    if (!tripId) throw new Error('tripId is required');
    return this.repository.delete(tripId);
  }
}

// --- Validation helpers ---

const VALID_ACTIVITIES = new Set<string>([
  'beach', 'hiking', 'business', 'sightseeing',
  'dining', 'nightlife', 'skiing', 'casual',
]);

const VALID_VIBES = new Set<string>([
  'relaxed', 'adventurous', 'formal', 'romantic', 'family', 'backpacker',
]);

function validateCreateInput(data: CreateTripInput): void {
  if (!data.destination?.trim()) throw new Error('destination is required');
  if (!data.startDate) throw new Error('startDate is required');
  if (!data.endDate) throw new Error('endDate is required');
  if (data.endDate < data.startDate) throw new Error('endDate must be on or after startDate');
  if (!data.activities?.length) throw new Error('at least one activity is required');
  if (!data.activities.every(a => VALID_ACTIVITIES.has(a))) throw new Error('invalid activity');
  if (!data.vibe || !VALID_VIBES.has(data.vibe)) throw new Error('vibe is required and must be valid');
}

function validateUpdateInput(data: UpdateTripInput): void {
  if (data.destination !== undefined && !data.destination.trim())
    throw new Error('destination cannot be empty');
  if (data.startDate && data.endDate && data.endDate < data.startDate)
    throw new Error('endDate must be on or after startDate');
  if (data.activities !== undefined && !data.activities.length)
    throw new Error('activities cannot be empty');
  if (data.vibe !== undefined && !VALID_VIBES.has(data.vibe))
    throw new Error('invalid vibe');
}
