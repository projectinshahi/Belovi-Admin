'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { assetUrl } from '@/lib/api';

/**
 * Single-image field with preview, drag-and-drop and removal.
 *
 * Categories, banners and products each hand-rolled their own version of this,
 * including three separate copies of the backend-origin string surgery for
 * building preview URLs. Multi-image fields (products) compose several of
 * these rather than forking the component.
 *
 * Object URLs for File previews are revoked on change/unmount — the previous
 * inline `URL.createObjectURL(file)` calls in render leaked one per keystroke,
 * since they ran on every re-render and were never revoked.
 */
export default function ImagePicker({
  file,
  url,
  onSelect,
  onClear,
  label,
  hint,
  ratio = 'aspect-[4/3]',
  className = '',
}: {
  /** A newly-picked File, if any — takes precedence over `url`. */
  file?: File | null;
  /** An existing image path from the API. */
  url?: string | null;
  onSelect: (file: File) => void;
  onClear?: () => void;
  label?: string;
  hint?: string;
  ratio?: string;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Derived, not state: the URL is a pure function of `file`, so computing it
  // here avoids the extra render that setting it from an effect would cost.
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // Revoking is the part that genuinely belongs in an effect — cleanup runs on
  // the previous value when `file` changes and again on unmount.
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const preview = objectUrl ?? (url ? assetUrl(url) : null);

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0];
    if (picked && picked.type.startsWith('image/')) onSelect(picked);
  };

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block font-sans text-[11px] uppercase tracking-[0.15em] text-muted mb-2"
        >
          {label}
        </label>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative overflow-hidden border border-dashed transition-colors duration-300 ease-editorial ${ratio} ${
          dragging ? 'border-ink bg-beige' : 'border-line bg-ivory hover:border-ink/40'
        }`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={label ? `${label} preview` : 'Selected image preview'}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="eyebrow-tight bg-ivory/90 text-ink border border-line px-2 py-1 hover:bg-ivory transition-colors duration-300 ease-editorial"
              >
                Replace
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  aria-label="Remove image"
                  className="w-[26px] h-[26px] flex items-center justify-center bg-ivory/90 text-muted border border-line hover:text-danger hover:border-danger/40 transition-colors duration-300 ease-editorial"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-faint hover:text-ink transition-colors duration-300 ease-editorial"
          >
            <ImagePlus size={20} aria-hidden />
            <span className="eyebrow-tight">Add image</span>
            {hint && (
              <span className="font-sans text-[11px] text-faint normal-case tracking-normal">
                {hint}
              </span>
            )}
          </button>
        )}
      </div>

      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Allow re-picking the same file after a clear.
          e.target.value = '';
        }}
      />
    </div>
  );
}
