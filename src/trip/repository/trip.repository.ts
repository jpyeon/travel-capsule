import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTripInput, UpdateTripInput } from '../types/trip.types';
import type { Trip } from '../../types';

export interface ITripRepository {
  create(userId: string, data: CreateTripInput): Promise<Trip>;
  findAllByUser(userId: string): Promise<Trip[]>;
  findById(tripId: string): Promise<Trip | null>;
  update(tripId: string, data: UpdateTripInput): Promise<Trip>;
  delete(tripId: string): Promise<void>;
}

export class TripRepository implements ITripRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(userId: string, data: CreateTripInput): Promise<Trip> {
    const { data: row, error } = await this.supabase
      .from('trips')
      .insert({
        user_id: userId,
        destination: data.destination,
        start_date: data.startDate,
        end_date: data.endDate,
        activities: data.activities,
        vibe: data.vibe,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create trip: ${error.message}`);
    return toTrip(row);
  }

  async findAllByUser(userId: string): Promise<Trip[]> {
    const { data: rows, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch trips: ${error.message}`);
    return (rows ?? []).map(toTrip);
  }

  async findById(tripId: string): Promise<Trip | null> {
    const { data: row, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch trip: ${error.message}`);
    return row ? toTrip(row) : null;
  }

  async update(tripId: string, data: UpdateTripInput): Promise<Trip> {
    const patch: Record<string, unknown> = {};
    if (data.destination !== undefined) patch.destination = data.destination;
    if (data.startDate !== undefined) patch.start_date = data.startDate;
    if (data.endDate !== undefined) patch.end_date = data.endDate;
    if (data.activities !== undefined) patch.activities = data.activities;
    if (data.vibe !== undefined) patch.vibe = data.vibe;

    const { data: row, error } = await this.supabase
      .from('trips')
      .update(patch)
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update trip: ${error.message}`);
    return toTrip(row);
  }

  async delete(tripId: string): Promise<void> {
    const { error } = await this.supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw new Error(`Failed to delete trip: ${error.message}`);
  }
}

function toTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    destination: row.destination as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    activities: row.activities as Trip['activities'],
    vibe: row.vibe as Trip['vibe'],
  };
}
