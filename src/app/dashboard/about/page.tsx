'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardHeader,
  Field,
  ImagePicker,
  Input,
  PageHeader,
  Reveal,
  Spinner,
  Textarea,
} from '@/components/ui';
import { api, assetUrl, toastApiError } from '@/lib/api';

/**
 * The About Us page editor — the banner, the four blocks beneath it, and SEO.
 *
 * The page's words used to be fixed in code and this form offered photographs
 * only. They are the studio's now: the banner's heading and subheading, and a
 * heading and description for each of the four blocks, all alongside the
 * photograph they sit with — because that is how the page reads, and editing a
 * heading in one place and its picture in another is how the two drift apart.
 *
 * EVERY FIELD IS OPTIONAL, and empty means "use the design's own". A blank
 * heading falls back to the wording the page shipped with rather than rendering
 * a gap, the same way a missing photograph falls back to the brand artwork. So
 * this page can be left entirely empty and the storefront still looks finished —
 * which is also what makes it safe to clear a field you have second thoughts
 * about.
 */

interface AboutData {
  introImage?: string;
  profileImage?: string;
  storyImage?: string;
  visionImage?: string;
  showroomImages?: string[];
  metaTitle?: string;
  metaDescription?: string;
  /** Copy the storefront no longer reads. Carried so a save preserves it. */
  [key: string]: unknown;
}

/**
 * The first three photo/copy rows, in the order the storefront draws them.
 * `fallback` is the wording the page ships with — shown as the input's
 * placeholder, so it is obvious what an empty field will render.
 */
const BLOCKS = [
  {
    field: 'profileImage',
    fileField: 'profileImageFile',
    titleField: 'profileTitle',
    bodyField: 'profileBody',
    eyebrow: 'Block one · photo right',
    title: 'About Us',
    fallbackBody:
      'Belovi is a luxury furniture brand built around the belief that furniture should do more than fill a space…',
  },
  {
    field: 'storyImage',
    fileField: 'storyImageFile',
    titleField: 'storyTitle',
    bodyField: 'storyBody',
    eyebrow: 'Block two · photo left',
    title: 'Our Story',
    fallbackBody:
      'Belovi began with a simple idea: beautiful spaces are built around meaningful moments…',
  },
  {
    field: 'visionImage',
    fileField: 'visionImageFile',
    titleField: 'visionTitle',
    bodyField: 'visionBody',
    eyebrow: 'Block three · photo right',
    title: 'Our Vision',
    fallbackBody:
      'We believe furniture should be more than something you place in a room…',
  },
] as const;

/**
 * Text the storefront does not draw, posted back verbatim so it survives a save.
 * The eyebrows and the showroom's address/hours/map have no place in the current
 * design; they stay in the database rather than being silently dropped by every
 * save made here.
 */
const PRESERVED_TEXT = [
  'introEyebrow',
  'profileEyebrow',
  'visionEyebrow',
  'showroomEyebrow',
  'showroomAddress',
  'showroomHours',
  'showroomMapUrl',
];

/** Copy the studio edits below, and the storefront reads. */
const EDITED_TEXT = [
  'introTitle',
  'introBody',
  'profileTitle',
  'profileBody',
  'storyTitle',
  'storyBody',
  'visionTitle',
  'visionBody',
  'showroomTitle',
  'showroomBody',
];

