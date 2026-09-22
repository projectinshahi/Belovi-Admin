'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  Field,
  IconButton,
  ImagePicker,
  Input,
  PageHeader,
  Reveal,
  Spinner,
  Textarea,
} from '@/components/ui';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';

/**
 * The homepage Collection band — the section directly below the hero.
 *
 * Heading, description, main image and the row of scrolling images, all saved
 * together with one Save. Adding, replacing, relabelling and removing images
 * change the list here; nothing reaches the storefront until Save, and the
 * backend validates the whole section before writing any of it.
 *
 * Each scrolling image is previewed exactly as the storefront draws it: the
 * product over the shared white plate on the band's grey. Upload product
 * cut-outs (transparent PNGs); the plate is added automatically.
 */

/** Mirrors LIMITS in the backend's CollectionSection model. */
const LIMITS = { heading: 80, description: 800, alt: 120, minImages: 1, maxImages: 20 };
/** Mirrors MAX_IMAGE_MB in the backend's upload middleware. */
const MAX_MB = 10;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const STOREFRONT = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://belovi.in').replace(/\/$/, '');
const PLATE = `${STOREFRONT}/images/Rectangle%208%20(2).png`;

/** `/images/…` is the storefront's own bundled art; anything else is an upload. */
const imageSrc = (u: string) => (u.startsWith('/images/') ? `${STOREFRONT}${encodeURI(u)}` : assetUrl(u));

interface Item {
  key: string;
  /** The saved URL; absent for a new image. */
  image?: string;
  /** A picked file waiting for Save — a new image, or a replacement. */
  file?: File;
  /**
   * Object URL for `file`, made when it is picked rather than during render.
   * A tile that mounts already holding a file would otherwise lose its preview
   * to StrictMode's mount-unmount-mount in development.
   * ponytail: previews still pending when the admin leaves the page are freed on
   * reload, not on unmount.
   */
  preview?: string;
  alt: string;
}

interface Section {
  heading: string;
  description: string;
  mainImage: string;
  images: { _id?: string; image: string; alt: string }[];
}

let nextKey = 0;
const toItems = (s: Section): Item[] =>
  s.images.map((i) => ({ key: `k${nextKey++}`, image: i.image, alt: i.alt ?? '' }));

const revoke = (it: Item) => it.preview && URL.revokeObjectURL(it.preview);

/** Null when the file is usable, else why not. */
function fileProblem(f: File): string | null {
  if (!TYPES.includes(f.type)) return `${f.name}: use a PNG, JPEG or WebP image.`;
  if (f.size > MAX_MB * 1024 * 1024) return `${f.name}: images must be under ${MAX_MB} MB.`;
  return null;
}

