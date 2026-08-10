// Shared formatters. Mirrors Belovi-frontend/src/lib/product.ts so a price
// renders identically in the storefront and the studio.

/** ₹1,23,456 — Indian digit grouping, no decimals. */
export function formatINR(amount: number): string {
  return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
}

/** 16 Jul 2026 */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** 16 Jul 2026 · 4:30 PM */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${formatDate(date)} · ${time}`;
}

/** Short id for display: #a1b2c3d4 */
export function shortId(id: string): string {
  return `#${(id || '').substring(0, 8)}`;
}
