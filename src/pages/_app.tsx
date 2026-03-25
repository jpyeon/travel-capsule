import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { NavBar } from '../components/shared/NavBar';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}
