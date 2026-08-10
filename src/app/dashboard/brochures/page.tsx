'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { FileText, Pencil, Trash2, X } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  ImagePicker,
  Input,
  PageHeader,
  Reveal,
  SkeletonTable,
  StatusBadge,
  TBody,
  THead,
  Table,
  Td,
  Textarea,
  Th,
  Thumb,
  Tr,
} from '@/components/ui';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';

/**
 * Brochures / lookbooks offered for download on the storefront.
 *
 * A brochure is a PDF plus an optional cover. DRAFT keeps one out of the
 * storefront so an edition can be staged before its launch; `order` sets the
 * sequence of the cards on the homepage.
 */

interface IBrochure {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  coverImage?: string;
  fileSize?: number;
  order: number;
  status: 'DRAFT' | 'PUBLISHED';
}

/** Mirrors the 25 MB ceiling on the backend's brochure upload. */
const MAX_FILE_MB = 25;

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function BrochuresPage() {
  const [brochures, setBrochures] = useState<IBrochure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IBrochure | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('0');
  const [published, setPublished] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  /** The already-uploaded PDF when editing — replaced only if a new one is picked. */
  const [existingFileUrl, setExistingFileUrl] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const fetchBrochures = async () => {
    try {
      const res = await api.get('/brochures');
      if (res.data.success) setBrochures(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load brochures.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBrochures();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setOrder(String(brochures.length));
    setPublished(true);
    setCoverFile(null);
    setCoverUrl('');
    setPdf(null);
    setExistingFileUrl('');
    setFormOpen(true);
  };

  const openEdit = (b: IBrochure) => {
    setEditingId(b._id);
    setTitle(b.title);
    setDescription(b.description ?? '');
    setOrder(String(b.order ?? 0));
    setPublished(b.status === 'PUBLISHED');
    setCoverFile(null);
    setCoverUrl(b.coverImage ? assetUrl(b.coverImage) : '');
    setPdf(null);
    setExistingFileUrl(b.fileUrl);
    setFormOpen(true);
  };

  const pickPdf = (file?: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('The brochure must be a PDF.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`PDFs must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    setPdf(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('A title is required.');
    // A new brochure has no stored file to fall back on.
    if (!editingId && !pdf) return toast.error('A brochure PDF is required.');

    setSaving(true);
    const form = new FormData();
    form.append('title', title.trim());
    form.append('description', description.trim());
    form.append('order', String(Number(order) || 0));
    form.append('status', published ? 'PUBLISHED' : 'DRAFT');
    if (pdf) form.append('file', pdf);
    if (coverFile) form.append('coverImage', coverFile);
    else if (!coverUrl) form.append('coverImage', '');

    try {
      const res = editingId
        ? await api.put(`/brochures/${editingId}`, form)
        : await api.post('/brochures', form);
      if (res.data?.success) {
        toast.success(editingId ? 'Brochure updated' : 'Brochure added');
        setFormOpen(false);
        setEditingId(null);
        fetchBrochures();
      } else {
        toast.error(res.data?.message || 'Could not save the brochure.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the brochure.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/brochures/${deleteTarget._id}`);
      if (res.data?.success) {
        toast.success('Brochure deleted');
        setDeleteTarget(null);
        fetchBrochures();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete the brochure.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Brochures"
        description="Downloadable lookbooks and catalogues. Published brochures appear on the homepage; the section hides itself entirely when none are published."
        action={
          <Button variant="solid" size="sm" onClick={openAdd}>
            Add Brochure
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Reveal className={formOpen ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <Card padded={false} className="p-5 sm:p-6">
            {loading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : brochures.length === 0 ? (
              <EmptyState
                title="No brochures yet"
                message="Add a PDF lookbook or catalogue for visitors to download from the homepage."
                icon={<FileText size={18} aria-hidden />}
                action={
                  <Button variant="solid" size="sm" onClick={openAdd}>
                    Add Brochure
                  </Button>
                }
              />
            ) : (
              <Table>
                <THead>
                  <Th className="w-[72px]">Cover</Th>
                  <Th>Title</Th>
                  <Th className="hidden sm:table-cell">File</Th>
                  <Th className="hidden md:table-cell">Order</Th>
                  <Th>Status</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </THead>
                <TBody>
                  {brochures.map((b) => (
                    <Tr key={b._id}>
                      <Td>
                        <Thumb src={b.coverImage} alt={b.title} className="w-12 h-12" />
                      </Td>
                      <Td>
                        <span className="block font-sans text-[13px] text-ink">{b.title}</span>
                        {b.description && (
                          <span className="block font-sans text-[12px] text-faint mt-0.5 line-clamp-1">
                            {b.description}
                          </span>
                        )}
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <a
                          href={b.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-[13px] text-muted hover:text-ink transition-colors"
                        >
                          PDF · {formatSize(b.fileSize)}
                        </a>
                      </Td>
                      <Td className="hidden md:table-cell tabular-nums text-muted">{b.order}</Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton label={`Edit ${b.title}`} onClick={() => openEdit(b)}>
                            <Pencil size={13} aria-hidden />
                          </IconButton>
                          <IconButton
                            label={`Delete ${b.title}`}
                            tone="danger"
                            onClick={() => setDeleteTarget(b)}
                          >
                            <Trash2 size={13} aria-hidden />
                          </IconButton>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </Reveal>

        {formOpen && (
          <Reveal className="lg:col-span-4 lg:sticky lg:top-6" delay={0.05}>
            <Card>
              <CardHeader
                eyebrow={editingId ? 'Amend' : 'Compose'}
                title={editingId ? 'Edit Brochure' : 'New Brochure'}
                action={
                  <IconButton label="Close form" onClick={() => setFormOpen(false)}>
                    <X size={14} aria-hidden />
                  </IconButton>
                }
              />

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <Field label="Title" htmlFor="brochure-title" required>
                  <Input
                    id="brochure-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The 2026 Lookbook"
                    autoComplete="off"
                  />
                </Field>

                <Field label="Description" htmlFor="brochure-description" optional>
                  <Textarea
                    id="brochure-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One or two lines shown on the card."
                  />
                </Field>

                <Field
                  label="PDF"
                  htmlFor="brochure-file"
                  required={!editingId}
                  hint={`Up to ${MAX_FILE_MB} MB.`}
                >
                  <div className="border border-dashed border-line bg-ivory p-4 flex flex-col gap-2">
                    <input
                      id="brochure-file"
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        pickPdf(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <FileText size={16} aria-hidden className="text-faint shrink-0" />
                      <span className="font-sans text-[13px] text-muted truncate min-w-0 flex-1">
                        {pdf
                          ? `${pdf.name} · ${formatSize(pdf.size)}`
                          : existingFileUrl
                            ? 'Current PDF kept'
                            : 'No file chosen'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => pdfInputRef.current?.click()}
                      >
                        {pdf || existingFileUrl ? 'Replace PDF' : 'Choose PDF'}
                      </Button>
                      {existingFileUrl && !pdf && (
                        <a
                          href={existingFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-[12px] text-muted hover:text-ink transition-colors"
                        >
                          View current
                        </a>
                      )}
                    </div>
                  </div>
                </Field>

                <ImagePicker
                  label="Cover Image"
                  file={coverFile}
                  url={coverUrl || null}
                  onSelect={setCoverFile}
                  onClear={() => {
                    setCoverFile(null);
                    setCoverUrl('');
                  }}
                  hint="Optional · 4:3"
                />

                <Field label="Order" htmlFor="brochure-order" hint="Lower numbers come first.">
                  <Input
                    id="brochure-order"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                  />
                </Field>

                <div className="border-t border-line pt-5">
                  <Checkbox
                    label="Published"
                    description="Only published brochures appear on the storefront."
                    checked={published}
                    onChange={setPublished}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" variant="solid" size="sm" loading={saving} className="flex-1">
                    {editingId ? 'Update Brochure' : 'Create Brochure'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </Reveal>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this brochure?"
        message={
          deleteTarget
            ? `“${deleteTarget.title}” will no longer be downloadable from the storefront.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        tone="danger"
      />
    </>
  );
}
