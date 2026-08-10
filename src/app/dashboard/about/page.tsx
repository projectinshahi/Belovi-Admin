'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
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
import { api, assetUrl, toastApiError } from '@/lib/api';

/**
 * The About Us page editor — company profile, vision and showroom.
 *
 * The storefront's About page also renders the StorySection feed between vision
 * and showroom. Those sections no longer have an editor — the Story Page
 * manager was removed — so whatever is already published keeps showing, and the
 * blocks below are the part of About that is still authored.
 *
 * Everything is optional. A block left blank is omitted on the storefront rather
 * than rendered as an empty heading, so this can be filled in as BELOVA supplies
 * the copy.
 */

interface VisionPoint {
  label: string;
  text: string;
}

interface AboutData {
  introEyebrow?: string;
  introTitle?: string;
  introBody?: string;
  introImage?: string;
  profileEyebrow?: string;
  profileTitle?: string;
  profileBody?: string;
  profileImage?: string;
  visionEyebrow?: string;
  visionTitle?: string;
  visionBody?: string;
  visionPoints?: VisionPoint[];
  showroomEyebrow?: string;
  showroomTitle?: string;
  showroomBody?: string;
  showroomAddress?: string;
  showroomHours?: string;
  showroomMapUrl?: string;
  showroomImages?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

/** Fields posted as plain text. Kept in one list so `save` can't miss one. */
const TEXT_FIELDS: (keyof AboutData)[] = [
  'introEyebrow',
  'introTitle',
  'introBody',
  'profileEyebrow',
  'profileTitle',
  'profileBody',
  'visionEyebrow',
  'visionTitle',
  'visionBody',
  'showroomEyebrow',
  'showroomTitle',
  'showroomBody',
  'showroomAddress',
  'showroomHours',
  'showroomMapUrl',
  'metaTitle',
  'metaDescription',
];

const MAX_SHOWROOM_IMAGES = 6;

export default function AboutAdminPage() {
  const [data, setData] = useState<AboutData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // New uploads, held until save.
  const [introFile, setIntroFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [showroomFiles, setShowroomFiles] = useState<File[]>([]);

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

  const set = (k: keyof AboutData, v: string) =>
    setData((p) => (p ? { ...p, [k]: v } : p));

  const points = data?.visionPoints ?? [];
  const setPoints = (next: VisionPoint[]) =>
    setData((p) => (p ? { ...p, visionPoints: next } : p));
  const patchPoint = (i: number, changes: Partial<VisionPoint>) =>
    setPoints(points.map((p, idx) => (idx === i ? { ...p, ...changes } : p)));

  const existingShowroom = data?.showroomImages ?? [];
  const removeExistingShowroom = (url: string) =>
    setData((p) =>
      p ? { ...p, showroomImages: (p.showroomImages ?? []).filter((u) => u !== url) } : p
    );

  const addShowroomFile = (file: File) => {
    if (existingShowroom.length + showroomFiles.length >= MAX_SHOWROOM_IMAGES) {
      toast.error(`Up to ${MAX_SHOWROOM_IMAGES} showroom images.`);
      return;
    }
    setShowroomFiles((prev) => [...prev, file]);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const form = new FormData();
      for (const field of TEXT_FIELDS) {
        form.append(field, (data[field] as string) ?? '');
      }
      // Blank rows would render as empty tiles on the storefront.
      form.append(
        'visionPoints',
        JSON.stringify(
          points
            .map((p) => ({ label: p.label.trim(), text: p.text.trim() }))
            .filter((p) => p.label || p.text)
        )
      );
      // Kept images; newly uploaded ones are appended server-side.
      form.append('showroomImages', JSON.stringify(existingShowroom));

      if (introFile) form.append('introImageFile', introFile);
      else form.append('introImage', data.introImage ?? '');
      if (profileFile) form.append('profileImageFile', profileFile);
      else form.append('profileImage', data.profileImage ?? '');
      showroomFiles.forEach((f) => form.append('showroomImageFiles', f));

      const res = await api.put('/about', form);
      if (res.data?.success) {
        setData(res.data.data);
        setIntroFile(null);
        setProfileFile(null);
        setShowroomFiles([]);
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

  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="About Page"
        description="Company profile, vision and showroom — the authored blocks of the storefront's About page."
        action={saveButton}
      />

      <div className="max-w-[820px] space-y-6 pb-24">
        {/* Intro */}
        <Reveal>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Top of page" title="Intro" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Eyebrow" htmlFor="intro-eyebrow" hint="Small uppercase line.">
                  <Input
                    id="intro-eyebrow"
                    value={data.introEyebrow ?? ''}
                    onChange={(e) => set('introEyebrow', e.target.value)}
                    placeholder="About Us"
                  />
                </Field>
                <Field label="Heading" htmlFor="intro-title">
                  <Input
                    id="intro-title"
                    value={data.introTitle ?? ''}
                    onChange={(e) => set('introTitle', e.target.value)}
                    placeholder="BELOVI"
                  />
                </Field>
              </div>
              <Field
                label="Introduction"
                htmlFor="intro-body"
                optional
                hint="Blank line for a new paragraph. **bold** and *italic* are honoured."
              >
                <Textarea
                  id="intro-body"
                  rows={4}
                  value={data.introBody ?? ''}
                  onChange={(e) => set('introBody', e.target.value)}
                />
              </Field>
              <ImagePicker
                label="Banner Image"
                file={introFile}
                url={assetUrl(data.introImage) || null}
                onSelect={setIntroFile}
                onClear={() => {
                  setIntroFile(null);
                  set('introImage', '');
                }}
                hint="Wide crop, 16:9. Optional."
              />
            </div>
          </Card>
        </Reveal>

        {/* Company profile */}
        <Reveal delay={0.04}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Block one" title="Company Profile" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Eyebrow" htmlFor="profile-eyebrow">
                  <Input
                    id="profile-eyebrow"
                    value={data.profileEyebrow ?? ''}
                    onChange={(e) => set('profileEyebrow', e.target.value)}
                    placeholder="Company Profile"
                  />
                </Field>
                <Field label="Heading" htmlFor="profile-title">
                  <Input
                    id="profile-title"
                    value={data.profileTitle ?? ''}
                    onChange={(e) => set('profileTitle', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Body" htmlFor="profile-body" optional>
                <Textarea
                  id="profile-body"
                  rows={6}
                  value={data.profileBody ?? ''}
                  onChange={(e) => set('profileBody', e.target.value)}
                />
              </Field>
              <ImagePicker
                label="Profile Image"
                file={profileFile}
                url={assetUrl(data.profileImage) || null}
                onSelect={setProfileFile}
                onClear={() => {
                  setProfileFile(null);
                  set('profileImage', '');
                }}
                hint="Square crop, 1:1."
              />
            </div>
          </Card>
        </Reveal>

        {/* Vision */}
        <Reveal delay={0.08}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Block two" title="Vision" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Eyebrow" htmlFor="vision-eyebrow">
                  <Input
                    id="vision-eyebrow"
                    value={data.visionEyebrow ?? ''}
                    onChange={(e) => set('visionEyebrow', e.target.value)}
                    placeholder="Our Vision"
                  />
                </Field>
                <Field label="Heading" htmlFor="vision-title">
                  <Input
                    id="vision-title"
                    value={data.visionTitle ?? ''}
                    onChange={(e) => set('visionTitle', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Body" htmlFor="vision-body" optional>
                <Textarea
                  id="vision-body"
                  rows={5}
                  value={data.visionBody ?? ''}
                  onChange={(e) => set('visionBody', e.target.value)}
                />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Vision Points
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {points.length} {points.length === 1 ? 'point' : 'points'}
                  </span>
                </div>
                <div className="space-y-3">
                  {points.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-end">
                      <Field label="Label" htmlFor={`vp-label-${i}`}>
                        <Input
                          id={`vp-label-${i}`}
                          value={p.label}
                          placeholder="e.g. Craft"
                          onChange={(e) => patchPoint(i, { label: e.target.value })}
                        />
                      </Field>
                      <Field label="Text" htmlFor={`vp-text-${i}`}>
                        <Input
                          id={`vp-text-${i}`}
                          value={p.text}
                          placeholder="One sentence."
                          onChange={(e) => patchPoint(i, { text: e.target.value })}
                        />
                      </Field>
                      <IconButton
                        label={`Remove point ${i + 1}`}
                        tone="danger"
                        onClick={() => setPoints(points.filter((_, idx) => idx !== i))}
                        className="mb-1"
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPoints([...points, { label: '', text: '' }])}
                    className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
                  >
                    <Plus size={14} aria-hidden />
                    <span className="eyebrow-tight">Add point</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Showroom */}
        <Reveal delay={0.12}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Block three" title="Showroom" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Eyebrow" htmlFor="showroom-eyebrow">
                  <Input
                    id="showroom-eyebrow"
                    value={data.showroomEyebrow ?? ''}
                    onChange={(e) => set('showroomEyebrow', e.target.value)}
                    placeholder="Showroom"
                  />
                </Field>
                <Field label="Heading" htmlFor="showroom-title">
                  <Input
                    id="showroom-title"
                    value={data.showroomTitle ?? ''}
                    onChange={(e) => set('showroomTitle', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Body" htmlFor="showroom-body" optional>
                <Textarea
                  id="showroom-body"
                  rows={4}
                  value={data.showroomBody ?? ''}
                  onChange={(e) => set('showroomBody', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Address" htmlFor="showroom-address" hint="Line breaks are kept.">
                  <Textarea
                    id="showroom-address"
                    rows={3}
                    value={data.showroomAddress ?? ''}
                    onChange={(e) => set('showroomAddress', e.target.value)}
                  />
                </Field>
                <Field label="Visiting Hours" htmlFor="showroom-hours" hint="Line breaks are kept.">
                  <Textarea
                    id="showroom-hours"
                    rows={3}
                    value={data.showroomHours ?? ''}
                    onChange={(e) => set('showroomHours', e.target.value)}
                    placeholder={'Mon – Sat · 11:00 – 19:00\nSunday by appointment'}
                  />
                </Field>
              </div>
              <Field
                label="Google Maps Embed URL"
                htmlFor="showroom-map"
                optional
                hint="Maps → Share → Embed a map → copy the src=… URL only."
              >
                <Input
                  id="showroom-map"
                  value={data.showroomMapUrl ?? ''}
                  onChange={(e) => set('showroomMapUrl', e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=…"
                />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Showroom Images
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {existingShowroom.length + showroomFiles.length}/{MAX_SHOWROOM_IMAGES}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {existingShowroom.map((url) => (
                    <ImagePicker
                      key={url}
                      url={assetUrl(url)}
                      ratio="aspect-square"
                      onSelect={(file) => {
                        removeExistingShowroom(url);
                        addShowroomFile(file);
                      }}
                      onClear={() => removeExistingShowroom(url)}
                    />
                  ))}
                  {showroomFiles.map((file, i) => (
                    <ImagePicker
                      key={`${file.name}-${file.lastModified}`}
                      file={file}
                      ratio="aspect-square"
                      onSelect={(next) =>
                        setShowroomFiles((prev) => prev.map((f, idx) => (idx === i ? next : f)))
                      }
                      onClear={() =>
                        setShowroomFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                  {existingShowroom.length + showroomFiles.length < MAX_SHOWROOM_IMAGES && (
                    <ImagePicker ratio="aspect-square" onSelect={addShowroomFile} />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* SEO */}
        <Reveal delay={0.16}>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Search" title="SEO" />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Meta Title" htmlFor="meta-title" optional>
                <Input
                  id="meta-title"
                  value={data.metaTitle ?? ''}
                  onChange={(e) => set('metaTitle', e.target.value)}
                  placeholder="About Us — BELOVI"
                />
              </Field>
              <Field label="Meta Description" htmlFor="meta-description" optional>
                <Input
                  id="meta-description"
                  value={data.metaDescription ?? ''}
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
