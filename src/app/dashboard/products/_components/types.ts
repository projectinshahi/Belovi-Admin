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
 * The five fixed categories a piece can be filed under — the same set the
 * storefront's Shop menu and category filters use. Mirrors `SHOP_CATEGORIES` in
 * the backend's Product model, which rejects anything else; this copy only drives
 * the product form's dropdown.
 *
 * Closed by design: the Product Details page selects from this list and cannot
 * add, rename or delete an entry. Category Management is a separate thing — it
 * holds the studio's editorial categories with their homepage photography, and
 * editing those must not re-shape what a product can be filed under.
 */
export const SHOP_CATEGORIES = [
  'Luxury Furniture',
  'Positioning',
  'Wellness',
  'Accessories',
  'All Products',
];

/** Life modes drive the storefront's "Four Life Modes" section and ?mode= filtering. */
export const LIFE_MODES = ['Ambition', 'Occasion', 'Casual/Out', 'At-Home Identity'];

/** THE EDIT sub-pages a piece can be placed on (empty = not on any Edit page). */
export const EDIT_SECTIONS = ['Within', 'Beyond', 'Furniture', 'Archive'];

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
