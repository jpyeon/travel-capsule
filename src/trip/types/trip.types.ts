// DTOs (persistence-layer input/output shapes) for the trip feature module.
// These are NOT canonical domain models — see src/types/trip.types.ts for those.

import type { TripActivity, TripVibe, ISODate } from '../../types';

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
