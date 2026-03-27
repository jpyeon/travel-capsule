import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

const LINKS = [
  { href: '/DashboardPage', label: 'Trips' },
  { href: '/ClosetPage',    label: 'Closet' },
  { href: '/ProfilePage',   label: 'Profile' },
];

export function NavBar() {
  const { pathname } = useRouter();
  const { user, userId, signOut } = useAuth();

  return (
    <nav className="border-b-2 border-sand-200 bg-white px-4 sm:px-8 py-3 flex items-center justify-between">
      <Link
        href="/"
        className="text-sm font-bold tracking-widest uppercase text-gray-900 hover:text-accent-600 transition-colors"
      >
        Travel Capsule
      </Link>

      <div className="flex items-center gap-6">
        {userId && (
          <ul className="flex items-center gap-6">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={[
                      'relative pb-0.5 text-sm transition-colors',
                      active
                        ? 'font-semibold text-accent-600 after:absolute after:inset-x-0 after:-bottom-[13px] after:h-0.5 after:bg-accent-500'
                        : 'text-gray-500 hover:text-gray-900',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {userId ? (
          <div className="flex items-center gap-3 border-l border-sand-200 pl-6">
            <span className="hidden sm:inline text-xs text-sand-500">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-sand-500 hover:text-gray-900 transition-colors"
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
