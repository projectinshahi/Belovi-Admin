'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, PackageSearch } from 'lucide-react';
import { api, toastApiError } from '@/lib/api';
import { formatINR, formatDate, formatDateTime, shortId } from '@/lib/format';
import {
  Card,
  PageHeader,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  Modal,
  Select,
  StatusBadge,
  Spinner,
  SkeletonTable,
  EmptyState,
  SearchInput,
  Pagination,
  Reveal,
  Thumb,
  IconButton,
} from '@/components/ui';

interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
    variants?: { volume: string; price: number }[];
  };
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

/**
 * The backend's `orderStatus` enum, verbatim — see Belovi-Backend
 * `src/models/Order.ts`. Unchanged from what this page already offered.
 *
 * `pending` is deliberately absent: it is a *payment* status, never an order
 * status. The switch this file used to carry had a `pending` case, but the
 * select never offered it and the schema does not allow it. That matters more
 * than it looks — the admin update runs `findByIdAndUpdate` without
 * `runValidators`, so Mongoose would NOT reject an out-of-enum value; it would
 * persist silently. This list is the only thing keeping that honest.
 */
const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Delivered and cancelled are done with — the storefront dims terminal records. */
const TERMINAL_STATUSES: readonly string[] = ['delivered', 'cancelled'];

const PAGE_SIZE = 20;

/** Eyebrow-over-value: the system's smallest unit of labelled data. */
function Detail({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow-tight text-faint mb-1.5">{label}</p>
      <div className="font-sans text-[13px] text-ink leading-relaxed break-words">
        {children}
      </div>
    </div>
  );
}

