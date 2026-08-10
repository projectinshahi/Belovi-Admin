'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Entrance wrapper, ported from the storefront — fade plus a slight rise on the
 * editorial curve. Shortened here: the storefront reveals on scroll at 0.8s
 * because you're browsing, whereas admin content appears above the fold and you
 * are waiting for it, so this animates on mount at 0.45s with a 12px rise.
 *
 * Honours prefers-reduced-motion by dropping the motion wrapper entirely.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 12,
  className,
  ...rest
}: {
  children: ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  y?: number;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'children'>) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
