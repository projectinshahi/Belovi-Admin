/**
 * One route table for the studio.
 *
 * The Sidebar and the Navbar both derive from this. Navbar previously carried
 * its own if/else `pathname.includes()` chain to title each page, which had
 * silently fallen out of sync — `/dashboard/newsletter` had no case, so that
 * page rendered with the title "Dashboard".
 */

export type NavKey =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'banners'
  | 'collection-section'
  | 'featured-collection'
  | 'about'
  | 'brochures'
  | 'videos'
  | 'customers';

export interface NavItem {
  key: NavKey;
  /** Sidebar label. */
  name: string;
  href: string;
  /** Page title + the eyebrow above it. */
  title: string;
  eyebrow: string;
  /** Match the path exactly rather than by prefix (only /dashboard needs this). */
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    name: 'Overview',
    href: '/dashboard',
    title: 'Overview',
    eyebrow: 'The Studio',
    exact: true,
  },
  {
    key: 'products',
    name: 'Pieces',
    href: '/dashboard/products',
    title: 'Pieces',
    eyebrow: 'The Edit',
  },
  {
    key: 'categories',
    name: 'Categories',
    href: '/dashboard/categories',
    title: 'Categories',
    eyebrow: 'The Edit',
  },
  {
    key: 'orders',
    name: 'Orders',
    href: '/dashboard/orders',
    title: 'Orders',
    eyebrow: 'Fulfilment',
  },
  {
    key: 'banners',
    name: 'Hero Section',
    href: '/dashboard/banners',
    title: 'Hero Section',
    eyebrow: 'Storefront',
  },
  {
    key: 'collection-section',
    name: 'Collection Section',
    href: '/dashboard/collection-section',
    title: 'Collection Section',
    eyebrow: 'Storefront',
  },
  {
    key: 'featured-collection',
    name: 'Featured Collection',
    href: '/dashboard/featured-collection',
    title: 'Featured Collection',
    eyebrow: 'Storefront',
  },
  {
    key: 'about',
    name: 'About Page',
    href: '/dashboard/about',
    title: 'About Page',
    eyebrow: 'Storefront',
  },
  {
    key: 'brochures',
    name: 'Brochures',
    href: '/dashboard/brochures',
    title: 'Brochures',
    eyebrow: 'Storefront',
  },
  {
    key: 'videos',
    name: 'Video Showcase',
    href: '/dashboard/videos',
    title: 'Video Showcase',
    eyebrow: 'Storefront',
  },
  {
    key: 'customers',
    name: 'Customers',
    href: '/dashboard/customers',
    title: 'Customers',
    eyebrow: 'The Register',
  },
];

/** Resolve the nav entry for a pathname, longest (most specific) match first. */
export function navItemForPath(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );
}
