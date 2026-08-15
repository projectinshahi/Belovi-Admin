'use client';

import { useState, useEffect } from 'react';
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Layers,
  Image as ImageIcon,
  Users,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

import { api, toastApiError } from '@/lib/api';
import { formatINR, formatDate, shortId } from '@/lib/format';
import {
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Reveal,
  SkeletonStat,
  SkeletonTable,
  StatusBadge,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
} from '@/components/ui';

interface RecentOrder {
  _id: string;
  user?: { name: string; email: string };
  total: number;
  orderStatus: string;
  createdAt: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalBanners: number;
  totalCustomers: number;
  recentOrders: RecentOrder[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Shared client: baseURL already carries /v1, and the Bearer token plus
        // 401/403 handling live in the interceptors — not here.
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        toastApiError(err, 'Could not load dashboard stats.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // The same six figures from the same response fields — only the presentation
  // changed. Em-dash rather than a zero when the fetch failed: an unknown
  // figure must not read as a real one.
  const tiles: { label: string; value: string; icon: LucideIcon }[] = [
    {
      label: 'Total Revenue',
      value: stats ? formatINR(stats.totalRevenue) : '—',
      icon: IndianRupee,
    },
    {
      label: 'Total Orders',
      value: stats ? String(stats.totalOrders) : '—',
      icon: ShoppingBag,
    },
    {
      label: 'Products',
      value: stats ? String(stats.totalProducts) : '—',
      icon: Package,
    },
    {
      label: 'Categories',
      value: stats ? String(stats.totalCategories) : '—',
      icon: Layers,
    },
    {
      label: 'Banners',
      value: stats ? String(stats.totalBanners) : '—',
      icon: ImageIcon,
    },
    {
      label: 'Customers',
      value: stats ? String(stats.totalCustomers) : '—',
      icon: Users,
    },
  ];

  const recentOrders = stats?.recentOrders ?? [];

  return (
    <>
      <PageHeader
        eyebrow="The Studio"
        title="Overview"
        description="The house at a glance — trade, catalogue, and the most recent orders to come through."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? tiles.map((tile) => <SkeletonStat key={tile.label} />)
          : tiles.map((tile, i) => (
              <Reveal key={tile.label} delay={i * 0.05}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="eyebrow text-bronze-deep mb-3">{tile.label}</p>
                      <p className="font-display font-light text-4xl leading-none text-ink">
                        {tile.value}
                      </p>
                    </div>
                    <tile.icon
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden
                      className="text-faint shrink-0"
                    />
                  </div>
                </Card>
              </Reveal>
            ))}
      </div>

      {/* padded={false} + explicit padding: the Table primitive bleeds to the
          card edge with its own -mx-5 sm:-mx-6. */}
      <Card padded={false} className="p-5 sm:p-6 mt-6">
        <CardHeader
          eyebrow="Fulfilment"
          title="Recent Transactions"
          className="mb-5"
          action={
            <ButtonLink href="/dashboard/orders" variant="ghost" size="sm" arrow>
              View all orders
            </ButtonLink>
          }
        />

        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : recentOrders.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            message="Orders will appear here as soon as the first one is placed."
            icon={<Receipt size={20} strokeWidth={1.5} aria-hidden />}
          />
        ) : (
          <Table>
            <THead>
              <Th>Order ID</Th>
              <Th>Customer</Th>
              <Th align="right">Amount</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Date</Th>
            </THead>
            <TBody>
              {recentOrders.map((order) => (
                <Tr key={order._id}>
                  <Td className="font-medium whitespace-nowrap">
                    {shortId(order._id)}
                  </Td>
                  <Td className="text-muted">{order.user?.name || 'Unknown'}</Td>
                  <Td align="right" className="whitespace-nowrap">
                    {formatINR(order.total)}
                  </Td>
                  <Td>
                    <StatusBadge status={order.orderStatus} />
                  </Td>
                  <Td className="hidden md:table-cell text-muted whitespace-nowrap">
                    {formatDate(order.createdAt)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
