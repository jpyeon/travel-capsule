import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home: NextPage = () => {
  const router = useRouter();
  const { userId, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    void router.replace(userId ? '/DashboardPage' : '/LoginPage');
  }, [userId, loading, router]);

  return (
    <main className="flex min-h-[80vh] items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </main>
  );
};

export default Home;
