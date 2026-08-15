'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Textarea, Spinner } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';

interface StudioNote {
  eyebrow: string; heading: string; description: string; ctaLabel: string; ctaHref: string;
}

export default function StudioNotesPage() {
  const [n, setN] = useState<StudioNote | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/studio-note');
      if (res.data?.success) setN(res.data.data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load Studio Notes.'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof StudioNote, v: string) => setN((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!n) return;
    if (!n.heading.trim()) return toast.error('A heading is required.');
    setSaving(true);
    try {
      const res = await api.put('/studio-note', n);
      if (res.data?.success) { setN(res.data.data); toast.success('Studio Notes updated'); }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  if (!n) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Storefront"
        title="Studio Notes"
        /* The block this edits is not mounted on the redesigned homepage. The
           data still saves and is still here. */
        description="Not currently shown on the storefront. Saved and kept — the Studio Notes block is not part of the redesigned home page."
        action={<Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>}
      />

      <Card className="p-5 sm:p-6 max-w-3xl">
        <CardHeader eyebrow="Content" title="Studio Notes section" />
        <div className="space-y-4 mt-4">
          <Field label="Section label" htmlFor="sn-eyebrow" hint="Small uppercase line above the heading.">
            <Input id="sn-eyebrow" value={n.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
          </Field>
          <Field label="Main heading" htmlFor="sn-heading" required>
            <Input id="sn-heading" value={n.heading} onChange={(e) => set('heading', e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="sn-description">
            <Textarea id="sn-description" rows={5} value={n.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Button text" htmlFor="sn-cta-label" hint="e.g. View the Collection">
              <Input id="sn-cta-label" value={n.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} />
            </Field>
            <Field label="Button link" htmlFor="sn-cta-href" hint="e.g. /products or /about">
              <Input id="sn-cta-href" value={n.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="mt-5">
          <Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
