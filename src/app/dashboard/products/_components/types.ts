// Shapes returned by `GET /v1/products` and `GET /v1/categories`, plus the
// constants the product form enforces. Shared by page.tsx, ProductForm and
// VariantEditor so the three agree on one definition.

export interface IVariant {
  size: string;
  price: number;
  oldPrice?: number;
  color?: string;
  material?: string;
  /** Existing image URLs (from the server) — round-tripped in the `variants` JSON. */
  images?: string[];
  /** Newly selected uploads, posted as `variantImages_<index>` (client only). */
  _files?: File[];
}

export interface ISpec {
  label: string;
  value: string;
}

export interface IProduct {
  _id: string;
  name: string;
  category: string;
  /** Legacy descriptor still shown in the pieces table when a piece carries one. */
  garmentType?: string;
  description?: string;
  variants: IVariant[];
  offerText?: string;
  images: string[];
  status: string;
  showOnLandingPage?: boolean;
  collectionName?: string;
  season?: string;
  lifeMode?: string;
  editSection?: string;
  limited?: boolean;
  
  // Furniture Fields
  dimensions?: string;
  materials?: string[];
  warranty?: string;
  features?: string[];
  specifications?: ISpec[];
  careInstructions?: string;
  shippingReturns?: string;
  relatedProducts?: IProduct[] | string[]; // Can be populated array of products or just IDs
}

/**
 * There is deliberately NO category list here.
 *
 * The categories a piece can be filed under are the ones created in Category
 * Management, fetched with `useCategoryNames`. A hardcoded copy used to live at
 * this spot and drive the product dropdown, which is how a piece could end up
 * filed under a name the storefront had no link to. The database is the only
 * source now, on both sides.
 */

/*
 * `LIFE_MODES` and `EDIT_SECTIONS` used to live here, driving the product form's
 * Life Mode and The Edit Page pickers. Both fields were removed from the form,
 * so the lists had nothing left to fill and are gone with them. The `lifeMode`
 * and `editSection` fields themselves still exist on the Product model and are
 * still read by the storefront — they simply have no editor any more.
 */

/**
 * The house limit on the two free-text fields the product page renders, per
 * field — and for features, per FEATURE rather than across the list.
 *
 * Mirrors MAX_DESCRIPTION / MAX_FEATURE in the backend's Product model, which is
 * the real gate: these two only stop the typing, so the studio meets the limit
 * as a full field rather than as a save that is refused.
 */
export const MAX_DESCRIPTION = 200;
export const MAX_FEATURE = 200;

/**
 * Placeholder sent in the `images` array where a freshly uploaded file belongs.
 * The backend swaps each one for its Cloudinary URL in order, so the gallery
 * order set in the form — and with it `images[0]`, the primary shot — survives
 * the round trip instead of new uploads always landing last.
 */
export const NEW_IMAGE_TOKEN = '__new__';

/**
 * Standard sizes for furniture (if applicable). Non-standard sizes are still typeable.
 */
export const SIZE_PRESETS = ['Standard', 'Large', 'Extra Large', 'Sectional', '2-Seater', '3-Seater'] as const;

/** Uploads allowed per product, and per variant. */
export const MAX_IMAGES = 10; // Increased for furniture

/** Per-variant validation messages, keyed by variant index in `ProductForm`. */
export interface VariantFieldErrors {
  size?: string;
  price?: string;
  oldPrice?: string;
}
