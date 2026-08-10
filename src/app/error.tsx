'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 mb-5 flex items-center justify-center border border-danger/30 bg-danger-tint text-danger">
        <AlertTriangle size={20} strokeWidth={1.5} />
      </div>
      <p className="eyebrow text-bronze-deep mb-2">Something broke</p>
      <h2 className="font-display font-light text-3xl text-ink leading-tight">
        This page didn&apos;t load
      </h2>
      <p className="font-sans text-[13px] text-muted mt-2 mb-7 max-w-sm leading-relaxed">
        An unexpected error occurred. Try again — if it keeps happening, the
        backend may be unreachable.
      </p>
      <Button variant="solid" size="sm" onClick={() => reset()}>
        Try Again
      </Button>
    </div>
  );
}
