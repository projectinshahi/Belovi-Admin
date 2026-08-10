// Admin session helpers.
//
// The admin JWT lives in localStorage (used to authorize API calls). We ALSO
// mirror a lightweight presence cookie so Next.js `middleware.ts` — which runs
// on the server and cannot read localStorage — can gate the `/dashboard` routes
// before any client JS loads. The cookie is not the source of truth for API
// auth (that stays the Bearer token); it only signals "an admin is logged in".

export const ADMIN_TOKEN_KEY = 'adminToken';
export const ADMIN_USER_KEY = 'adminUser';
export const ADMIN_COOKIE = 'adminToken';

/** Persist the session after a successful login. */
export function setAdminSession(token: string, user: unknown) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  // 7-day cookie, matching the backend JWT lifetime. `SameSite=Lax` so top-level
  // navigations to /dashboard carry it; `Secure` only when served over HTTPS.
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ADMIN_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
}

export interface AdminUser {
  name?: string;
  email?: string;
  role?: string;
}

/**
 * The signed-in admin, or null. The Navbar used to hard-code "System Admin"
 * and an "S" avatar regardless of who was actually logged in.
 *
 * The parsed value is cached against its raw string so repeated calls return an
 * identical reference — `useSyncExternalStore` compares snapshots by identity
 * and would loop forever on a fresh object each read.
 */
let userCacheRaw: string | null = null;
let userCacheValue: AdminUser | null = null;

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (raw === userCacheRaw) return userCacheValue;

  userCacheRaw = raw;
  try {
    userCacheValue = raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    // A corrupt entry shouldn't take the whole panel down.
    userCacheValue = null;
  }
  return userCacheValue;
}

/** Server render has no localStorage; nothing is signed in there. */
export function getAdminUserServerSnapshot(): AdminUser | null {
  return null;
}

/** The raw JWT, or null. A string, so it's already identity-stable. */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminTokenServerSnapshot(): string | null {
  return null;
}

/**
 * Subscribe to session changes. `storage` only fires for *other* tabs, which is
 * exactly the case worth reacting to: signing out elsewhere shouldn't leave a
 * stale name in this tab's top bar.
 */
export function subscribeToAdminUser(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/** Clear the session on logout or auth failure. */
export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  document.cookie = `${ADMIN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
