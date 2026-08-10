import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/adminSession';

// Server-side gate for the admin panel. The client `AuthGuard` still validates
// the localStorage token; this adds a first line of defense so protected pages
// never render for a visitor without a session cookie.
//
// Next 16 renamed the `middleware` convention to `proxy` — same behaviour, and
// the dev server warns on the old name. Logic here is unchanged from the
// middleware.ts it replaces.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthenticated = request.cookies.has(ADMIN_COOKIE);
  const isLoginPage = pathname.startsWith('/admin-login');
  const isProtected = pathname === '/' || pathname.startsWith('/dashboard');

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
