'use client';

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Clapperboard, Pencil, Trash2, X } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Reveal,
  SkeletonTable,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Thumb,
  Tr,
} from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';
import { formatINR } from '@/lib/format';

/**
 * YouTube videos for the homepage Video Showcase carousel.
 *
 * A video is a name plus the link as pasted. The backend derives the YouTube id
 * from the link and rejects anything it cannot play, so the error toast is the
 * validation for a bad link.
 *
 * The product name and prices are optional. When set they are drawn over the
 * card on the storefront; left blank, the card shows the video's name alone.
 */

interface IVideo {
  _id: string;
  name: string;
  url: string;
  youtubeId: string;
  productName?: string | null;
  actualPrice?: number | null;
  offerPrice?: number | null;
}

/** Mirrors the 120-character cap on the backend model. */
const MAX_NAME = 120;

export default function VideosPage() {
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IVideo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  // Kept as the typed strings so an empty box stays empty rather than "0".
  const [actualPrice, setActualPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');

  const fetchVideos = async () => {
    try {
      const res = await api.get('/videos');
      if (res.data.success) setVideos(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load videos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVideos();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setUrl('');
    setProductName('');
    setActualPrice('');
    setOfferPrice('');
    setFormOpen(true);
  };

  const openEdit = (v: IVideo) => {
    setEditingId(v._id);
    setName(v.name);
    setUrl(v.url);
    setProductName(v.productName ?? '');
    setActualPrice(v.actualPrice != null ? String(v.actualPrice) : '');
    setOfferPrice(v.offerPrice != null ? String(v.offerPrice) : '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('A video name is required.');
    if (!url.trim()) return toast.error('A YouTube link is required.');
    // Blank means "no price"; the backend stores it as null.
    const actual = actualPrice.trim() === '' ? null : Number(actualPrice);
    const offer = offerPrice.trim() === '' ? null : Number(offerPrice);
    if ([actual, offer].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) {
      return toast.error('Prices must be numbers of 0 or more.');
    }
    if (actual !== null && offer !== null && offer > actual) {
      return toast.error('The offer price cannot be higher than the actual price.');
    }

    setSaving(true);
    const body = {
      name: name.trim(),
      url: url.trim(),
      productName: productName.trim(),
      actualPrice: actual,
      offerPrice: offer,
    };
    try {
      const res = editingId
        ? await api.put(`/videos/${editingId}`, body)
        : await api.post('/videos', body);
      if (res.data?.success) {
        toast.success(editingId ? 'Video updated' : 'Video added');
        setFormOpen(false);
        setEditingId(null);
        fetchVideos();
      } else {
        toast.error(res.data?.message || 'Could not save the video.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the video.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/videos/${deleteTarget._id}`);
      if (res.data?.success) {
        toast.success('Video deleted');
        setDeleteTarget(null);
        fetchVideos();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete the video.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Video Showcase"
        description="YouTube videos shown in the homepage carousel, below the brochures. The section hides itself when there are none."
        action={
          <Button variant="solid" size="sm" onClick={openAdd}>
            Add Video
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Reveal className={formOpen ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <Card padded={false} className="p-5 sm:p-6">
            {loading ? (
              <SkeletonTable rows={4} cols={3} />
            ) : videos.length === 0 ? (
              <EmptyState
                title="No videos yet"
                message="Add a YouTube link to start the homepage Video Showcase."
                icon={<Clapperboard size={18} aria-hidden />}
                action={
                  <Button variant="solid" size="sm" onClick={openAdd}>
                    Add Video
                  </Button>
                }
              />
            ) : (
              <Table>
                <THead>
                  <Th className="w-[104px]">Video</Th>
                  <Th>Name</Th>
                  <Th className="hidden md:table-cell">Product</Th>
                  <Th className="hidden sm:table-cell">Link</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </THead>
                <TBody>
                  {videos.map((v) => (
                    <Tr key={v._id}>
                      <Td>
                        {/* `mqdefault` is YouTube's 16:9 frame with no letterbox bars. */}
                        <Thumb
                          src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`}
                          alt={v.name}
                          className="w-20 h-[45px]"
                        />
                      </Td>
                      <Td>
                        <span className="block font-sans text-[13px] text-ink">{v.name}</span>
                      </Td>
                      <Td className="hidden md:table-cell">
                        {v.productName || v.actualPrice != null || v.offerPrice != null ? (
                          <>
                            {v.productName && (
                              <span className="block font-sans text-[13px] text-ink">{v.productName}</span>
                            )}
                            <span className="block font-sans text-[12px] text-muted tabular-nums mt-0.5">
                              {v.offerPrice != null && formatINR(v.offerPrice)}
                              {v.offerPrice != null && v.actualPrice != null && ' · '}
                              {v.actualPrice != null && (
                                <span className={v.offerPrice != null ? 'line-through' : ''}>
                                  {formatINR(v.actualPrice)}
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="font-sans text-[13px] text-faint">—</span>
                        )}
                      </Td>
                      <Td className="hidden sm:table-cell max-w-[260px]">
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate font-sans text-[13px] text-muted hover:text-ink transition-colors"
                        >
                          {v.url}
                        </a>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton label={`Edit ${v.name}`} onClick={() => openEdit(v)}>
                            <Pencil size={13} aria-hidden />
                          </IconButton>
                          <IconButton
                            label={`Delete ${v.name}`}
                            tone="danger"
                            onClick={() => setDeleteTarget(v)}
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
                title={editingId ? 'Edit Video' : 'New Video'}
                action={
                  <IconButton label="Close form" onClick={() => setFormOpen(false)}>
                    <X size={14} aria-hidden />
                  </IconButton>
                }
              />

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <Field label="Video Name" htmlFor="video-name" required>
                  <Input
                    id="video-name"
                    value={name}
                    maxLength={MAX_NAME}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Inside the Belovi Studio"
                    autoComplete="off"
                  />
                </Field>

                <Field
                  label="YouTube Link"
                  htmlFor="video-url"
                  required
                  hint="Any YouTube link — watch, youtu.be or Shorts."
                >
                  <Input
                    id="video-url"
                    type="text"
                    inputMode="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    autoComplete="off"
                  />
                </Field>

                <div className="border-t border-line pt-5 space-y-5">
                  <p className="font-sans text-[12px] leading-[1.6] text-muted">
                    Optional. Shown over the video card on the homepage; leave blank for a video
                    without a product. With both prices, the actual price shows struck through.
                  </p>
                  <Field label="Product Name" htmlFor="video-product" optional>
                    <Input
                      id="video-product"
                      value={productName}
                      maxLength={MAX_NAME}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Curved Sofa"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Actual Price" htmlFor="video-actual" optional>
                    <Input
                      id="video-actual"
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={actualPrice}
                      onChange={(e) => setActualPrice(e.target.value)}
                      placeholder="₹"
                    />
                  </Field>
                  <Field label="Offer Price" htmlFor="video-offer" optional>
                    <Input
                      id="video-offer"
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="₹"
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" variant="solid" size="sm" loading={saving} className="flex-1">
                    {editingId ? 'Update Video' : 'Add Video'}
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
        title="Delete this video?"
        message={
          deleteTarget ? `“${deleteTarget.name}” will be removed from the homepage carousel.` : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        tone="danger"
      />
    </>
  );
}
