import Link from 'next/link';
import type { Trip } from '../../features/trips/types/trip';
import { Button } from '../shared/Button';

export interface TripCardProps {
  trip: Trip;
  onEdit: (trip: Trip) => void;
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
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">

      {/* Destination + dates */}
      <div>
        <h3 className="font-semibold text-gray-900">{trip.destination}</h3>
        <p className="text-sm text-gray-500">
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
        </p>
      </div>

      {/* Vibe + weather */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">
          {trip.vibe}
        </span>
        {avgTemp !== null && (
          <span className="text-xs text-gray-400">{avgTemp}°C avg</span>
        )}
      </div>

      {/* Activities */}
      {trip.activities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trip.activities.map((activity) => (
            <span
              key={activity}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize"
            >
              {activity}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/CapsulePage?tripId=${trip.id}`}
          className="rounded px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors"
        >
          Plan wardrobe
        </Link>
        <Button variant="secondary" onClick={() => onEdit(trip)}>Edit</Button>
        <Button variant="danger" onClick={() => onDelete(trip.id)}>Delete</Button>
      </div>

    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
