import { ITripRepository } from '../repository/trip.repository';
import { CreateTripInput, UpdateTripInput } from '../types/trip.types';
import type { Trip } from '../../types';

// TODO: implement trip business logic and validation

export interface ITripService {
  createTrip(userId: string, data: CreateTripInput): Promise<Trip>;
  getTrips(userId: string): Promise<Trip[]>;
  getTripById(tripId: string): Promise<Trip | null>;
  updateTrip(tripId: string, data: UpdateTripInput): Promise<Trip>;
  deleteTrip(tripId: string): Promise<void>;
}

export class TripService implements ITripService {
  constructor(private readonly repository: ITripRepository) {}

  async createTrip(_userId: string, _data: CreateTripInput): Promise<Trip> {
    throw new Error('Not implemented');
  }

  async getTrips(_userId: string): Promise<Trip[]> {
    throw new Error('Not implemented');
  }

  async getTripById(_tripId: string): Promise<Trip | null> {
    throw new Error('Not implemented');
  }

  async updateTrip(_tripId: string, _data: UpdateTripInput): Promise<Trip> {
    throw new Error('Not implemented');
  }

  async deleteTrip(_tripId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