export default function AboutAdminPage() {
  const [data, setData] = useState<AboutData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  /** New uploads, held until save. Keyed by the multipart field name. */
  const [files, setFiles] = useState<Record<string, File>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get('/about', { params: { t: Date.now() } });
      if (res.data?.success) setData(res.data.data);
    } catch (e) {
      toastApiError(e, 'Could not load the About page.');
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: string, v: string) => setData((p) => (p ? { ...p, [k]: v } : p));

  const setFile = (fileField: string, file: File | null) =>
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[fileField] = file;
      else delete next[fileField];
      return next;
    });

  /** The showroom row uses the first image of the studio's showroom set. */
  const showroomImage = (data?.showroomImages ?? []).filter(Boolean)[0] ?? '';

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const form = new FormData();
      for (const field of [...EDITED_TEXT, ...PRESERVED_TEXT]) {
        form.append(field, (data[field] as string) ?? '');
      }
      form.append('metaTitle', (data.metaTitle as string) ?? '');
      form.append('metaDescription', (data.metaDescription as string) ?? '');
      form.append('visionPoints', JSON.stringify(data.visionPoints ?? []));

      // A URL is only sent when no new file replaces it — the server prefers the
      // upload, so sending both would leave the old URL to win on the next load.
      for (const key of ['introImage', 'profileImage', 'storyImage', 'visionImage'] as const) {
        const fileField = `${key}File`;
        if (files[fileField]) form.append(fileField, files[fileField]);
        else form.append(key, (data[key] as string) ?? '');
      }

      if (files.showroomImageFiles) {
        // Replaces rather than appends: the storefront draws exactly one.
        form.append('showroomImages', JSON.stringify([]));
        form.append('showroomImageFiles', files.showroomImageFiles);
      } else {
        form.append('showroomImages', JSON.stringify(data.showroomImages ?? []));
      }

      const res = await api.put('/about', form);
      if (res.data?.success) {
        setData(res.data.data);
        setFiles({});
        toast.success('About page saved');
      }
    } catch (e) {
      toastApiError(e, 'Could not save the About page.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <p className="text-danger mb-4">Could not load the About page.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
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

  const picker = (
    fileField: string,
    url: string,
    onClear: () => void,
    hint: string
  ) => (
    <ImagePicker
      label="Photograph"
      file={files[fileField] ?? null}
      url={assetUrl(url) || null}
      onSelect={(file) => setFile(fileField, file)}
      onClear={() => {
        setFile(fileField, null);
        onClear();
      }}
      hint={hint}
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="About Page"
        description="The banner, the four blocks beneath it, and their photography."
        action={saveButton}
      />

      <div className="max-w-[820px] space-y-6 pb-24">
        <Reveal>
          <Card className="p-5 sm:p-6">
            <p className="font-sans text-[13px] leading-[1.7] text-muted">
              Every field here is optional. Leave one empty and the storefront
              draws the wording — or the artwork — the page shipped with, shown
              below as the placeholder. Nothing here can leave a gap on the page.
            </p>
          </Card>
        </Reveal>

        <Reveal delay={0.04}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Top of page" title="Banner" />
            <div className="mt-4 space-y-4">
              <Field label="Heading" htmlFor="intro-title" optional>
                <Input
                  id="intro-title"
                  value={(data.introTitle as string) ?? ''}
                  onChange={(e) => set('introTitle', e.target.value)}
                  placeholder="About Belovi"
                />
              </Field>
              <Field
                label="Subheading"
                htmlFor="intro-body"
                optional
                hint="The line beneath the heading."
              >
                <Input
                  id="intro-body"
                  value={(data.introBody as string) ?? ''}
                  onChange={(e) => set('introBody', e.target.value)}
                  placeholder="Where every seat brings people closer."
                />
              </Field>
              {picker(
                'introImageFile',
                (data.introImage as string) ?? '',
                () => set('introImage', ''),
                'Wide crop, roughly 16:6. The heading sits over it, so choose a frame that stays dark through the centre.'
              )}
            </div>
          </Card>
        </Reveal>

        {BLOCKS.map((b, i) => (
          <Reveal key={b.field} delay={0.08 + i * 0.04}>
            <Card className="p-5 sm:p-6">
              <CardHeader eyebrow={b.eyebrow} title={b.title} />
              <div className="mt-4 space-y-4">
                <Field label="Heading" htmlFor={`${b.field}-title`} optional>
                  <Input
                    id={`${b.field}-title`}
                    value={(data[b.titleField] as string) ?? ''}
                    onChange={(e) => set(b.titleField, e.target.value)}
                    placeholder={b.title}
                  />
                </Field>
                <Field
                  label="Description"
                  htmlFor={`${b.field}-body`}
                  optional
                  hint="A blank line starts a new paragraph."
                >
                  <Textarea
                    id={`${b.field}-body`}
                    rows={4}
                    value={(data[b.bodyField] as string) ?? ''}
                    onChange={(e) => set(b.bodyField, e.target.value)}
                    placeholder={b.fallbackBody}
                  />
                </Field>
                {picker(
                  b.fileField,
                  (data[b.field] as string) ?? '',
                  () => set(b.field, ''),
                  'Portrait crop, roughly 6:7.'
                )}
              </div>
            </Card>
          </Reveal>
        ))}

        <Reveal delay={0.2}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Block four · photo left" title="Visit Our Showroom" />
            <div className="mt-4 space-y-4">
              <Field label="Heading" htmlFor="showroom-title" optional>
                <Input
                  id="showroom-title"
                  value={(data.showroomTitle as string) ?? ''}
                  onChange={(e) => set('showroomTitle', e.target.value)}
                  placeholder="Visit Our Showroom"
                />
              </Field>
              <Field
                label="Description"
                htmlFor="showroom-body"
                optional
                hint="A blank line starts a new paragraph."
              >
                <Textarea
                  id="showroom-body"
                  rows={4}
                  value={(data.showroomBody as string) ?? ''}
                  onChange={(e) => set('showroomBody', e.target.value)}
                  placeholder="Experience the Belovi collection beyond the screen…"
                />
              </Field>
              {picker(
                'showroomImageFiles',
                showroomImage,
                () => setData((p) => (p ? { ...p, showroomImages: [] } : p)),
                'Portrait crop, roughly 6:7.'
              )}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.24}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Search" title="SEO" />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Meta Title" htmlFor="meta-title" optional>
                <Input
                  id="meta-title"
                  value={(data.metaTitle as string) ?? ''}
                  onChange={(e) => set('metaTitle', e.target.value)}
                  placeholder="About Us — BELOVI"
                />
              </Field>
              <Field label="Meta Description" htmlFor="meta-description" optional>
                <Input
                  id="meta-description"
                  value={(data.metaDescription as string) ?? ''}
                  onChange={(e) => set('metaDescription', e.target.value)}
                />
              </Field>
            </div>
          </Card>
        </Reveal>
      </div>

      <div className="sticky bottom-0 inset-x-0 p-4 bg-ivory/90 backdrop-blur-md border-t border-line flex justify-end z-20">
        {saveButton}
      </div>
    </>
  );
}
