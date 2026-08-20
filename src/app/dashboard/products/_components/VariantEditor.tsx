'use client';

import { useId } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { Field, IconButton, ImagePicker, Input } from '@/components/ui';
import {
  MAX_IMAGES,
  SIZE_PRESETS,
  type IVariant,
  type VariantFieldErrors,
} from './types';

export default function VariantEditor({
  variants,
  onChange,
  errors,
}: {
  variants: IVariant[];
  onChange: (next: IVariant[]) => void;
  errors?: Record<number, VariantFieldErrors>;
}) {
  const uid = useId();

  const patch = (index: number, changes: Partial<IVariant>) => {
    const next = [...variants];
    next[index] = { ...next[index], ...changes };
    onChange(next);
  };

  const addVariant = () =>
    onChange([
      ...variants,
      { size: '', price: 0, oldPrice: 0, color: '', material: '', images: [], _files: [] },
    ]);

  /**
   * Removing a variant removes ITS images with it.
   *
   * This used to move the first variant's images onto whichever variant took its
   * place, which was right when every image lived on variant one and deleting it
   * would have lost the product's only photographs. Now that each variant owns
   * its own, that merge would silently move one option's photography onto a
   * different option — pictures of the ivory chair filed under the black one.
   */
  const applyRemoval = (next: IVariant[]) => onChange(next);

  const removeVariant = (index: number) =>
    applyRemoval(variants.filter((_, i) => i !== index));

  const norm = (s: string) => s.trim().toUpperCase();
  const hasSize = (s: string) => variants.some((v) => norm(v.size || '') === norm(s));

  const toggleSize = (s: string) => {
    const label = norm(s);

    if (hasSize(label)) {
      if (variants.length === 1) {
        toast.error('A product needs at least one size.');
        return;
      }
      applyRemoval(variants.filter((v) => norm(v.size || '') !== label));
      return;
    }

    const template = variants.find((v) => v.price > 0);
    const seeded = {
      size: label,
      price: template?.price ?? 0,
      oldPrice: template?.oldPrice ?? 0,
      color: template?.color ?? '',
      material: template?.material ?? '',
      images: [] as string[],
      _files: [] as File[],
    };

    if (variants.length === 1 && !(variants[0].size || '').trim()) {
      onChange([{ ...variants[0], size: label }]);
      return;
    }
    onChange([...variants, seeded]);
  };

  const addFile = (index: number, file: File) => {
    const variant = variants[index];
    const count = (variant.images?.length || 0) + (variant._files?.length || 0);
    if (count + 1 > MAX_IMAGES) {
      toast.error(`Each variant can have a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    patch(index, { _files: [...(variant._files || []), file] });
  };

  const removeFile = (index: number, fileIdx: number) => {
    const files = [...(variants[index]._files || [])];
    files.splice(fileIdx, 1);
    patch(index, { _files: files });
  };

  const replaceFile = (index: number, fileIdx: number, file: File) => {
    const files = [...(variants[index]._files || [])];
    files.splice(fileIdx, 1, file);
    patch(index, { _files: files });
  };

  const removeExistingImage = (index: number, imgIdx: number) => {
    const images = [...(variants[index].images || [])];
    images.splice(imgIdx, 1);
    patch(index, { images });
  };

  const replaceExistingImage = (index: number, imgIdx: number, file: File) => {
    const variant = variants[index];
    const images = [...(variant.images || [])];
    images.splice(imgIdx, 1);
    patch(index, { images, _files: [...(variant._files || []), file] });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted mb-2">
          Sizes
        </p>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((s) => {
            const active = hasSize(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                aria-pressed={active}
                className={`min-w-[46px] px-3 py-2 border text-[12px] font-sans tracking-wide transition-colors duration-200 ease-editorial ${
                  active
                    ? 'bg-ink text-ivory border-ink'
                    : 'bg-ivory text-muted border-line hover:border-ink/40 hover:text-ink'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p className="font-sans text-[12px] text-faint mt-2">
          Tap to add a size, tap again to remove. Each variant below can carry its own price, color, material, and images.
        </p>
      </div>

      {variants.map((v, i) => {
        const fieldErrors = errors?.[i];
        const imageCount = (v.images?.length || 0) + (v._files?.length || 0);

        return (
          <div key={i} className="border border-line bg-cream p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow-tight text-bronze-deep">Variant {i + 1}</p>
              {variants.length > 1 && (
                <IconButton
                  label={`Remove variant ${i + 1}`}
                  tone="danger"
                  onClick={() => removeVariant(i)}
                >
                  <X size={14} />
                </IconButton>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Size"
                htmlFor={`${uid}-size-${i}`}
                required
                error={fieldErrors?.size}
              >
                <Input
                  id={`${uid}-size-${i}`}
                  type="text"
                  placeholder="Standard"
                  value={v.size || ''}
                  error={!!fieldErrors?.size}
                  onChange={(e) => patch(i, { size: e.target.value })}
                />
              </Field>

              <Field
                label="Price"
                htmlFor={`${uid}-price-${i}`}
                required
                error={fieldErrors?.price}
              >
                <Input
                  id={`${uid}-price-${i}`}
                  type="number"
                  placeholder="₹ Price"
                  value={v.price ? v.price : ''}
                  error={!!fieldErrors?.price}
                  onChange={(e) => patch(i, { price: Number(e.target.value) })}
                />
              </Field>

              {/* The struck-through figure on the storefront. Optional: leave it
                  empty and the piece simply shows one price. */}
              <Field
                label="Original Price"
                htmlFor={`${uid}-old-price-${i}`}
                error={fieldErrors?.oldPrice}
                hint="Shown struck through beside the price."
              >
                <Input
                  id={`${uid}-old-price-${i}`}
                  type="number"
                  placeholder="₹ Before discount"
                  value={v.oldPrice ? v.oldPrice : ''}
                  error={!!fieldErrors?.oldPrice}
                  onChange={(e) => patch(i, { oldPrice: Number(e.target.value) })}
                />
              </Field>

              <Field
                label="Color"
                htmlFor={`${uid}-color-${i}`}
              >
                <Input
                  id={`${uid}-color-${i}`}
                  type="text"
                  placeholder="e.g. Ivory"
                  value={v.color || ''}
                  onChange={(e) => patch(i, { color: e.target.value })}
                />
              </Field>

              <Field
                label="Material"
                htmlFor={`${uid}-material-${i}`}
              >
                <Input
                  id={`${uid}-material-${i}`}
                  type="text"
                  placeholder="e.g. Linen"
                  value={v.material || ''}
                  onChange={(e) => patch(i, { material: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                  Variant Images
                </span>
                <span className="font-sans text-[11px] text-faint tabular-nums">
                  {imageCount}/{MAX_IMAGES}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(v.images || []).map((url, imgIdx) => (
                  <ImagePicker
                    key={`saved-${imgIdx}-${url}`}
                    url={url}
                    ratio="aspect-square"
                    onSelect={(file) => replaceExistingImage(i, imgIdx, file)}
                    onClear={() => removeExistingImage(i, imgIdx)}
                  />
                ))}

                {(v._files || []).map((file, fileIdx) => (
                  <ImagePicker
                    key={`new-${fileIdx}-${file.name}-${file.lastModified}`}
                    file={file}
                    ratio="aspect-square"
                    onSelect={(next) => replaceFile(i, fileIdx, next)}
                    onClear={() => removeFile(i, fileIdx)}
                  />
                ))}

                {imageCount < MAX_IMAGES && (
                  <ImagePicker
                    ratio="aspect-square"
                    onSelect={(file) => addFile(i, file)}
                  />
                )}
              </div>

              <p className="font-sans text-[12px] text-faint mt-2">
                Shown first on the product page when this option is selected.
                Leave empty to use the product\u2019s own photographs.
              </p>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addVariant}
        className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-line bg-ivory text-faint hover:text-ink hover:border-ink/40 transition-colors duration-300 ease-editorial"
      >
        <Plus size={14} aria-hidden />
        <span className="eyebrow-tight">Add variant</span>
      </button>
    </div>
  );
}
