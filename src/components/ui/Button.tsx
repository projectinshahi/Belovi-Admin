'use client';

import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Spinner from './Spinner';

/**
 * The storefront's Button, re-cut for admin density.
 *
 * Same contract — uppercase Inter, wide tracking, square corners, colour-only
 * transitions on the editorial curve — but on a tighter padding scale (the
 * storefront's `px-8 py-4` is too generous for a toolbar) and with two variants
 * a storefront never needed: `danger` for destructive actions and `ghost` for
 * low-emphasis controls sitting inside table rows.
 */

type Variant = 'solid' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const base =
  'group inline-flex items-center justify-center gap-2 font-sans uppercase tracking-[0.16em] ' +
  'transition-colors duration-300 ease-editorial cursor-pointer select-none ' +
  'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none';

const sizes: Record<Size, string> = {
  sm: 'text-[10px] px-4 py-2.5',
  md: 'text-[11px] px-6 py-3.5',
};

const variants: Record<Variant, string> = {
  // Primary action — soft-black fill, forest on hover (storefront's `solid`).
  solid: 'bg-ink text-ivory hover:bg-forest',
  // Secondary — the storefront's default editorial CTA.
  outline: 'border border-ink/70 text-ink hover:bg-ink hover:text-ivory',
  // Destructive — terracotta, never a Tailwind red.
  danger: 'bg-danger text-ivory hover:bg-danger-deep',
  // Low emphasis — for row-level and toolbar controls.
  ghost: 'text-muted hover:text-ink hover:bg-beige',
};

function Arrow() {
  return (
    <span
      aria-hidden
      className="inline-block transition-transform duration-300 ease-editorial group-hover:translate-x-0.5"
    >
      →
    </span>
  );
}

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
}

export function ButtonLink({
  href,
  children,
  variant = 'outline',
  size = 'md',
  arrow = false,
  className = '',
  ...rest
}: CommonProps & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  arrow = false,
  loading = false,
  className = '',
  disabled,
  ...rest
}: CommonProps & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={size === 'sm' ? 12 : 14} tone="current" />}
      {children}
      {arrow && !loading && <Arrow />}
    </button>
  );
}
