'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, ArrowUpRight } from 'lucide-react';
import {
  getAdminUser,
  getAdminUserServerSnapshot,
  subscribeToAdminUser,
} from '@/lib/adminSession';
import { navItemForPath } from './navigation';

interface NavbarProps {
  onMenuClick: () => void;
}

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://belovi.in';

/**
 * Slim top bar. The page title now lives in each page's PageHeader, so this
 * carries only what the sidebar can't: the mobile menu trigger, the current
 * section on mobile (where the sidebar is hidden), a link out to the live
 * storefront, and who is signed in.
 */
export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();

  // localStorage is an external store: null on the server, real after hydration,
  // and re-read if another tab signs out.
  const user = useSyncExternalStore(
    subscribeToAdminUser,
    getAdminUser,
    getAdminUserServerSnapshot
  );

  const section = navItemForPath(pathname);
  const name = user?.name?.trim() || 'Studio';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="bg-ivory border-b border-line h-[68px] lg:h-[76px] flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="lg:hidden w-9 h-9 -ml-1 shrink-0 flex items-center justify-center border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
        >
          <Menu size={16} />
        </button>

        {/* Desktop shows the section in the sidebar already; this is for mobile. */}
        {section && (
          <p className="lg:hidden eyebrow-tight text-muted truncate">
            {section.title}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 eyebrow-tight text-muted hover:text-ink transition-colors duration-300 ease-editorial"
        >
          View Storefront
          <ArrowUpRight size={12} aria-hidden />
        </a>

        <span aria-hidden className="hidden sm:block h-5 w-px bg-line" />

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="font-sans text-[12px] text-ink leading-tight">{name}</p>
            <p className="eyebrow-tight text-faint mt-0.5">
              {user?.role || 'Administrator'}
            </p>
          </div>
          <div
            aria-hidden
            className="w-9 h-9 rounded-full bg-ink text-ivory flex items-center justify-center font-display text-[15px] shrink-0"
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
