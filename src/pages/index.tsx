import type { NextPage } from 'next';
import Link from 'next/link';

const Home: NextPage = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Travel Capsule</h1>
      <p className="text-gray-600 mb-8">Your minimal travel wardrobe planner.</p>
      <nav className="flex gap-4">
        <Link href="/ClosetPage" className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800">
          My Closet
        </Link>
        <Link href="/TripPage" className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800">
          My Trips
        </Link>
      </nav>
    </main>
  );
};

export default Home;
