'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, PageHeader, Field, Input, Spinner } from '@/components/ui';
import { api, toastApiError } from '@/lib/api';

interface SiteSettings {
  whatsappNumber: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  instagramUrl: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/site-settings', { params: { t: Date.now() } });
      if (res.data?.success) setSettings(res.data.data);
    } catch (e) {
      toastApiError(e, 'Could not load site settings.');
      setError(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof SiteSettings, v: string) => setSettings((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!settings) return;
    if (!settings.whatsappNumber.trim()) return toast.error('WhatsApp number is required.');
    
    setSaving(true);
    try {
      const res = await api.put('/site-settings', settings);
      if (res.data?.success) {
        setSettings(res.data.data);
        toast.success('Settings updated');
      }
    } catch (e) {
      toastApiError(e, 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !settings) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <p className="text-red-500 mb-4">Could not load settings. Please try again later.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!settings) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="The Studio"
        title="Settings"
        description="Site-wide configuration. These details feed the homepage contact band, the Contact page and the footer at once — change one here and it changes everywhere."
        action={<Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>}
      />

      <Card className="p-5 sm:p-6 max-w-2xl">
        <CardHeader eyebrow="Contact" title="How customers reach the house" />
        <div className="space-y-4 mt-4">
          <Field
            label="WhatsApp Number"
            htmlFor="whatsapp-number"
            hint="Include country code without the plus sign, e.g. 917736830303"
            required
          >
            <Input
              id="whatsapp-number"
              value={settings.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value)}
              placeholder="917736830303"
            />
          </Field>

          <Field
            label="Email"
            htmlFor="contact-email"
            hint="Customer care address, shown on the Contact page."
          >
            <Input
              id="contact-email"
              type="email"
              value={settings.contactEmail ?? ''}
              onChange={(e) => set('contactEmail', e.target.value)}
              placeholder="care@belovi.in"
            />
          </Field>

          <Field
            label="Telephone"
            htmlFor="contact-phone"
            optional
            hint="As it should read, e.g. +91 77368 30303. Leave blank to hide the row."
          >
            <Input
              id="contact-phone"
              value={settings.contactPhone ?? ''}
              onChange={(e) => set('contactPhone', e.target.value)}
              placeholder="+91 77368 30303"
            />
          </Field>

          <Field
            label="Address Line"
            htmlFor="address-line"
            optional
            hint="One line for the contact band. The full showroom address lives on the About Page."
          >
            <Input
              id="address-line"
              value={settings.addressLine ?? ''}
              onChange={(e) => set('addressLine', e.target.value)}
              placeholder="Kochi, Kerala"
            />
          </Field>

          <Field label="Instagram URL" htmlFor="instagram-url" optional>
            <Input
              id="instagram-url"
              value={settings.instagramUrl ?? ''}
              onChange={(e) => set('instagramUrl', e.target.value)}
              placeholder="https://www.instagram.com/belovi.in/"
            />
          </Field>
        </div>
        <div className="mt-5">
          <Button variant="solid" size="sm" onClick={save} loading={saving}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
