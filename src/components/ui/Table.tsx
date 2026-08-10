'use client';

import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

/**
 * Data table built from the storefront's list idiom — `divide-y divide-line`
 * hairlines, tracked-caps headers, no zebra striping, no outer grid, no radius.
 * The storefront has no <table> anywhere, so this is the one place the admin
 * genuinely extends the language rather than porting it.
 *
 * Responsive strategy: the table scrolls horizontally inside its own container
 * so the page body never does. Pages should additionally drop non-essential
 * columns at small breakpoints with `hidden md:table-cell` on both the Th and
 * the matching Td.
 */

export function Table({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto thin-scrollbar -mx-5 sm:-mx-6">
      <div className="inline-block min-w-full align-middle px-5 sm:px-6">
        <table className={`min-w-full border-collapse ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Th({
  children,
  className = '',
  align = 'left',
  ...rest
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
} & ThHTMLAttributes<HTMLTableCellElement>) {
  const alignment =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      scope="col"
      className={`eyebrow-tight text-faint font-medium whitespace-nowrap py-3 px-4 first:pl-0 last:pr-0 ${alignment} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tr({
  children,
  onClick,
  className = '',
  muted = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Dim terminal-state rows, as the storefront dims delivered/cancelled orders. */
  muted?: boolean;
}) {
  const interactive = onClick
    ? 'cursor-pointer hover:bg-ivory transition-colors duration-200 ease-editorial'
    : '';
  return (
    <tr
      onClick={onClick}
      className={`${interactive} ${muted ? 'opacity-60' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = '',
  align = 'left',
  ...rest
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
} & TdHTMLAttributes<HTMLTableCellElement>) {
  const alignment =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <td
      className={`font-sans text-[13px] text-ink py-4 px-4 first:pl-0 last:pr-0 align-middle ${alignment} ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}

export default Table;
