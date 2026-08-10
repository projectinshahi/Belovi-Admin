'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Form controls.
 *
 * Surfaces alternate rather than stack: the page is ivory, cards are cream
 * (lighter), and controls sit back down on ivory so they read as recessed
 * inside a card. Hairline `line` border, `ink` on focus, square corners.
 *
 * Sizing note: 16px on mobile, 14px from `sm` up. Anything under 16px makes
 * iOS auto-zoom the viewport on focus, which is why the storefront uses
 * `text-base` — but 16px is too loose for a dense desktop form, so the two
 * breakpoints get different values.
 */

const controlBase =
  'w-full bg-ivory border text-ink placeholder:text-faint font-sans ' +
  'text-[16px] sm:text-[14px] px-3.5 py-2.5 ' +
  'transition-colors duration-200 ease-editorial ' +
  'focus:outline-none focus:border-ink ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const errorRing = 'border-danger';
const normalRing = 'border-line hover:border-ink/30';

/** Label + optional required mark + error/hint slot around any control. */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  error,
  hint,
  children,
  className = '',
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block font-sans text-[11px] uppercase tracking-[0.15em] text-muted mb-2"
        >
          {label}
          {required && <span className="text-bronze-deep ml-1">*</span>}
          {optional && (
            <span className="text-faint normal-case tracking-normal ml-1.5">
              (optional)
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="font-sans text-[12px] text-danger mt-1.5">{error}</p>
      ) : hint ? (
        <p className="font-sans text-[12px] text-faint mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(function Input({ error, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={`${controlBase} ${error ? errorRing : normalRing} ${className}`}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(function Textarea({ error, className = '', rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={error || undefined}
      className={`${controlBase} resize-y leading-relaxed ${error ? errorRing : normalRing} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(function Select({ error, className = '', children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={error || undefined}
        className={`${controlBase} appearance-none pr-9 cursor-pointer ${error ? errorRing : normalRing} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  );
});

/**
 * Checkbox styled as a square hairline box with an ink fill — the storefront's
 * selection idiom (see its radio dots) squared off.
 */
export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <span className="relative flex items-center shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer appearance-none w-4 h-4 border border-line bg-ivory cursor-pointer transition-colors duration-200 ease-editorial checked:bg-ink checked:border-ink disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute left-0.5 top-0.5 w-3 h-3 text-ivory opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
        >
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block font-sans text-[13px] text-ink leading-snug">
          {label}
        </span>
        {description && (
          <span className="block font-sans text-[12px] text-faint mt-0.5 leading-snug">
            {description}
          </span>
        )}
      </label>
    </div>
  );
}

/** Sliding switch for immediate-effect toggles (e.g. block a customer). */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-300 ease-editorial disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-forest border-forest' : 'bg-sand border-line'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-ivory transition-transform duration-300 ease-editorial ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
