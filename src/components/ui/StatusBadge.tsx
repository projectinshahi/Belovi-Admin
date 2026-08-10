'use client';

/**
 * The single source of truth for what a status looks like.
 *
 * Previously every page reimplemented its own `getStatusStyle` switch and they
 * had drifted out of agreement — `shipped` rendered purple on the dashboard but
 * blue on customers, and `active`/`inactive` differed between categories and
 * products. One map now serves all of them.
 *
 * Presentation is the storefront's tracked-caps label, plus a soft tinted chip
 * the storefront never needed: admin tables are scanned vertically, and colour
 * alone at 10px isn't enough of a target to catch the eye.
 */

export type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const tones: Record<Tone, string> = {
  success: 'bg-success-tint text-success border-success/20',
  warning: 'bg-warning-tint text-warning border-warning/25',
  info: 'bg-info-tint text-info border-info/20',
  danger: 'bg-danger-tint text-danger border-danger/20',
  neutral: 'bg-sand text-muted border-line',
};

/**
 * Status → tone. Keys are lowercased before lookup, so callers can pass raw API
 * values. Unknown statuses fall back to neutral rather than throwing.
 */
const STATUS_TONES: Record<string, Tone> = {
  // Order lifecycle
  pending: 'neutral',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
  canceled: 'danger',
  refunded: 'danger',
  // Payment
  paid: 'success',
  completed: 'success',
  failed: 'danger',
  // Entity state
  active: 'success',
  inactive: 'neutral',
  draft: 'neutral',
  blocked: 'danger',
  suspended: 'danger',
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[(status || '').toLowerCase()] ?? 'neutral';
}

export default function StatusBadge({
  status,
  tone,
  className = '',
}: {
  status: string;
  /** Override the mapped tone when a status is contextual. */
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? statusTone(status);
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 eyebrow-tight whitespace-nowrap ${tones[resolved]} ${className}`}
    >
      {status}
    </span>
  );
}