export default function CollectionSectionPage() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const addRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const apply = (s: Section) => {
    setHeading(s.heading ?? '');
    setDescription(s.description ?? '');
    setMainImage(s.mainImage ?? '');
    setMainFile(null);
    setItems(toItems(s));
    setSubmitted(false);
  };

  useEffect(() => {
    api
      .get('/collection-section', { params: { t: Date.now() } })
      .then((res) => {
        if (res.data?.success) apply(res.data.data);
        setLoaded(true);
      })
      .catch((err) => {
        toast.error(apiErrorMessage(err, 'Could not load the Collection section.'));
        setError(true);
      });
  }, []);

  const addFiles = (list: FileList | File[] | null) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    const room = LIMITS.maxImages - items.length;
    const good: File[] = [];
    for (const f of picked) {
      const problem = fileProblem(f);
      if (problem) toast.error(problem);
      else good.push(f);
    }
    if (good.length > room) {
      toast.error(`Up to ${LIMITS.maxImages} images — ${good.length - Math.max(room, 0)} not added.`);
    }
    const added = good.slice(0, Math.max(room, 0)).map((file) => ({
      key: `k${nextKey++}`,
      file,
      preview: URL.createObjectURL(file),
      alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, LIMITS.alt),
    }));
    if (added.length) setItems((prev) => [...prev, ...added]);
  };

  const patch = (key: string, change: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));

  const headingError = !heading.trim()
    ? 'A section heading is required.'
    : heading.trim().length > LIMITS.heading
      ? `${LIMITS.heading} characters at most.`
      : '';
  const descriptionError = !description.trim()
    ? 'A description is required.'
    : description.trim().length > LIMITS.description
      ? `${LIMITS.description} characters at most.`
      : '';
  const mainError = !mainFile && !mainImage ? 'A main image is required.' : '';
  const imagesError =
    items.length < LIMITS.minImages
      ? 'Add at least one scrolling image.'
      : items.length > LIMITS.maxImages
        ? `${LIMITS.maxImages} images at most.`
        : '';

  const save = async () => {
    setSubmitted(true);
    const firstError = headingError || descriptionError || mainError || imagesError;
    if (firstError) return toast.error(firstError);

    setSaving(true);
    const form = new FormData();
    form.append('heading', heading.trim());
    form.append('description', description.trim());
    if (mainFile) form.append('mainImageFile', mainFile);
    else form.append('mainImage', mainImage);

    // New and replaced images travel as files; `file` is their index in that list.
    const files: File[] = [];
    const payload = items.map((it) =>
      it.file
        ? { file: files.push(it.file) - 1, alt: it.alt.trim() }
        : { image: it.image, alt: it.alt.trim() }
    );
    form.append('images', JSON.stringify(payload));
    files.forEach((f) => form.append('imageFiles', f));

    try {
      const res = await api.put('/collection-section', form);
      if (res.data?.success) {
        items.forEach(revoke);
        apply(res.data.data);
        toast.success('Collection section saved');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the Collection section.'));
    } finally {
      setSaving(false);
    }
  };

  if (error && !loaded) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <p className="text-danger mb-4">Could not load the Collection section.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="py-24 flex justify-center">
        <Spinner />
      </div>
    );
  }

  const saveButton = (
    <Button variant="solid" size="sm" onClick={save} loading={saving}>
      Save Changes
    </Button>
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Collection Section"
        description="The band directly below the hero: its heading, description, main image and the row of scrolling images."
        action={saveButton}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pb-24">
        <Reveal className="xl:col-span-5">
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Left and top" title="Content" />
            <div className="mt-5 space-y-5">
              <Field
                label="Section Heading"
                htmlFor="cs-heading"
                required
                error={submitted ? headingError : undefined}
                hint={`${heading.trim().length}/${LIMITS.heading}`}
              >
                <Input
                  id="cs-heading"
                  value={heading}
                  maxLength={LIMITS.heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="Collection"
                  error={submitted && !!headingError}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="cs-description"
                required
                error={submitted ? descriptionError : undefined}
                hint={`${description.trim().length}/${LIMITS.description}`}
              >
                <Textarea
                  id="cs-description"
                  rows={6}
                  value={description}
                  maxLength={LIMITS.description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="The story of the collection."
                  error={submitted && !!descriptionError}
                />
              </Field>

              <div>
                <ImagePicker
                  label="Main Image"
                  file={mainFile}
                  url={mainImage ? imageSrc(mainImage) : null}
                  onSelect={(f) => {
                    const problem = fileProblem(f);
                    if (problem) return toast.error(problem);
                    setMainFile(f);
                  }}
                  onClear={() => {
                    setMainFile(null);
                    setMainImage('');
                  }}
                  ratio="aspect-[645/746]"
                  className="max-w-[320px]"
                  hint={`Portrait, about 645 × 746. PNG, JPEG or WebP, under ${MAX_MB} MB.`}
                />
                {submitted && mainError && (
                  <p className="mt-2 font-sans text-[12px] text-danger">{mainError}</p>
                )}
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal className="xl:col-span-7" delay={0.05}>
          <Card className="p-5 sm:p-6">
            <CardHeader
              eyebrow={`${items.length} of ${LIMITS.maxImages}`}
              title="Scrolling Images"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addRef.current?.click()}
                  disabled={items.length >= LIMITS.maxImages}
                >
                  Add Images
                </Button>
              }
            />
            <p className="mt-3 font-sans text-[13px] leading-[1.7] text-muted">
              Upload product cut-outs; a transparent PNG works best. Each one is placed on the
              white plate automatically, exactly as previewed below. They scroll in this order.
            </p>
            <input
              ref={addRef}
              type="file"
              accept={TYPES.join(',')}
              multiple
              className="sr-only"
              aria-label="Add scrolling images"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {submitted && imagesError && (
              <p className="mt-3 font-sans text-[12px] text-danger">{imagesError}</p>
            )}

            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((it, i) => (
                <ImageTile
                  key={it.key}
                  item={it}
                  index={i}
                  onAlt={(alt) => patch(it.key, { alt })}
                  onReplace={(file) => {
                    const problem = fileProblem(file);
                    if (problem) return toast.error(problem);
                    revoke(it);
                    patch(it.key, { file, preview: URL.createObjectURL(file) });
                  }}
                  onRemove={() => {
                    revoke(it);
                    setItems((prev) => prev.filter((x) => x.key !== it.key));
                  }}
                />
              ))}

              {items.length < LIMITS.maxImages && (
                <li>
                  <button
                    type="button"
                    onClick={() => addRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`w-full aspect-[1.7] flex flex-col items-center justify-center gap-2 border border-dashed
                      font-sans text-[13px] text-muted transition-colors duration-300 ease-editorial
                      hover:text-ink hover:border-ink/40 ${dragging ? 'border-ink/60 bg-ink/[0.03]' : 'border-line'}`}
                  >
                    <ImagePlus size={20} aria-hidden />
                    Add or drop images
                  </button>
                </li>
              )}
            </ul>
          </Card>
        </Reveal>
      </div>

      <div className="sticky bottom-0 inset-x-0 p-4 bg-ivory/90 backdrop-blur-md border-t border-line flex justify-end z-20">
        {saveButton}
      </div>
    </>
  );
}

