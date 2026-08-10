'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Field, Input, Reveal } from '@/components/ui';
import Logo from '@/components/ui/Logo';
import { setAdminSession } from '@/lib/adminSession';

/**
 * Turn a failed login into something the reader can act on.
 *
 * `axios` rejects on every non-2xx, so the previous blanket catch reported a
 * wrong password, a rate-limit and a genuinely dead server all as "Connection
 * refused. Is the backend server running?".
 */
function loginErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err) || !err.response) {
    // No response at all: DNS, refused connection, CORS, or the URL is wrong
    // because NEXT_PUBLIC_BACKEND_URL is unset.
    return 'Could not reach the server. Check that the backend is running.';
  }

  const status = err.response.status;
  const serverMessage = (err.response.data as { message?: string } | undefined)?.message;

  if (status === 401 || status === 400) return serverMessage || 'Invalid email or password.';
  if (status === 403) return serverMessage || 'This account cannot access the studio.';
  if (status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  if (status >= 500) return 'The server had a problem signing you in. Please try again.';
  return serverMessage || 'Could not sign you in. Please try again.';
}

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Backfill the session cookie for sessions created before the cookie
      // existed, so the middleware recognises them instead of looping back here.
      const user = localStorage.getItem('adminUser');
      setAdminSession(token, user ? JSON.parse(user) : null);
      router.push('/dashboard');
    }
  }, [router]);

  // This is the one page that legitimately talks to the backend with raw axios
  // rather than the shared `api` client: that client's 401 interceptor clears
  // the session and redirects here, which on the login page itself would mean a
  // failed sign-in bounces the page instead of showing "invalid credentials".
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/auth/login`, { email, password }, { withCredentials: true });
      const data = res.data;

      if (data.success) {
        setAdminSession(data.data.token, data.data);

        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      // The backend answers a bad password with 401 and a throttled client with
      // 429 — axios rejects on both. Reporting every rejection as "connection
      // refused" told you to go debug a server that was answering fine.
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row">
      {/* ── Left: editorial panel. No studio photography exists yet, so the
             warm placeholder gradient carries the panel on its own. ── */}
      <div className="img-placeholder relative hidden md:block md:w-1/2">
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 lg:p-20 pointer-events-none">
          <p className="eyebrow text-bronze-deep mb-4">BELOVI Admin</p>
          <p className="font-display font-light text-2xl md:text-3xl leading-[1.15] text-ink max-w-sm">
            Every piece is counted, corrected and put right here — long before
            anyone sees it.
          </p>
        </div>
      </div>

      {/* ── Right: sign-in form ── */}
      <div className="md:w-1/2 flex flex-col justify-center px-6 py-16 sm:px-10 md:p-16 lg:p-24">
        <Reveal className="max-w-md mx-auto w-full">
          {/* Ink mark: this half sits on ivory, where the gold washes out. */}
          <div className="mb-12">
            <Logo tone="ink" priority className="h-[30px]" />
            <span className="block eyebrow-tight text-bronze-deep mt-2.5">Studio</span>
          </div>

          <p className="eyebrow text-bronze-deep mb-5">Studio Access</p>

          <h1 className="font-display font-light text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] text-ink mb-4">
            Welcome back.
          </h1>

          <p className="font-sans text-muted text-base leading-relaxed mb-10">
            Sign in to manage pieces, orders and the people they go to.
          </p>

          {error && (
            <div
              role="alert"
              className="bg-danger-tint border border-danger/20 text-danger font-sans text-[13px] leading-relaxed px-4 py-3 mb-8"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            <Field label="Email" htmlFor="email" error={fieldErrors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@belovi.in"
                value={email}
                error={!!fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={fieldErrors.password}>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11"
                  value={password}
                  error={!!fieldErrors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center text-faint hover:text-ink transition-colors duration-200 ease-editorial cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden />
                  ) : (
                    <Eye size={16} aria-hidden />
                  )}
                </button>
              </div>
            </Field>

            <div className="pt-2">
              <Button type="submit" variant="solid" loading={loading} className="w-full">
                {loading ? 'Signing in' : 'Sign In'}
              </Button>
            </div>
          </form>

          <p className="font-sans text-[12px] text-faint leading-relaxed mt-10 pt-8 border-t border-line">
            This panel is for BELOVI studio staff. If you have arrived here by
            mistake, no account will be created for you.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
