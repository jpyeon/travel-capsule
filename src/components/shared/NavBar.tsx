import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

const LINKS = [
  { href: '/ClosetPage', label: 'Closet' },
  { href: '/TripPage',   label: 'Trips' },
  { href: '/CapsulePage', label: 'Capsule' },
];

export function NavBar() {
  const { pathname } = useRouter();
  const { user, userId, signOut } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white px-8 py-3 flex items-center justify-between">
      <Link href="/" className="text-sm font-semibold tracking-tight text-gray-900">
        Travel Capsule
      </Link>

      <div className="flex items-center gap-6">
        {userId && (
          <ul className="flex items-center gap-6">
            {LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'text-sm transition-colors',
                    pathname === href
                      ? 'font-medium text-gray-900'
                      : 'text-gray-500 hover:text-gray-900',
                  ].join(' ')}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {userId ? (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
            <span className="text-xs text-gray-500">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link href="/LoginPage" className="text-sm text-gray-500 hover:text-gray-900">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
