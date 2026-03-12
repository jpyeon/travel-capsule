// Domain type and DTOs for the trips feature module.
// TripActivity and TripVibe are re-exported from global types to avoid duplication.

import type { ISODate, ISODateTime } from '../../../types/shared.types';

export type { TripActivity, TripVibe } from '../../../types/trip.types';
import type { TripActivity, TripVibe } from '../../../types/trip.types';

export interface Trip {
  id: string;
  userId: string;
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  activities: TripActivity[];
  vibe: TripVibe;
  createdAt: ISODateTime;
}

export interface CreateTripInput {
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  activities: TripActivity[];
  vibe: TripVibe;
}

export interface UpdateTripInput {
  destination?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  activities?: TripActivity[];
  vibe?: TripVibe;
}
