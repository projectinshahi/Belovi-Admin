'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Mail, Search, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Pagination,
  Reveal,
  SearchInput,
  Skeleton,
  SkeletonTable,
  StatusBadge,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
} from '@/components/ui';
import { api, toastApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface ISubscriber {
  _id: string;
  email: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
}

const PAGE_SIZE = 25;

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<ISubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<ISubscriber | null>(null);
  // Separate from `target`: closing clears the flag but keeps the subscriber,
  // so the dialog copy survives its own exit animation. (A ref would too, but
  // reading one during render isn't reactive and the compiler rejects it.)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auth headers and 401/403 handling now live in the shared `api` client's
  // interceptors — this page no longer spells its own copy of either.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/newsletter/admin');
        if (res.data.success) setSubscribers(res.data.data);
      } catch (err) {
        toastApiError(err, 'Could not load subscribers.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtering stays client-side over the full list, exactly as before — no
  // change to the API contract.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, query]);

  // Clamp rather than reset: removing the last row of the last page should step
  // back a page, not throw you to the top of the list.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset paging where the interaction happens rather than syncing it in an
  // effect — a new query should always land you on page one.
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/newsletter/admin/${target._id}`);
      if (res.data.success) {
        toast.success('Subscriber removed');
        setSubscribers((prev) => prev.filter((s) => s._id !== target._id));
        setConfirmOpen(false);
      }
    } catch (err) {
      toastApiError(err, 'Could not remove the subscriber.');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Unchanged export: same columns, same quoting, same filename, same
   * locale-formatted date. Deliberately NOT `formatDate` — that would rewrite
   * the CSV's date column. Always exports the full list, not the current
   * search or page.
   */
  const exportCsv = () => {
    if (subscribers.length === 0) return;
    const rows = [
      ['Email', 'Source', 'Status', 'Subscribed On'],
      ...subscribers.map((s) => [
        s.email,
        s.source || '',
        s.isActive ? 'Active' : 'Inactive',
        new Date(s.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="The Register"
        title="Newsletter"
        description="Everyone who asked to hear from the studio. Export the list, or remove an address on request."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={subscribers.length === 0}
          >
            <Download size={13} aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Reveal>
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="eyebrow text-bronze-deep mb-1.5">Subscribers</p>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="font-display font-light text-3xl leading-none text-ink tabular-nums">
                  {subscribers.length}
                </p>
              )}
            </div>

            <SearchInput
              value={query}
              onChange={changeQuery}
              placeholder="Search by email…"
              className="w-full sm:w-72"
            />
          </div>

          {loading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            subscribers.length === 0 ? (
              <EmptyState
                icon={<Mail size={18} aria-hidden />}
                title="No subscribers yet"
                message="Addresses collected from the storefront's sign-up will appear here."
              />
            ) : (
              <EmptyState
                eyebrow="No matches"
                icon={<Search size={18} aria-hidden />}
                title="Nothing found"
                message={`No subscriber matches “${query.trim()}”.`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                }
              />
            )
          ) : (
            <>
              <Table>
                <THead>
                  <Th>Email</Th>
                  <Th className="hidden lg:table-cell">Source</Th>
                  <Th>Status</Th>
                  <Th className="hidden md:table-cell">Subscribed</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </THead>
                <TBody>
                  {visible.map((s) => (
                    <Tr key={s._id} muted={!s.isActive}>
                      <Td>{s.email}</Td>
                      <Td className="hidden lg:table-cell text-muted">
                        {s.source || '—'}
                      </Td>
                      <Td>
                        <StatusBadge status={s.isActive ? 'Active' : 'Inactive'} />
                      </Td>
                      <Td className="hidden md:table-cell text-muted whitespace-nowrap">
                        {formatDate(s.createdAt)}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end">
                          <IconButton
                            label={`Remove ${s.email}`}
                            tone="danger"
                            onClick={() => {
                              setTarget(s);
                              setConfirmOpen(true);
                            }}
                          >
                            <Trash2 size={14} aria-hidden />
                          </IconButton>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>

              <Pagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
                itemLabel="subscribers"
              />
            </>
          )}
        </Card>
      </Reveal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Remove subscriber?"
        message={`${target?.email || 'This address'} will be removed from the newsletter list. This cannot be undone.`}
        confirmLabel="Remove"
        loading={deleting}
        tone="danger"
      />
    </>
  );
}
