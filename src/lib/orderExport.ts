/**
 * The Orders page's filter rule and its Excel export, in one place so the two
 * can never disagree: the table and the export both run `filterOrders`, and
 * the export receives the table's own result — every matching order across all
 * pages, not just the page on screen.
 *
 * No imports, so the self-check (orderExport.check.mjs) can run it directly.
 */

export interface ExportableOrder {
  _id: string;
  user?: { name?: string; email?: string; phone?: string } | null;
  items: { product?: { name?: string } | null; quantity: number; price: number; size?: string }[];
  shippingAddress?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string } | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  advanceAmount?: number;
  balanceAmount?: number;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

/**
 * The listing's filter, unchanged: status must match unless "all"; the search
 * matches the order id (full or the displayed short id, leading # optional) or
 * the customer's name, case-insensitively. Both conditions must hold.
 */
export function filterOrders<T extends ExportableOrder>(orders: T[], query: string, status: string): T[] {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  return orders.filter((order) => {
    if (status !== 'all' && order.orderStatus !== status) return false;
    if (!q) return true;
    return order._id.toLowerCase().includes(q) || (order.user?.name || '').toLowerCase().includes(q);
  });
}

export const EXPORT_COLUMNS = [
  'Order ID',
  'Order Date',
  'Customer Name',
  'Customer Email',
  'Customer Phone',
  'Items',
  'Total Quantity',
  'Subtotal (INR)',
  'Discount (INR)',
  'Shipping (INR)',
  'Total (INR)',
  'Payment Method',
  'Payment Status',
  'Paid Online (INR)',
  'Due on Delivery (INR)',
  'Order Status',
  'Street',
  'City',
  'State',
  'PIN Code',
  'Country',
  'Razorpay Order ID',
  'Razorpay Payment ID',
] as const;

/** 2026-10-24 14:05 in the admin's local time — a format Excel reads as a date. */
function excelDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * One CSV cell. Text is quoted, and text Excel would run as a formula (a
 * customer can type "=HYPERLINK(…)" as their name) is prefixed with an
 * apostrophe so it shows as text. Numbers stay bare so Excel can sum them.
 */
function cell(value: string | number | undefined | null): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = value ?? '';
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function orderRow(o: ExportableOrder): (string | number)[] {
  const a = o.shippingAddress || {};
  const items = o.items
    .map((i) => `${i.product?.name || 'Product unavailable'}${i.size ? ` (${i.size})` : ''} x${i.quantity} @ ${i.price}`)
    .join('; ');
  return [
    o._id,
    excelDate(o.createdAt),
    o.user?.name || 'Unknown',
    o.user?.email || '',
    o.user?.phone || '',
    items,
    o.items.reduce((n, i) => n + (i.quantity || 0), 0),
    o.subtotal ?? 0,
    o.discount ?? 0,
    o.shippingFee ?? 0,
    o.total ?? 0,
    o.paymentMethod || '',
    o.paymentStatus || '',
    o.advanceAmount ?? 0,
    o.balanceAmount ?? 0,
    o.orderStatus || '',
    a.street || '',
    a.city || '',
    a.state || '',
    a.zipCode || '',
    a.country || '',
    o.razorpayOrderId || '',
    o.razorpayPaymentId || '',
  ];
}

/**
 * The file's contents: a UTF-8 byte-order mark (so Excel shows ₹ and non-Latin
 * names correctly), the header, then one row per order in the order given.
 * CRLF line endings, as Excel expects.
 */
export function ordersToCsv(orders: ExportableOrder[]): string {
  const lines = [EXPORT_COLUMNS.map((c) => cell(c)), ...orders.map((o) => orderRow(o).map(cell))];
  return '﻿' + lines.map((l) => l.join(',')).join('\r\n');
}
