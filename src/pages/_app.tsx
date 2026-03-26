import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { NavBar } from '../components/shared/NavBar';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" richColors />
      <div className="min-h-screen bg-sand-50">
        <NavBar />
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </div>
    </AuthProvider>
  );
}
