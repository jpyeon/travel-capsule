// Route-level component for the trip management view.
// Delegates data fetching and state to useTrip hook; no business logic here.
// TODO: implement — replace stub with full TripCard list + useTrip hook

import type { NextPage } from 'next';

const TripPage: NextPage = () => {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">My Trips</h1>
      <p className="text-gray-500 mt-2">Coming soon.</p>
    </main>
  );
};

export default TripPage;
