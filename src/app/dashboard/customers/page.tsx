'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Receipt, ShoppingBag, Users } from 'lucide-react';

import { api, toastApiError } from '@/lib/api';
import { formatINR, formatDate, shortId } from '@/lib/format';
import {
  Card,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  Pagination,
  Reveal,
  SearchInput,
  Select,
  SkeletonTable,
  Spinner,
  StatusBadge,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  Toggle,
} from '@/components/ui';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

interface CustomerOrder {
  _id: string;
  total: number;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: { quantity: number; price: number; product?: { name?: string } }[];
}

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Client-side filter + pager. The list endpoint returns every customer, as it
  // always has — no API contract change here.
  const [query, setQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [page, setPage] = useState(1);

  // Which row's toggle-status request is currently in flight.
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Order-history modal state. `viewingCustomer` outlives `historyOpen` so the
  // modal's exit animation doesn't play against an emptied header.
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Declared before the effect that calls it: referencing a `const` arrow
  // function from above its initialiser is a temporal-dead-zone read, which the
  // React Compiler flags.
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/users/admin/customers');
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      toastApiError(err, 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The compiler can't see that every setState here lands after an await;
    // fetching on mount is the external-system sync effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleCustomerStatus = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await api.put(`/users/admin/customers/${id}/toggle-status`, {});
      if (res.data.success) {
        // Same as before: the row only flips once the server confirms.
        setCustomers((prev) =>
          prev.map((customer) =>
            customer._id === id
              ? { ...customer, isActive: !customer.isActive }
              : customer
          )
        );
      }
    } catch (err) {
      toastApiError(err, 'Failed to update customer status.');
    } finally {
      setTogglingId(null);
    }
  };

  const openOrderHistory = async (customer: Customer) => {
    setViewingCustomer(customer);
    setHistoryOpen(true);
    setOrders([]);
    setOrdersLoading(true);
    try {
      const res = await api.get(`/payments/admin/customers/${customer._id}/orders`);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      toastApiError(err, 'Could not load this customer’s orders.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (accessFilter !== 'all' && customer.isActive !== (accessFilter === 'active')) {
        return false;
      }
      if (!q) return true;
      return (
        customer.name?.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q)
      );
    });
  }, [customers, query, accessFilter]);

  const isFiltering = query.trim() !== '' || accessFilter !== 'all';

  // Clamp rather than reset: if a block/unblock or a filter shrinks the list
  // past the current page, fall back to the last page that still has rows.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <PageHeader
        eyebrow="The Register"
        title="Customers"
        description="Everyone who has registered with the house. Review what they have ordered, and grant or withdraw access to the store."
        action={
          loading ? undefined : (
            <p className="eyebrow text-faint">
              {customers.length} {customers.length === 1 ? 'Name' : 'Names'}
            </p>
          )
        }
      />

      <Reveal>
        {/* padded={false} + explicit padding: the Table primitive bleeds to the
            card edge with its own -mx-5 sm:-mx-6. */}
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search by name or email…"
              className="sm:max-w-xs w-full"
            />
            <div className="sm:w-[190px] w-full">
              <Select
                value={accessFilter}
                onChange={(e) => {
                  setAccessFilter(e.target.value as 'all' | 'active' | 'blocked');
                  setPage(1);
                }}
                aria-label="Filter by store access"
              >
                <option value="all">All customers</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </Select>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              eyebrow={isFiltering ? 'No matches' : 'Nothing here yet'}
              title={isFiltering ? 'No customers found' : 'No customers yet'}
              message={
                isFiltering
                  ? 'Nothing matches that search and filter. Try widening either.'
                  : 'Customers will appear here once they register.'
              }
              icon={<Users size={20} strokeWidth={1.5} aria-hidden />}
            />
          ) : (
            <>
              <Table>
                <THead>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th className="hidden md:table-cell">Phone</Th>
                  <Th className="hidden lg:table-cell">Joined</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </THead>
                <TBody>
                  {visible.map((customer) => {
                    const toggling = togglingId === customer._id;
                    return (
                      <Tr key={customer._id} muted={!customer.isActive}>
                        <Td>
                          <span className="flex items-center gap-3 min-w-0">
                            {/* Circles are the one place radius is allowed. */}
                            <span
                              aria-hidden
                              className="w-8 h-8 shrink-0 rounded-full bg-ink text-ivory flex items-center justify-center font-display font-light text-[14px] leading-none"
                            >
                              {customer.name?.trim().charAt(0).toUpperCase() || '?'}
                            </span>
                            <span className="truncate">{customer.name}</span>
                          </span>
                        </Td>
                        <Td className="text-muted">{customer.email}</Td>
                        <Td className="hidden md:table-cell text-muted whitespace-nowrap">
                          {customer.phone || '—'}
                        </Td>
                        <Td className="hidden lg:table-cell text-muted whitespace-nowrap">
                          {formatDate(customer.createdAt)}
                        </Td>
                        <Td>
                          <StatusBadge status={customer.isActive ? 'Active' : 'Blocked'} />
                        </Td>
                        <Td align="right">
                          <span className="flex items-center justify-end gap-3">
                            <IconButton
                              label={`View order history for ${customer.name}`}
                              onClick={() => openOrderHistory(customer)}
                            >
                              <ShoppingBag size={14} strokeWidth={1.5} aria-hidden />
                            </IconButton>
                            {/* Fixed slot so the row doesn't jump when the
                                spinner appears mid-request. */}
                            <span className="w-3.5 inline-flex justify-center shrink-0">
                              {toggling && <Spinner size={14} />}
                            </span>
                            <Toggle
                              checked={customer.isActive}
                              onChange={() => toggleCustomerStatus(customer._id)}
                              disabled={toggling}
                              label={
                                customer.isActive
                                  ? `Block ${customer.name}`
                                  : `Unblock ${customer.name}`
                              }
                            />
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>

              <Pagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
                itemLabel="customers"
              />
            </>
          )}
        </Card>
      </Reveal>

      {/* ── Order history ── */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        eyebrow="Order History"
        title={viewingCustomer?.name || 'Customer'}
        size="lg"
      >
        {viewingCustomer && (
          <p className="font-sans text-[13px] text-muted mb-5 break-words">
            {viewingCustomer.email}
          </p>
        )}

        {ordersLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="This customer hasn’t placed any orders."
            icon={<Receipt size={20} strokeWidth={1.5} aria-hidden />}
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {orders.map((order) => (
              <div key={order._id} className="py-5 first:pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-[13px] font-medium text-ink">
                      {shortId(order._id)}
                    </p>
                    <p className="eyebrow-tight text-faint mt-1">
                      {formatDate(order.createdAt)}
                      {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-display font-light text-xl leading-none text-ink">
                      {formatINR(order.total)}
                    </span>
                    <StatusBadge status={order.orderStatus} />
                  </div>
                </div>

                {order.items?.length ? (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {order.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex justify-between gap-4 font-sans text-[12px]"
                      >
                        <span className="text-muted min-w-0 truncate">
                          {item.product?.name || 'Product'} × {item.quantity}
                        </span>
                        <span className="text-muted shrink-0 tabular-nums">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
