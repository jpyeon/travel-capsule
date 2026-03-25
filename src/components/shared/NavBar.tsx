import Link from 'next/link';
import { useRouter } from 'next/router';

const LINKS = [
  { href: '/ClosetPage', label: 'Closet' },
  { href: '/TripPage',   label: 'Trips' },
  { href: '/CapsulePage', label: 'Capsule' },
];

export function NavBar() {
  const { pathname } = useRouter();

  return (
    <nav className="border-b border-gray-200 bg-white px-8 py-3 flex items-center justify-between">
      <Link href="/" className="text-sm font-semibold tracking-tight text-gray-900">
        Travel Capsule
      </Link>
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
    </nav>
  );
}
