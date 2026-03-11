import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTripInput, UpdateTripInput } from '../types/trip.types';
import type { Trip } from '../../types';

// TODO: implement Supabase CRUD for trips

export interface ITripRepository {
  create(userId: string, data: CreateTripInput): Promise<Trip>;
  findAllByUser(userId: string): Promise<Trip[]>;
  findById(tripId: string): Promise<Trip | null>;
  update(tripId: string, data: UpdateTripInput): Promise<Trip>;
  delete(tripId: string): Promise<void>;
}

export class TripRepository implements ITripRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(_userId: string, _data: CreateTripInput): Promise<Trip> {
    throw new Error('Not implemented');
  }

  async findAllByUser(_userId: string): Promise<Trip[]> {
    throw new Error('Not implemented');
  }

  async findById(_tripId: string): Promise<Trip | null> {
    throw new Error('Not implemented');
  }

  async update(_tripId: string, _data: UpdateTripInput): Promise<Trip> {
    throw new Error('Not implemented');
  }

  async delete(_tripId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
