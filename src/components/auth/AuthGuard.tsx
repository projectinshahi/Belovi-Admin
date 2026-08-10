'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_TOKEN_KEY } from '@/lib/adminSession';
import Spinner from '@/components/ui/Spinner';

/**
 * Client-side session gate. `proxy.ts` already blocks unauthenticated requests
 * server-side; this stops protected content flashing before that resolves.
 *
 * The token is read inside an effect, deliberately. It looks like a job for
 * `useSyncExternalStore`, but that returns the *server* snapshot on the first
 * client render during hydration — which for localStorage is always null. The
 * redirect below would then fire on every hard navigation before the real token
 * was ever read, bouncing deep links to the dashboard. An effect runs after
 * hydration, so what it reads is the truth.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      router.push('/admin-login');
      return;
    }
    // Reading localStorage is only possible post-hydration; see the note above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthenticated(true);
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-ivory">
        <Spinner size={28} />
        <p className="eyebrow text-faint">BELOVI Admin</p>
      </div>
    );
  }

  return <>{children}</>;
}
