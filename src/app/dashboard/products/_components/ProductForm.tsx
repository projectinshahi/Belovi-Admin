'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';
import {
  Button,
  Field,
  IconButton,
  ImagePicker,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useCategoryNames } from '@/lib/useCategories';
import VariantEditor from './VariantEditor';
import {
  SHOP_CATEGORIES,
  EDIT_SECTIONS,
  LIFE_MODES,
  MAX_IMAGES,
  type IProduct,
  type ISpec,
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

  const [categoryDraft, setCategory] = useState(product?.category ?? '');

  // Categories the studio created in Category Management; `null` until loaded.
  // Offered alongside the fixed list, which is always available.
  const studioCategories = useCategoryNames();
  const categoryOptions = [
    ...SHOP_CATEGORIES,
    // Dedupe: a studio category may share a name with a fixed one.
    ...(studioCategories ?? []).filter((c) => !SHOP_CATEGORIES.includes(c)),
  ];

  /**
   * Blank when this piece is filed under something no longer on offer — a value
   * from before the list changed, or a studio category since deleted. Saving then
   * trips the same "Required" check as a new piece, forcing a deliberate re-file
   * rather than resubmitting a value the API would refuse.
   *
   * Held as-is while the studio list is still loading, so editing a piece filed
   * under a studio category doesn't flash blank and lose the selection.
   */
  const category =
    studioCategories === null || categoryOptions.includes(categoryDraft) ? categoryDraft : '';

  const [collectionName, setCollectionName] = useState(product?.collectionName ?? '');
  const [editSection, setEditSection] = useState(product?.editSection ?? '');
  const [materials, setMaterials] = useState((product?.materials ?? []).join(', '));
  const [lifeMode, setLifeMode] = useState(product?.lifeMode ?? '');
  const [season, setSeason] = useState(product?.season ?? '');

  // Furniture Specific Fields
  const [dimensions, setDimensions] = useState(product?.dimensions ?? '');
  const [warranty, setWarranty] = useState(product?.warranty ?? '');
  const [features, setFeatures] = useState((product?.features ?? []).join('\n'));
  const [careInstructions, setCareInstructions] = useState(product?.careInstructions ?? '');
  const [shippingReturns, setShippingReturns] = useState(product?.shippingReturns ?? '');
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

  const [specs, setSpecs] = useState<ISpec[]>(() =>
    (product?.specifications ?? []).map((s) => ({ label: s.label, value: s.value }))
  );
  
  const [imageUrls, setImageUrls] = useState(() =>
    product ? product.images.map((url) => assetUrl(url)).join(', ') : ''
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const [variants, setVariants] = useState<IVariant[]>(() => {
    if (!product) {
      return [{ size: '', price: 0, oldPrice: 0, color: '', material: '', images: [], _files: [] }];
    }

    const rows = product.variants.map((v) => ({
      size: v.size,
      price: v.price,
      oldPrice: v.oldPrice,
      color: v.color || '',
      material: v.material || '',
      images: [...(v.images || [])],
      _files: [] as File[],
    }));

    const [first, ...rest] = rows;
    if (first) {
      const seen = new Set(first.images);
      for (const row of rest) {
        for (const url of row.images) {
          if (seen.has(url)) continue;
          seen.add(url);
          first.images.push(url);
        }
        row.images = [];
      }
    }

    return rows;
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

  const urlList = imageUrls.split(',').map((url) => url.trim()).filter((url) => url);
  const setUrlList = (next: string[]) => setImageUrls(next.join(', '));

  const addImageFile = (file: File) => {
    if (imageFiles.length + 1 > MAX_IMAGES) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setImageFiles((prev) => [...prev, file]);
  };

  const replaceImageFile = (index: number, file: File) =>
    setImageFiles((prev) => prev.map((f, i) => (i === index ? file : f)));

  const removeImageFile = (index: number) =>
    setImageFiles((prev) => prev.filter((_, i) => i !== index));

  const replaceUrlWithFile = (index: number, file: File) => {
    if (imageFiles.length + 1 > MAX_IMAGES) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setUrlList(urlList.filter((_, i) => i !== index));
    setImageFiles((prev) => [...prev, file]);
  };

  const patchSpec = (index: number, changes: Partial<ISpec>) =>
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, ...changes } : s)));
  const addSpec = () => setSpecs((prev) => [...prev, { label: '', value: '' }]);
  const removeSpec = (index: number) =>
    setSpecs((prev) => prev.filter((_, i) => i !== index));

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
        fail(`Variant ${i + 1}: Offer Price must be greater than zero.`);
      }
      if (v.oldPrice && v.oldPrice > 0 && v.oldPrice < v.price) {
        vf.oldPrice = 'Actual Price cannot be less than Offer Price';
        fail(
          `Variant ${i + 1}: Actual Price (₹${v.oldPrice}) cannot be less than Offer Price (₹${v.price}).`
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
    
    formData.append('dimensions', dimensions);
    formData.append('warranty', warranty);
    formData.append('careInstructions', careInstructions);
    formData.append('shippingReturns', shippingReturns);
    
    formData.append('collectionName', collectionName);
    formData.append('season', season);
    formData.append('lifeMode', lifeMode);
    formData.append('editSection', editSection);
    formData.append('materials', JSON.stringify(toMaterialsPayload(materials)));
    
    const feats = features.split('\n').map(f => f.trim()).filter(f => f);
    formData.append('features', JSON.stringify(feats));

    const specsPayload = specs
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label && s.value);
    formData.append('specifications', JSON.stringify(specsPayload));

    formData.append('relatedProducts', JSON.stringify(relatedIds));

    const imagesArray = imageUrls.split(',').map((url) => url.trim()).filter((url) => url);
    imagesArray.forEach((url) => formData.append('images', url));

    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        formData.append('imageFiles', file);
      });
    }

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
                hint="A fixed storefront category, or one you created under Categories."
              >
                {/* Grouped so it's clear which names are fixed and which the
                    studio owns. Both are selectable; neither is editable here. */}
                <Select
                  id={`${uid}-category`}
                  value={category}
                  error={!!errors.category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="" disabled>
                    — Select a category —
                  </option>
                  <optgroup label="Storefront categories">
                    {SHOP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                  {categoryOptions.length > SHOP_CATEGORIES.length && (
                    <optgroup label="Your categories">
                      {categoryOptions.slice(SHOP_CATEGORIES.length).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </Field>

              <Field
                label="Dimensions"
                htmlFor={`${uid}-dimensions`}
                optional
                hint="e.g. 90” W x 40” D x 32” H"
              >
                <Input
                  id={`${uid}-dimensions`}
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                />
              </Field>

              <Field
                label="Warranty"
                htmlFor={`${uid}-warranty`}
                optional
                hint="e.g. 10-Year Limited Warranty"
              >
                <Input
                  id={`${uid}-warranty`}
                  type="text"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                />
              </Field>
              
              <Field
                label="Features"
                htmlFor={`${uid}-features`}
                optional
                hint="One feature per line."
              >
                <Textarea
                  id={`${uid}-features`}
                  rows={4}
                  placeholder={'Premium top-grain leather\nKiln-dried hardwood frame'}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
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

            <Section label="Specifications">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Spec Table
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {specs.length} {specs.length === 1 ? 'row' : 'rows'}
                  </span>
                </div>

                <div className="space-y-3">
                  {specs.map((s, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end"
                    >
                      <Field label="Label" htmlFor={`${uid}-spec-label-${i}`}>
                        <Input
                          id={`${uid}-spec-label-${i}`}
                          type="text"
                          placeholder="e.g. Frame"
                          value={s.label}
                          onChange={(e) => patchSpec(i, { label: e.target.value })}
                        />
                      </Field>

                      <Field label="Value" htmlFor={`${uid}-spec-value-${i}`}>
                        <Input
                          id={`${uid}-spec-value-${i}`}
                          type="text"
                          placeholder="e.g. Solid Wood"
                          value={s.value}
                          onChange={(e) => patchSpec(i, { value: e.target.value })}
                        />
                      </Field>

                      <IconButton
                        label={`Remove spec row ${i + 1}`}
                        tone="danger"
                        onClick={() => removeSpec(i)}
                        className="mb-1"
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addSpec}
                    className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
                  >
                    <Plus size={14} aria-hidden />
                    <span className="eyebrow-tight">Add row</span>
                  </button>
                </div>
              </div>
            </Section>

            <Section label="Care & Delivery">
              <Field
                label="Care Instructions"
                htmlFor={`${uid}-care`}
                optional
              >
                <Textarea
                  id={`${uid}-care`}
                  rows={3}
                  placeholder="e.g. Wipe with a damp cloth. Avoid direct sunlight."
                  value={careInstructions}
                  onChange={(e) => setCareInstructions(e.target.value)}
                />
              </Field>

              <Field
                label="Shipping & Returns"
                htmlFor={`${uid}-shipping`}
                optional
              >
                <Textarea
                  id={`${uid}-shipping`}
                  rows={3}
                  placeholder="Only if this piece departs from the site default."
                  value={shippingReturns}
                  onChange={(e) => setShippingReturns(e.target.value)}
                />
              </Field>
            </Section>

            <Section label="Imagery">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                    Uploads
                  </span>
                  <span className="font-sans text-[11px] text-faint tabular-nums">
                    {imageFiles.length}/{MAX_IMAGES} selected
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {urlList.map((url, index) => (
                    <ImagePicker
                      key={`url-${index}-${url}`}
                      url={url}
                      ratio="aspect-square"
                      onSelect={(file) => replaceUrlWithFile(index, file)}
                      onClear={() => setUrlList(urlList.filter((_, i) => i !== index))}
                    />
                  ))}

                  {imageFiles.map((file, index) => (
                    <ImagePicker
                      key={`file-${index}-${file.name}-${file.lastModified}`}
                      file={file}
                      ratio="aspect-square"
                      onSelect={(next) => replaceImageFile(index, next)}
                      onClear={() => removeImageFile(index)}
                    />
                  ))}

                  {imageFiles.length < MAX_IMAGES && (
                    <ImagePicker ratio="aspect-square" onSelect={addImageFile} />
                  )}
                </div>
              </div>
            </Section>

            <Section label="Placement">
              <Field
                label="Life Mode"
                htmlFor={`${uid}-life-mode`}
                optional
                hint="Drives the Four Life Modes section."
              >
                <Select
                  id={`${uid}-life-mode`}
                  value={lifeMode}
                  onChange={(e) => setLifeMode(e.target.value)}
                >
                  <option value="">— None —</option>
                  {LIFE_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="The Edit Page"
                htmlFor={`${uid}-edit-section`}
                optional
                hint="Places this piece on a THE EDIT sub-page."
              >
                <Select
                  id={`${uid}-edit-section`}
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                >
                  <option value="">— None —</option>
                  {EDIT_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Collection" htmlFor={`${uid}-collection`} optional>
                  <Input
                    id={`${uid}-collection`}
                    type="text"
                    placeholder="e.g. Autumn Classics"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                  />
                </Field>
                <Field label="Season" htmlFor={`${uid}-season`} optional>
                  <Input
                    id={`${uid}-season`}
                    type="text"
                    placeholder="e.g. 2026"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                  />
                </Field>
              </div>

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