/** A titled block inside the detail modal, opened by a hairline. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <p className="eyebrow text-bronze-deep mb-4">{title}</p>
      {children}
    </section>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [page, setPage] = useState(1);

  // Narrowing the results can strand you past the last page, so both filter
  // controls reset to page one. Done in the handlers rather than an effect —
  // this is a consequence of the interaction, not state to synchronise.
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeStatusFilter = (value: 'all' | OrderStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Auth headers and 401/403 handling now live in the shared client's
  // interceptors — clear session, toast, redirect — so this page no longer
  // carries its own copy.
  // No `setLoading(true)` here: it starts true, and setting it synchronously in
  // the mount effect is what the React Compiler's set-state-in-effect rule
  // (correctly) objects to. Everything below runs after the await.
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/payments/admin/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      toastApiError(err, 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The compiler can't see that every setState here lands after an await;
    // fetching on mount is the external-system sync effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (updatingOrderId === id) return; // Prevent duplicate requests

    try {
      setUpdatingOrderId(id);
      const res = await api.put(`/payments/admin/orders/${id}/status`, {
        orderStatus: newStatus,
      });

      if (res.data.success) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === id ? { ...order, orderStatus: newStatus } : order
          )
        );
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (err) {
      toastApiError(err, 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filtering stays client-side over the already-fetched list, exactly as
  // before — no new query parameters reach the API.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.orderStatus !== statusFilter) return false;
      if (!q) return true;
      // Match the raw id so both the displayed short id and a full id work.
      return (
        order._id.toLowerCase().includes(q) ||
        (order.user?.name || '').toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Derived from `orders`, not held in state, so an inline status change is
  // reflected in the open modal.
  //
  // Closing clears `detailOpen` but deliberately leaves `selectedOrder` set, so
  // the panel keeps its content while it animates out rather than blanking
  // mid-fade. (Stashing the last order in a ref would also work, but reading a
  // ref during render isn't reactive and the React Compiler rejects it.)
  const modalOrder = orders.find((o) => o._id === selectedOrder) ?? null;

  const isSearching = query.trim() !== '' || statusFilter !== 'all';

  return (
    <>
      <PageHeader
        eyebrow="Fulfilment"
        title="Orders"
        description="Every order placed through the storefront, with its payment state and progress from processing to delivery."
      />

      <Reveal>
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <SearchInput
              value={query}
              onChange={changeQuery}
              placeholder="Search by order id or customer…"
              className="sm:max-w-xs w-full"
            />
            <div className="sm:w-[190px] w-full">
              <Select
                value={statusFilter}
                onChange={(e) => changeStatusFilter(e.target.value as 'all' | OrderStatus)}
                aria-label="Filter by order status"
              >
                <option value="all">All statuses</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={20} />}
              eyebrow={isSearching ? 'No matches' : 'Nothing here yet'}
              title={isSearching ? 'No orders match' : 'No orders yet'}
              message={
                isSearching
                  ? 'Try a different order id, customer name, or status.'
                  : 'Orders will appear here once customers place them.'
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th className="hidden md:table-cell">Date</Th>
                  <Th align="right">Total</Th>
                  <Th className="hidden md:table-cell">Payment</Th>
                  <Th>Status</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </THead>
                <TBody>
                  {paged.map((order) => {
                    const updating = updatingOrderId === order._id;
                    return (
                      <Tr
                        key={order._id}
                        muted={TERMINAL_STATUSES.includes(order.orderStatus)}
                      >
                        <Td>
                          <span className="block whitespace-nowrap">
                            {shortId(order._id)}
                          </span>
                          <span className="block text-[12px] text-faint mt-0.5 whitespace-nowrap">
                            {order.items.length}{' '}
                            {order.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </Td>

                        <Td>
                          <span className="block">{order.user?.name || 'Unknown'}</span>
                          <span className="block text-[12px] text-muted mt-0.5">
                            {order.user?.email || ''}
                          </span>
                        </Td>

                        <Td className="hidden md:table-cell text-muted whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </Td>

                        <Td align="right" className="whitespace-nowrap">
                          {formatINR(order.total)}
                        </Td>

                        <Td className="hidden md:table-cell">
                          <StatusBadge status={order.paymentStatus} />
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="w-[150px]">
                              <Select
                                value={order.orderStatus}
                                onChange={(e) =>
                                  handleStatusChange(order._id, e.target.value)
                                }
                                disabled={updating}
                                aria-label={`Order status for ${shortId(order._id)}`}
                              >
                                {ORDER_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            {/* Reserved slot — the row must not jump while saving. */}
                            <span className="w-4 shrink-0 flex items-center justify-center">
                              {updating && <Spinner size={14} />}
                            </span>
                          </div>
                        </Td>

                        <Td align="right">
                          <IconButton
                            label={`View order ${shortId(order._id)}`}
                            onClick={() => {
                              setSelectedOrder(order._id);
                              setDetailOpen(true);
                            }}
                            className="ml-auto"
                          >
                            <Eye size={15} />
                          </IconButton>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>

              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
                itemLabel="orders"
              />
            </>
          )}
        </Card>
      </Reveal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        eyebrow="Order detail"
        title={modalOrder ? shortId(modalOrder._id) : ''}
        size="lg"
      >
        {modalOrder && (
          <div className="space-y-5">
            <Section title="Order">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail label="Order ID" className="sm:col-span-2">
                  <span className="break-all">{modalOrder._id}</span>
                </Detail>
                <Detail label="Placed">{formatDateTime(modalOrder.createdAt)}</Detail>
                <Detail label="Order status">
                  <StatusBadge status={modalOrder.orderStatus} />
                </Detail>
                <Detail label="Payment method">{modalOrder.paymentMethod}</Detail>
                <Detail label="Payment status">
                  <StatusBadge status={modalOrder.paymentStatus} />
                </Detail>
                {modalOrder.razorpayOrderId && (
                  <Detail label="Razorpay ID" className="sm:col-span-2">
                    <span className="break-all">{modalOrder.razorpayOrderId}</span>
                  </Detail>
                )}
              </div>
            </Section>

            <Section title="Customer">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail label="Name">{modalOrder.user?.name || 'Unknown'}</Detail>
                <Detail label="Email">{modalOrder.user?.email || 'N/A'}</Detail>
                {modalOrder.user?.phone && (
                  <Detail label="Phone">{modalOrder.user.phone}</Detail>
                )}
              </div>
            </Section>

            <Section title="Shipping address">
              <address className="font-sans text-[13px] text-ink leading-relaxed not-italic">
                {modalOrder.shippingAddress?.street && (
                  <span className="block">{modalOrder.shippingAddress.street}</span>
                )}
                <span className="block">
                  {modalOrder.shippingAddress?.city}
                  {modalOrder.shippingAddress?.state
                    ? `, ${modalOrder.shippingAddress.state}`
                    : ''}
                </span>
                <span className="block">
                  {modalOrder.shippingAddress?.zipCode}
                  {modalOrder.shippingAddress?.country
                    ? `, ${modalOrder.shippingAddress.country}`
                    : ''}
                </span>
              </address>
            </Section>

            <Section title="Items">
              <ul className="divide-y divide-line -mt-1">
                {modalOrder.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <Thumb
                      src={item.product?.images?.[0]}
                      alt={item.product?.name || 'Product'}
                      className="w-12 h-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[13px] text-ink leading-snug">
                        {item.product?.name || 'Product unavailable'}
                      </p>
                      <p className="font-sans text-[12px] text-faint mt-0.5">
                        &times;{item.quantity}
                      </p>
                    </div>
                    <p className="font-sans text-[13px] text-ink whitespace-nowrap">
                      {formatINR(item.price)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Price breakdown">
              <dl className="font-sans text-[13px]">
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="text-ink">{formatINR(modalOrder.subtotal)}</dd>
                </div>
                {modalOrder.discount > 0 && (
                  <div className="flex items-baseline justify-between py-1.5 text-success">
                    <dt>Discount</dt>
                    <dd>&minus;{formatINR(modalOrder.discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="text-ink">
                    {modalOrder.shippingFee > 0
                      ? formatINR(modalOrder.shippingFee)
                      : 'Free'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line mt-3 pt-4">
                  <dt className="eyebrow text-bronze-deep">Total</dt>
                  <dd className="font-display font-light text-2xl text-ink leading-none">
                    {formatINR(modalOrder.total)}
                  </dd>
                </div>
              </dl>
            </Section>
          </div>
        )}
      </Modal>
    </>
  );
}
