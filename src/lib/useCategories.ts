'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * The active category names the studio created in Category Management.
 *
 * `null` while the request is in flight, so a caller can tell "not loaded yet"
 * from "none created" — a product already filed under a studio category must not
 * be treated as invalid during the fetch.
 *
 * These are offered alongside the fixed `SHOP_CATEGORIES`; the backend accepts
 * the same union, so this drives the dropdown but is not the gate.
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
      // A failure leaves only the fixed categories on offer; the 401 path already
      // toasts and redirects, and any other failure surfaces when a save is refused.
      .catch(() => {
        if (!cancelled) setNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}
