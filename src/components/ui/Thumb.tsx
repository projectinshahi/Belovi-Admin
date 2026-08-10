'use client';

import { useState } from 'react';
import { assetUrl } from '@/lib/api';

/**
 * Image tile with the storefront's branded degradation: when a src is missing
 * or fails, fall back to the warm gradient placeholder with a tracked wordmark
 * instead of a broken-image icon. Pages previously each rebuilt the backend
 * origin inline to construct these URLs; `assetUrl` does it once.
 */
/**
 * Could this string ever load as an image?
 *
 * The product form's "Or provide Image URLs" field is free text, so values like
 * `GOOGLE.COM` get stored alongside real uploads. Being first in the array, they
 * became the thumbnail — a piece with good photography rendered as a
 * placeholder. Mirrors `isUsableImageRef` in the storefront's lib/product.ts.
 */
export function isUsableImageRef(url?: string | null): boolean {
  if (!url) return false;
  const s = url.trim();
  if (!s) return false;
  if (s.startsWith('blob:') || s.startsWith('data:')) return true;
  if (s.startsWith('/')) return true;
  return /^https?:\/\/.+/i.test(s);
}

export default function Thumb({
  src,
  alt,
  className = 'w-12 h-12',
  ratio,
  label = 'BELOVI',
}: {
  /**
   * A `/uploads/...` path, an absolute URL, a blob: preview — or a list of
   * candidates, tried in order. Pass the whole gallery and the first one that
   * actually loads wins, so one dead entry can't hide a real photograph.
   */
  src?: string | string[] | null;
  alt: string;
  /** Size classes; defaults to a 48px table thumbnail. */
  className?: string;
  /** Optional aspect class (e.g. "aspect-[3/4]") instead of fixed sizing. */
  ratio?: string;
  label?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);

  const candidates = (Array.isArray(src) ? src : [src])
    .filter(isUsableImageRef)
    .filter((u) => !failed.includes(u as string)) as string[];

  const next = candidates[0];
  // blob: previews from URL.createObjectURL must not be rewritten.
  const resolved = next?.startsWith('blob:') ? next : assetUrl(next);
  const show = Boolean(resolved);

  return (
    <div
      className={`relative overflow-hidden bg-sand border border-line shrink-0 ${ratio ?? ''} ${className}`}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          // Remount per candidate so a retry actually re-fires onError.
          key={next}
          src={resolved}
          alt={alt}
          loading="lazy"
          onError={() => setFailed((prev) => [...prev, next])}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="img-placeholder h-full w-full flex items-center justify-center">
          <span className="font-display uppercase tracking-[0.3em] text-[8px] text-ink/25 pl-[0.3em] select-none">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