function ImageTile({
  item,
  index,
  onAlt,
  onReplace,
  onRemove,
}: {
  item: Item;
  index: number;
  onAlt: (alt: string) => void;
  onReplace: (file: File) => void;
  onRemove: () => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const src = item.preview ?? (item.image ? imageSrc(item.image) : '');
  const label = item.alt.trim() || `Image ${index + 1}`;

  return (
    <li className="border border-line bg-white">
      {/* The storefront's own composition, on the band's #E8E8E8. */}
      <div className="relative bg-[#E8E8E8] px-4 pt-4 pb-3">
        <div className="relative aspect-[1.7] w-full select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PLATE} alt="" aria-hidden className="absolute bottom-0 left-[8.33%] w-[83.33%]" />
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={label}
              className="absolute inset-x-0 top-0 h-[88.9%] w-full object-contain object-bottom"
            />
          )}
        </div>
        {item.file && (
          <span className="absolute left-3 top-3 bg-ink px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.12em] text-ivory">
            {item.image ? 'Replaced' : 'New'} · unsaved
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        <Field label="Label" htmlFor={`cs-alt-${item.key}`} optional hint="Read out by screen readers.">
          <Input
            id={`cs-alt-${item.key}`}
            value={item.alt}
            maxLength={LIMITS.alt}
            onChange={(e) => onAlt(e.target.value)}
            placeholder="e.g. Tantra Chair in magenta"
          />
        </Field>
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[12px] text-faint tabular-nums">#{index + 1}</span>
          <div className="flex items-center gap-2">
            <input
              ref={replaceRef}
              type="file"
              accept={TYPES.join(',')}
              className="sr-only"
              aria-label={`Replace ${label}`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onReplace(f);
                e.target.value = '';
              }}
            />
            <IconButton label={`Replace ${label}`} onClick={() => replaceRef.current?.click()}>
              <RefreshCw size={13} aria-hidden />
            </IconButton>
            <IconButton label={`Remove ${label}`} tone="danger" onClick={onRemove}>
              <Trash2 size={13} aria-hidden />
            </IconButton>
          </div>
        </div>
      </div>
    </li>
  );
}
