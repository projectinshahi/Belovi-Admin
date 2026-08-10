'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal surface, matching the storefront's dialogs: ink scrim with a blur, an
 * ivory body ruled with `line`, an eyebrow-over-serif header, and a circular
 * close control (the one place radius is allowed).
 *
 * The admin previously inlined this markup six times. Beyond styling, this adds
 * the behaviour those copies were missing: Escape to close, background scroll
 * lock, focus moved into the dialog on open and restored on close, and proper
 * dialog semantics.
 */

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export default function Modal({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizes;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock background scroll while open.
  //
  // Setting `body { overflow: hidden }` alone is a no-op inside the dashboard:
  // that shell is `h-screen overflow-hidden` and the actual scroller is <main>.
  // So we flag the document and let globals.css freeze whichever element is
  // marked as the scroll container, which covers both the shell and the plain
  // body scrolling used outside it.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = document.body.style.overflow;
    root.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    return () => {
      root.classList.remove('modal-open');
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the dialog, and hand it back to the trigger on close.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      // Wait for the panel to mount before focusing it.
      const id = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    restoreFocusRef.current?.focus?.();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`relative bg-ivory border border-line w-full ${sizes[size]} flex flex-col overflow-hidden max-h-[90vh] focus:outline-none`}
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-line shrink-0">
              <div className="min-w-0">
                {eyebrow && <p className="eyebrow text-bronze-deep mb-1">{eyebrow}</p>}
                <h2 className="font-display font-light text-2xl leading-tight text-ink">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-line text-muted hover:text-ink hover:border-ink/30 transition-colors duration-300 ease-editorial"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto thin-scrollbar">{children}</div>

            {footer && (
              <div className="p-5 sm:p-6 border-t border-line shrink-0 flex flex-wrap items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
