'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import {
  Button,
  Field,
  IconButton,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useCategoryNames } from '@/lib/useCategories';
import VariantEditor from './VariantEditor';
import {
  MAX_DESCRIPTION,
  MAX_FEATURE,
  type IProduct,
  type IVariant,
  type VariantFieldErrors,
} from './types';

interface FormErrors {
  name?: string;
  category?: string;
  variants?: string;
  variantFields?: Record<number, VariantFieldErrors>;
}

const toMaterialsPayload = (raw: string): string[] => {
  const seen = new Set<string>();
  return raw.split(',').reduce<string[]>((out, part) => {
    const label = part.trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return out;
    seen.add(key);
    return [...out, label];
  }, []);
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <p className="eyebrow text-bronze-deep mb-4">{label}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: IProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [name, setName] = useState(product?.name ?? '');
  // The paragraph under the discount badge on the product page.
  // Clipped on load for the same reason as features, below.
  const [description, setDescription] = useState(
    (product?.description ?? '').slice(0, MAX_DESCRIPTION)
  );

  const [categoryDraft, setCategory] = useState(product?.category ?? '');

  // Every category there is, from Category Management. `null` until loaded.
  const categoryOptions = useCategoryNames();

  /**
   * Blank when this piece is filed under something no longer on offer — a
   * category since deleted or switched off. Saving then trips the same
   * "Required" check as a new piece, forcing a deliberate re-file rather than
   * resubmitting a value the API would refuse.
   *
   * Held as-is while the list is still loading, so editing a piece doesn't flash
   * blank and lose its selection.
   */
  const category =
    categoryOptions === null || categoryOptions.includes(categoryDraft) ? categoryDraft : '';

  // Drives the status pill on the storefront's featured cards ("Best seller",
  // "Premium", "New"). The field already existed on the model and the card
  // renderer already read it — there was simply no way to set it from here.
  const [offerText, setOfferText] = useState(product?.offerText ?? '');
  const [materials, setMaterials] = useState((product?.materials ?? []).join(', '));
  /* Clipped on the way IN as well as while typing. A piece saved before the
     limit existed can hold more than this; loaded as-is it would sit in the form
     over the cap, be impossible to shorten by typing, and fail the backend
     validator on save with no obvious cause. Clipping here means the counter
     tells the truth from the first render and the save goes through. */
  const [features, setFeatures] = useState(
    (product?.features ?? []).map((f) => f.slice(0, MAX_FEATURE)).join('\n')
  );

  /**
   * Features are one per line, so the cap is per LINE — a textarea's `maxLength`
   * would cap the whole box instead, which would mean three short features
   * exhausting the allowance of the fourth. Each line is clipped as it is typed,
   * giving the same "you simply cannot type past it" behaviour `maxLength` gives
   * the description, and the counter below says which line is at the limit.
   */
  const onFeaturesChange = (raw: string) =>
    setFeatures(
      raw
        .split('\n')
        .map((line) => line.slice(0, MAX_FEATURE))
        .join('\n')
    );

  const featureLines = features.split('\n').map((f) => f.trim()).filter(Boolean);
  const longestFeature = featureLines.reduce((max, f) => Math.max(max, f.length), 0);
  // Curated "Complete the Look" links, held as ids. This was a free-text field
  // asking the studio to paste comma-separated Mongo ObjectIds by hand — one
  // typo produced a silently broken rail on the storefront, and there was no way
  // to see what was already linked.
  const [relatedIds, setRelatedIds] = useState<string[]>(() =>
    (product?.relatedProducts ?? []).map((rp) =>
      typeof rp === 'string' ? rp : (rp as { _id: string })._id
    )
  );
  /** Every other product, for the picker below. */
  const [catalogue, setCatalogue] = useState<IProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/products')
      .then((r) => {
        if (cancelled) return;
        const all: IProduct[] = Array.isArray(r.data?.data) ? r.data.data : [];
        // A piece cannot be related to itself.
        setCatalogue(all.filter((p) => p._id !== product?._id));
      })
      .catch(() => {
        // Picker stays empty; already-linked pieces still render by id.
      });
    return () => {
      cancelled = true;
    };
  }, [product?._id]);

  const relatedChosen = relatedIds.map(
    (rid) => catalogue.find((p) => p._id === rid) ?? ({ _id: rid, name: rid } as IProduct)
  );
  const relatedAvailable = catalogue.filter((p) => !relatedIds.includes(p._id));


  const [variants, setVariants] = useState<IVariant[]>(() => {
    if (!product) {
      return [{ size: '', price: 0, oldPrice: 0, color: '', material: '', images: [], _files: [] }];
    }

    /* Each variant keeps its OWN images, exactly as stored.
     *
     * This used to pool every variant's images into the first and empty the
     * rest on load. Uploading to the second colourway therefore worked once —
     * the backend files them by index — and was destroyed the next time anyone
     * opened the piece to edit it: the form re-hydrated with them all under the
     * first variant, and saving wrote that back. Per-variant photography could
     * never survive a second edit, which is the whole point of it. */
    return product.variants.map((v) => ({
      size: v.size,
      price: v.price,
      oldPrice: v.oldPrice,
      color: v.color || '',
      material: v.material || '',
      images: [...(v.images || [])],
      _files: [] as File[],
    }));
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = document.body.style.overflow;
    root.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    return () => {
      root.classList.remove('modal-open');
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      restoreFocusRef.current?.focus?.();
    };
  }, []);


  const validate = (): { errors: FormErrors; message: string | null } => {
    const found: FormErrors = { variantFields: {} };
    let message: string | null = null;
    const fail = (m: string) => {
      if (!message) message = m;
    };

    if (!name.trim()) {
      found.name = 'Required.';
      fail('Name is required.');
    }
    if (!category) {
      found.category = 'Required.';
      fail('Category is required.');
    }
    if (variants.length === 0) {
      found.variants = 'At least one variant is required.';
      fail('At least one variant is required.');
    }

    variants.forEach((v, i) => {
      const vf: VariantFieldErrors = {};
      if (!v.size.trim()) {
        vf.size = 'Size is required.';
        fail(`Variant ${i + 1}: Size is required.`);
      }
      if (v.price <= 0) {
        vf.price = 'Must be greater than zero.';
        fail(`Variant ${i + 1}: Price must be greater than zero.`);
      }
      if (v.oldPrice && v.oldPrice > 0 && v.oldPrice < v.price) {
        vf.oldPrice = 'Cannot be less than the price.';
        fail(
          `Variant ${i + 1}: Original Price (₹${v.oldPrice}) cannot be less than the Price (₹${v.price}).`
        );
      }
      if (Object.keys(vf).length > 0) found.variantFields![i] = vf;
    });

    return { errors: found, message };
  };

  const handleSubmit = async () => {
    const { errors: found, message } = validate();
    setErrors(found);
    if (message) {
      toast.error(message);
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description.trim());
    formData.append('category', category);
    
    const variantsPayload = variants.map((v) => ({
      size: v.size,
      price: v.price,
      oldPrice: v.oldPrice,
      color: v.color?.trim() || '',
      material: v.material?.trim() || '',
      images: v.images || [],
    }));
    formData.append('variants', JSON.stringify(variantsPayload));

    variants.forEach((v, i) => {
      (v._files || []).forEach((file) => formData.append(`variantImages_${i}`, file));
    });
    
    /* Dimensions, warranty, the spec table, care and delivery copy, life mode,
       Edit page, collection and season are no longer edited here, so they are no
       longer sent. Absent fields are left alone by `findByIdAndUpdate`, so
       whatever a piece already carries is preserved rather than blanked. */
    formData.append('offerText', offerText.trim());
    formData.append('materials', JSON.stringify(toMaterialsPayload(materials)));
    
    const feats = features.split('\n').map(f => f.trim()).filter(f => f);
    formData.append('features', JSON.stringify(feats));

    formData.append('relatedProducts', JSON.stringify(relatedIds));

    /* No product-level `images` are sent: this form no longer manages them.
       The backend leaves the field untouched when a request omits it, so a
       piece keeps whatever photographs it already had. Per-variant images are
       unaffected — they travel on their own `variantImages_<i>` fields. */

    try {
      const res = product
        ? await api.put(`/products/${product._id}`, formData)
        : await api.post('/products', formData);

      const data = res.data;
      if (data.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully');
        onSaved();
      } else {
        toast.error(data.message || 'Failed to save product');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error connecting to backend'));
    } finally {
      setSaving(false);
    }
  };

  const title = product ? 'Edit Piece' : 'Add Piece';

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />

      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { x: '100%' }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: '100%' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-ivory border-l border-line w-full max-w-[560px] h-full flex flex-col focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-line shrink-0">
          <div className="min-w-0">
            <p className="eyebrow text-bronze-deep mb-1">
              {product ? 'The Edit' : 'New Piece'}
            </p>
            <h2 className="font-display font-light text-2xl leading-tight text-ink truncate">
              {product ? product.name || title : title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-line text-muted hover:text-ink hover:border-ink/30 transition-colors duration-300 ease-editorial"
          >
            <X size={16} />
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto thin-scrollbar p-5 sm:p-6 space-y-6">
            <Section label="Details">
              <Field label="Name" htmlFor={`${uid}-name`} required error={errors.name}>
                <Input
                  id={`${uid}-name`}
                  type="text"
                  value={name}
                  error={!!errors.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              <Field
                label="Category"
                htmlFor={`${uid}-category`}
                required
                error={errors.category}
                hint={
                  categoryOptions?.length === 0
                    ? 'No categories yet — create one under Categories first.'
                    : 'The categories you created under Categories.'
                }
              >
                {/* Exactly the saved categories. Nothing is offered here that
                    the storefront cannot link to, because both read one table. */}
                <Select
                  id={`${uid}-category`}
                  value={category}
                  error={!!errors.category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="" disabled>
                    {categoryOptions === null
                      ? 'Loading categories…'
                      : categoryOptions.length === 0
                        ? 'No categories created yet'
                        : '— Select a category —'}
                  </option>
                  {(categoryOptions ?? []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Description"
                htmlFor={`${uid}-description`}
                optional
                hint={`Shown under the discount badge. ${description.length}/${MAX_DESCRIPTION} characters.`}
              >
                <Textarea
                  id={`${uid}-description`}
                  rows={3}
                  maxLength={MAX_DESCRIPTION}
                  placeholder="e.g. A sculptural statement piece designed to bring comfort, elegance and versatility into your space."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <Field
                label="Status Badge"
                htmlFor={`${uid}-offer-text`}
                optional
                hint="Shown as a red pill on the storefront card, e.g. Best seller, Premium, New."
              >
                <Input
                  id={`${uid}-offer-text`}
                  type="text"
                  placeholder="e.g. Best seller"
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                />
              </Field>

              <Field
                label="Features"
                htmlFor={`${uid}-features`}
                optional
                hint={
                  featureLines.length === 0
                    ? `One per line, up to ${MAX_FEATURE} characters each. Shown on the product page.`
                    : `${featureLines.length} feature${featureLines.length === 1 ? '' : 's'} · ` +
                      `longest ${longestFeature}/${MAX_FEATURE} characters.`
                }
              >
                <Textarea
                  id={`${uid}-features`}
                  rows={4}
                  placeholder={'Premium top-grain leather\nKiln-dried hardwood frame'}
                  value={features}
                  onChange={(e) => onFeaturesChange(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Variants">
              {errors.variants && (
                <p className="font-sans text-[12px] text-danger">{errors.variants}</p>
              )}
              <VariantEditor
                variants={variants}
                onChange={setVariants}
                errors={errors.variantFields}
              />
            </Section>



            <Section label="Materials & Links">
              <Field
                label="Materials"
                htmlFor={`${uid}-materials`}
                optional
                hint="Comma separated, e.g. Leather, Wood."
              >
                <Input
                  id={`${uid}-materials`}
                  type="text"
                  placeholder="e.g. Leather, Wood"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                />
              </Field>

              <Field
                label="Related Products"
                htmlFor={`${uid}-related-products`}
                optional
                hint={
                  relatedIds.length
                    ? `${relatedIds.length} linked. These lead the "Complete the Look" rail.`
                    : 'Leave empty and the storefront shows other pieces from the same category.'
                }
              >
                {/* Controlled at "" so the select returns to its placeholder
                    after each pick — this is an action, not a stored value. */}
                <Select
                  id={`${uid}-related-products`}
                  value=""
                  disabled={relatedAvailable.length === 0}
                  onChange={(e) => {
                    const picked = e.target.value;
                    if (picked) setRelatedIds((prev) => [...prev, picked]);
                  }}
                >
                  <option value="" disabled>
                    {relatedAvailable.length === 0
                      ? 'No other pieces to link'
                      : 'Add a piece…'}
                  </option>
                  {relatedAvailable.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — {p.category || '—'}
                    </option>
                  ))}
                </Select>
              </Field>

              {relatedChosen.length > 0 && (
                <ul className="space-y-2">
                  {relatedChosen.map((p, i) => (
                    <li
                      key={p._id}
                      className="flex items-center gap-3 border border-line bg-cream/50 p-3"
                    >
                      <span className="eyebrow text-faint w-5 shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {p.name}
                        {p.category ? (
                          <span className="text-muted"> — {p.category}</span>
                        ) : null}
                      </span>
                      <IconButton
                        label={`Remove ${p.name}`}
                        onClick={() =>
                          setRelatedIds((prev) => prev.filter((rid) => rid !== p._id))
                        }
                      >
                        <X size={14} aria-hidden />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="p-5 sm:p-6 border-t border-line shrink-0 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="sm" loading={saving}>
              {product ? 'Update Piece' : 'Create Piece'}
            </Button>
          </div>
        </form>
      </motion.aside>
    </div>,
    document.body
  );
}
