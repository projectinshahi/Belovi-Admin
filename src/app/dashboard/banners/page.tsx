'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X, ImageIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  Checkbox,
  ConfirmDialog,
  Field,
  Input,
  StatusBadge,
  SkeletonTable,
  EmptyState,
  Thumb,
  ImagePicker,
  IconButton,
} from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';

interface IBanner {
  _id: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  image: string;
  mobileImage?: string;
  status: string;
}

/** Unchanged from the previous implementation — the backend rejects above this. */
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

export default function BannersPage() {
  const [banners, setBanners] = useState<IBanner[]>([]);
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    bannerId: string | null;
  }>({ isOpen: false, bannerId: null });

  // Form State. `image`/`mobileImage` hold an existing path from the API;
  // `imageFile`/`mobileImageFile` hold a freshly-picked File. Exactly one of
  // each pair is live at a time — that distinction drives what goes on the wire.
  const [title, setTitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImage, setMobileImage] = useState('');
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  // The storefront only renders banners whose status is 'ACTIVE'
  // (Belovi-frontend HeroSection filters on it), but this form used to hardcode
  // 'ACTIVE' on every save — so a banner could never be taken down from here,
  // and editing a hidden one silently republished it. The field was already on
  // the wire; it just had no control.
  const [isActive, setIsActive] = useState(true);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await api.get('/banners');
      const data = res.data;
      if (data.success) {
        setBanners(data.data);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load banners.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Awaited inside an async IIFE rather than called bare: `react-hooks/
  // set-state-in-effect` (React Compiler) can't see past a named async
  // function reference and flags `fetchBanners()` here as a synchronous
  // setState. Don't inline it back.
  useEffect(() => {
    void (async () => {
      await fetchBanners();
    })();
  }, [fetchBanners]);

  const handleAddClick = () => {
    setEditingId(null);
    setTitle('');
    setCtaLabel('');
    setCtaHref('');
    setImage('');
    setImageFile(null);
    setMobileImage('');
    setMobileImageFile(null);
    setIsActive(true);
    setIsAddBannerOpen(true);
  };

  const handleEditClick = (banner: IBanner) => {
    setEditingId(banner._id);
    setTitle(banner.title);
    setCtaLabel(banner.ctaLabel || '');
    setCtaHref(banner.ctaHref || '');
    setImage(banner.image);
    setImageFile(null);
    setMobileImage(banner.mobileImage || '');
    setMobileImageFile(null);
    // Carry the banner's real status in, so saving an edit can't silently
    // republish something that was deliberately taken down.
    setIsActive(banner.status !== 'INACTIVE');
    setIsAddBannerOpen(true);
  };

  const handleClosePanel = () => {
    setIsAddBannerOpen(false);
    setEditingId(null);
    setImageFile(null);
    setMobileImageFile(null);
  };

  /** Picking a file supersedes any existing path, as it did before. */
  const selectDesktopImage = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image size must be less than 3MB');
      return;
    }
    setImageFile(file);
    setImage('');
  };

  const selectMobileImage = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image size must be less than 3MB');
      return;
    }
    setMobileImageFile(file);
    setMobileImage('');
  };

  const handleSubmit = async () => {
    if (
      !title ||
      (!image && !imageFile) ||
      (!mobileImage && !mobileImageFile)
    ) {
      toast.error('Heading and both images are required');
      return;
    }

    if (imageFile && imageFile.size > MAX_FILE_SIZE) {
      toast.error('Laptop image size must be less than 3MB');
      return;
    }

    if (mobileImageFile && mobileImageFile.size > MAX_FILE_SIZE) {
      toast.error('Phone image size must be less than 3MB');
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('ctaLabel', ctaLabel);
    formData.append('ctaHref', ctaHref);
    formData.append('status', isActive ? 'ACTIVE' : 'INACTIVE');

    if (imageFile) {
      formData.append('image', imageFile);
    } else if (image) {
      formData.append('image', image);
    }

    if (mobileImageFile) {
      formData.append('mobileImage', mobileImageFile);
    } else if (mobileImage) {
      formData.append('mobileImage', mobileImage);
    }

    try {
      // axios sets the multipart boundary from the FormData itself; hand-setting
      // Content-Type here would omit it and the upload would fail to parse.
      const res = editingId
        ? await api.put(`/banners/${editingId}`, formData)
        : await api.post('/banners', formData);

      const data = res.data;
      if (data.success) {
        toast.success(
          editingId ? 'Banner updated successfully' : 'Banner created successfully'
        );
        handleClosePanel();
        fetchBanners();
      } else {
        toast.error(data.message || 'Failed to save banner');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error connecting to backend'));
      // 404 = the banner was removed elsewhere. Retrying the same id can only
      // 404 again, so drop the dead editor and resync rather than stranding
      // the operator on a row that no longer exists.
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        handleClosePanel();
      }
      fetchBanners();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, bannerId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.bannerId) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/banners/${deleteModal.bannerId}`);
      const data = res.data;
      if (data.success) {
        toast.success('Banner deleted successfully');
        fetchBanners();
        setDeleteModal({ isOpen: false, bannerId: null });
      } else {
        toast.error(data.message || 'Failed to delete banner');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error deleting banner'));
      // Already gone (404) or the call failed — either way the list is stale.
      setDeleteModal({ isOpen: false, bannerId: null });
      fetchBanners();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Storefront"
        title="Hero Section"
        description="The homepage hero: heading, subheading and imagery. The newest active entry is what the storefront shows — a wide crop for desktop, a tall crop for phones."
        action={
          <Button variant="solid" size="sm" onClick={handleAddClick}>Add Hero</Button>
        }
      />

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left column: the banner list. */}
        <Card padded={false} className="flex-1 min-w-0 w-full p-5 sm:p-6">
          {loading ? (
            <SkeletonTable rows={4} cols={5} />
          ) : banners.length === 0 ? (
            <EmptyState
              title="No hero set"
              message="Add a hero to set the homepage heading, subheading and imagery. You'll need a desktop crop and a mobile crop."
              icon={<ImageIcon size={18} aria-hidden />}
              action={
                <Button variant="solid" size="sm" onClick={handleAddClick}>Add Hero</Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Desktop</Th>
                <Th className="hidden md:table-cell">Mobile</Th>
                <Th>Banner</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </THead>
              <TBody>
                {banners.map((banner) => (
                  <Tr key={banner._id}>
                    <Td>
                      <Thumb
                        src={banner.image}
                        alt={banner.title}
                        ratio="aspect-[16/9]"
                        className="w-[128px]"
                      />
                    </Td>
                    <Td className="hidden md:table-cell">
                      <Thumb
                        src={banner.mobileImage}
                        alt={`${banner.title} — mobile crop`}
                        ratio="aspect-[4/5]"
                        className="w-[52px]"
                      />
                    </Td>
                    <Td>
                      <span className="block text-ink">{banner.title}</span>
                      {banner.description && (
                        <span className="block text-[12px] text-muted mt-1 leading-snug max-w-[280px] line-clamp-2">
                          {banner.description}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {banner.status ? (
                        <StatusBadge status={banner.status} />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton
                          label="Edit banner"
                          onClick={() => handleEditClick(banner)}
                        >
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          label="Delete banner"
                          tone="danger"
                          onClick={() => handleDeleteClick(banner._id)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Right column: the add/edit panel, in its original placement. */}
        {isAddBannerOpen && (
          <Card
            padded={false}
            className="w-full xl:w-[420px] shrink-0 xl:sticky xl:top-0 flex flex-col xl:max-h-[calc(100vh-9rem)]"
          >
            <div className="p-5 sm:p-6 border-b border-line shrink-0">
              <CardHeader
                eyebrow={editingId ? 'Editing' : 'Create'}
                title={editingId ? 'Edit Hero' : 'New Hero'}
                action={
                  <IconButton label="Close panel" onClick={handleClosePanel}>
                    <X size={14} />
                  </IconButton>
                }
              />
            </div>

            <div className="flex-1 overflow-y-auto thin-scrollbar p-5 sm:p-6 space-y-5">
              <Field
                label="Hero heading"
                htmlFor="banner-title"
                required
                hint="The large serif headline on the homepage hero."
              >
                <Input
                  id="banner-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tropical-intelligent clothing, drawn from a life lived in heat, humidity and rain."
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Button text" htmlFor="banner-cta-label" hint="e.g. Explore the Edit">
                  <Input
                    id="banner-cta-label"
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Explore the Edit"
                  />
                </Field>
                <Field label="Button link" htmlFor="banner-cta-href" hint="e.g. /products?collection=onam">
                  <Input
                    id="banner-cta-href"
                    type="text"
                    value={ctaHref}
                    onChange={(e) => setCtaHref(e.target.value)}
                    placeholder="/products?collection=onam"
                  />
                </Field>
              </div>

              {/* Two pickers, two distinct fields — the storefront picks between
                  them by viewport, so both are required. */}
              <ImagePicker
                label="Desktop image"
                hint="Wide crop, around 1920×1080. Max 3MB."
                ratio="aspect-[16/9]"
                file={imageFile}
                url={image}
                onSelect={selectDesktopImage}
                onClear={() => {
                  setImageFile(null);
                  setImage('');
                }}
              />

              <ImagePicker
                label="Mobile image"
                hint="Tall crop, around 1080×1350. Max 3MB."
                ratio="aspect-[4/5]"
                file={mobileImageFile}
                url={mobileImage}
                onSelect={selectMobileImage}
                onClear={() => {
                  setMobileImageFile(null);
                  setMobileImage('');
                }}
              />

              <div className="border-t border-line pt-5">
                <Checkbox
                  label="Live on the storefront"
                  description="Only active banners appear on the homepage."
                  checked={isActive}
                  onChange={setIsActive}
                />
              </div>

              <Button
                variant="solid"
                onClick={handleSubmit}
                loading={saving}
                className="w-full"
              >
                {editingId ? 'Update Hero' : 'Create Hero'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, bannerId: null })}
        onConfirm={confirmDelete}
        title="Delete banner?"
        message="This banner will be removed from the homepage immediately. This action cannot be undone."
        confirmLabel="Delete banner"
        loading={deleting}
      />
    </div>
  );
}
