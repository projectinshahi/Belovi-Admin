'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * The active category names from Category Management — every category there is.
 *
 * `null` while the request is in flight, so a caller can tell "not loaded yet"
 * from "none created" — a product already filed under a category must not be
 * treated as invalid during the fetch.
 *
 * This drives the dropdowns but is not the gate: the backend validates a
 * product's category against the same collection.
 */
export function useCategoryNames(): string[] | null {
  const [names, setNames] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/categories')
      .then((r) => {
        const docs: { name?: string; status?: string }[] = Array.isArray(r.data?.data)
          ? r.data.data
          : [];
        if (cancelled) return;
        setNames(
          docs.filter((c) => c.name && c.status !== 'INACTIVE').map((c) => c.name as string)
        );
      })
      // A failure leaves only the guaranteed categories on offer; the 401 path
      // already toasts and redirects, and any other failure surfaces when a save
      // is refused.
      .catch(() => {
        if (!cancelled) setNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}
