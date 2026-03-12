import { SupabaseClient } from '@supabase/supabase-js';
import type { Trip, CreateTripInput, UpdateTripInput } from '../types/trip.ts';

const TABLE = 'trips';

export interface ITripService {
  createTrip(userId: string, data: CreateTripInput): Promise<Trip>;
  getTrips(userId: string): Promise<Trip[]>;
  getTripById(tripId: string): Promise<Trip | null>;
  updateTrip(tripId: string, data: UpdateTripInput): Promise<Trip>;
  deleteTrip(tripId: string): Promise<void>;
}

export class TripService implements ITripService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createTrip(userId: string, data: CreateTripInput): Promise<Trip> {
    validateCreateInput(data);

    // TODO: check for date conflicts with existing trips for this user

    const { data: row, error } = await this.supabase
      .from(TABLE)
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

  async getTrips(userId: string): Promise<Trip[]> {
    if (!userId) throw new Error('userId is required');

    // TODO: add pagination support for users with many trips

    const { data: rows, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch trips: ${error.message}`);

    return (rows ?? []).map(toTrip);
  }

  async getTripById(tripId: string): Promise<Trip | null> {
    if (!tripId) throw new Error('tripId is required');

    const { data: row, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) {
      // PostgREST returns PGRST116 when no rows match; treat as not found
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch trip: ${error.message}`);
    }

    return toTrip(row);
  }

  async updateTrip(tripId: string, data: UpdateTripInput): Promise<Trip> {
    if (!tripId) throw new Error('tripId is required');
    if (Object.keys(data).length === 0) throw new Error('No fields provided to update');
    validateUpdateInput(data);

    // TODO: re-validate date range against weather forecasts if dates change
    // TODO: re-validate activities against capsule wardrobe if already generated

    const patch: Record<string, unknown> = {};
    if (data.destination !== undefined) patch.destination = data.destination;
    if (data.startDate !== undefined) patch.start_date = data.startDate;
    if (data.endDate !== undefined) patch.end_date = data.endDate;
    if (data.activities !== undefined) patch.activities = data.activities;
    if (data.vibe !== undefined) patch.vibe = data.vibe;

    const { data: row, error } = await this.supabase
      .from(TABLE)
      .update(patch)
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update trip: ${error.message}`);

    return toTrip(row);
  }

  async deleteTrip(tripId: string): Promise<void> {
    if (!tripId) throw new Error('tripId is required');

    // TODO: cascade-delete associated capsule wardrobes and packing lists

    const { error } = await this.supabase
      .from(TABLE)
      .delete()
      .eq('id', tripId);

    if (error) throw new Error(`Failed to delete trip: ${error.message}`);
  }
}

// --- Validation helpers ---

function validateCreateInput(data: CreateTripInput): void {
  if (!data.destination?.trim()) throw new Error('destination is required');
  if (!data.startDate) throw new Error('startDate is required');
  if (!data.endDate) throw new Error('endDate is required');
  if (data.endDate < data.startDate) throw new Error('endDate must be on or after startDate');
  if (!data.activities?.length) throw new Error('at least one activity is required');
  if (!data.vibe) throw new Error('vibe is required');
}

function validateUpdateInput(data: UpdateTripInput): void {
  if (data.destination !== undefined && !data.destination.trim())
    throw new Error('destination cannot be empty');
  if (data.startDate !== undefined && data.endDate !== undefined && data.endDate < data.startDate)
    throw new Error('endDate must be on or after startDate');
  if (data.activities !== undefined && data.activities.length === 0)
    throw new Error('activities cannot be empty');
}

// Maps snake_case DB row → camelCase domain type
function toTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    destination: row.destination as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    activities: row.activities as Trip['activities'],
    vibe: row.vibe as Trip['vibe'],
    createdAt: row.created_at as string,
  };
}
