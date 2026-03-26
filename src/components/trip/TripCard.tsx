import Link from 'next/link';
import type { Trip } from '../../features/trips/types/trip';
import { Button } from '../shared/Button';
import { formatDateShort } from '../../utils/date.utils';

export interface TripCardProps {
  trip: Trip;
  onEdit?: (trip: Trip) => void;
  onDelete: (tripId: string) => void;
}

export function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
  const avgTemp =
    trip.weatherForecast.length > 0
      ? Math.round(
          trip.weatherForecast.reduce((sum, f) => sum + f.temperatureHigh, 0) /
            trip.weatherForecast.length,
        )
      : null;

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-sand-200 bg-white p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">

      {/* Destination + dates */}
      <div>
        <h3 className="font-semibold text-gray-900">{trip.destination}</h3>
        <p className="text-sm text-sand-500">
          {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
        </p>
      </div>

      {/* Vibe + weather */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-sand-200 bg-sand-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">
          {trip.vibe}
        </span>
        {avgTemp !== null && (
          <span className="text-xs text-sand-400">{avgTemp}°C avg</span>
        )}
      </div>

      {/* Activities */}
      {trip.activities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trip.activities.map((activity) => (
            <span
              key={activity}
              className="rounded-md bg-accent-50 px-2 py-0.5 text-xs text-accent-700 capitalize"
            >
              {activity}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/TripDetailsPage?tripId=${trip.id}`}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-accent-500 text-white hover:bg-accent-600 active:scale-95 transition-all duration-150"
        >
          View trip
        </Link>
        {onEdit && <Button variant="secondary" onClick={() => onEdit(trip)}>Edit</Button>}
        <Button variant="danger" onClick={() => onDelete(trip.id)}>Delete</Button>
      </div>

    </div>
  );
}

