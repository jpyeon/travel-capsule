// Dashboard — primary post-login landing.
// Lists trips and routes to TripPlannerPage for creation.

import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../hooks/useTrip';
import { TripCard } from '../components/trip/TripCard';
import { Button } from '../components/shared/Button';

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { trips, loading, error, deleteTrip } = useTrip(userId ?? '');

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <Button onClick={() => router.push('/TripPlannerPage')}>
          Create Trip
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-sand-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-sm text-red-600">Failed to load trips: {error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && trips.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-sand-200 bg-white py-20 text-center shadow-card">
          <p className="text-sm font-medium text-gray-700">No trips planned yet.</p>
          <p className="text-sm text-sand-500">Plan your first trip to get started.</p>
          <Button onClick={() => router.push('/TripPlannerPage')}>
            Create your first trip
          </Button>
        </div>
      )}

      {/* Trip grid */}
      {!loading && !error && trips.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={deleteTrip}
            />
          ))}
        </div>
      )}

    </main>
  );
};

export default DashboardPage;
