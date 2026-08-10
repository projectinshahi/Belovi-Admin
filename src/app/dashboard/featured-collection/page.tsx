'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '@/lib/api';
import { PageHeader, Card, CardHeader, Field, Input, Select, Textarea, Button, Spinner } from '@/components/ui';
import { X } from 'lucide-react';
import { SHOP_CATEGORIES } from '@/app/dashboard/products/_components/types';
import { useCategoryNames } from '@/lib/useCategories';

interface IProduct {
  _id: string;
  name: string;
  images: string[];
  category?: string;
}

interface FeaturedCollection {
  eyebrow: string;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  isVisible: boolean;
  products: IProduct[];
  images: string[];
}

export default function FeaturedCollectionPage() {
  const [data, setData] = useState<FeaturedCollection | null>(null);
  const [allProducts, setAllProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Narrows the "Add a Piece" list to one category. Curation stays manual — this
  // only makes a long catalogue navigable. Offers the same union a piece can be
  // filed under (fixed + studio), so no piece is unreachable. Empty = every piece.
  const [categoryFilter, setCategoryFilter] = useState('');
  const studioCategories = useCategoryNames();
  const categoryOptions = [
    ...SHOP_CATEGORIES,
    ...(studioCategories ?? []).filter((c) => !SHOP_CATEGORIES.includes(c)),
  ];

  useEffect(() => {
    Promise.all([
      api.get('/featured-collection').then(res => res.data?.data),
      api.get('/products').then(res => res.data?.data)
    ])
      .then(([collectionData, productsData]) => {
        setData(collectionData || {
          eyebrow: '',
          heading: '',
          description: '',
          ctaLabel: '',
          ctaHref: '',
          isVisible: true,
          products: [],
          images: []
        });
        setAllProducts(productsData || []);
      })
      .catch((e) => toast.error(apiErrorMessage(e, 'Could not load Featured Collection.')))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof FeaturedCollection, v: any) => setData((p) => (p ? { ...p, [k]: v } : p));

  const addProduct = (productId: string) => {
    if (!data) return;
    const prod = allProducts.find(p => p._id === productId);
    if (!prod || data.products.some(p => p._id === productId)) return;
    setData({ ...data, products: [...data.products, prod] });
  };

  const removeProduct = (productId: string) => {
    if (!data) return;
    setData({ ...data, products: data.products.filter(p => p._id !== productId) });
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    if (!data) return;
    const newProducts = [...data.products];
    if (index + direction < 0 || index + direction >= newProducts.length) return;
    const temp = newProducts[index];
    newProducts[index] = newProducts[index + direction];
    newProducts[index + direction] = temp;
    setData({ ...data, products: newProducts });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('eyebrow', data.eyebrow);
      formData.append('heading', data.heading);
      formData.append('description', data.description);
      formData.append('ctaLabel', data.ctaLabel);
      formData.append('ctaHref', data.ctaHref);
      formData.append('isVisible', String(data.isVisible));
      
      const productIds = data.products.map(p => p._id);
      formData.append('products', JSON.stringify(productIds));
      
      if (data.images && data.images.length > 0) {
        formData.append('images', data.images[0]); // sending existing image url
      }

      const res = await api.put('/featured-collection', formData);
      if (res.data?.success) {
        setData(res.data.data);
        toast.success('Featured Collection updated');
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data) return null;

  // Pieces not already featured, narrowed to the chosen category.
  const available = allProducts.filter(
    (p) =>
      !data.products.some((dp) => dp._id === p._id) &&
      (!categoryFilter || p.category === categoryFilter)
  );

  return (
    <>
      <PageHeader
        title="Featured Collection"
        description="The product showcase section on the homepage."
        action={
          <Button onClick={save} disabled={saving} variant="solid" size="sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="max-w-[720px] space-y-6">
        <Card>
          <CardHeader eyebrow="Visibility" title="Display settings" />
          <div className="p-5 sm:p-6 space-y-4">
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={data.isVisible} 
                onChange={(e) => set('isVisible', e.target.checked)} 
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Show this section on the storefront</span>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Copy" title="Headline & Text" />
          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Eyebrow" htmlFor="eyebrow">
                <Input id="eyebrow" value={data.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} placeholder="e.g. Now · The Onam Collection" />
              </Field>
              <Field label="Heading" htmlFor="heading">
                <Input id="heading" value={data.heading} onChange={(e) => set('heading', e.target.value)} placeholder="e.g. Featured Collection" />
              </Field>
            </div>
            <Field label="Description" htmlFor="description">
              <Textarea id="description" value={data.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Optional subtitle text..." />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Call to Action" title="Button Settings" />
          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Button Label" htmlFor="ctaLabel">
                <Input id="ctaLabel" value={data.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="e.g. View All Pieces" />
              </Field>
              <Field label="Button Link" htmlFor="ctaHref">
                <Input id="ctaHref" value={data.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} placeholder="e.g. /products" />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Products" title="Curated Edit" />
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Filter by Category" htmlFor="product-filter">
                <Select
                  id="product-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Add a Piece"
                htmlFor="product-add"
                hint={`${available.length} ${available.length === 1 ? 'piece' : 'pieces'} to choose from.`}
              >
                {/* Controlled at "" so the select snaps back to the placeholder
                    after each pick — this is an action, not a stored value. */}
                <Select
                  id="product-add"
                  value=""
                  onChange={(e) => e.target.value && addProduct(e.target.value)}
                >
                  <option value="" disabled>Select a piece to add...</option>
                  {available.map((p) => (
                    <option key={p._id} value={p._id}>
                      {categoryFilter ? p.name : `${p.name} — ${p.category || '—'}`}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="space-y-2">
              {data.products.length === 0 ? (
                <p className="text-sm text-muted">No products selected. Fallbacks will be shown on the storefront.</p>
              ) : (
                data.products.map((p, i) => (
                  <div key={p._id} className="flex items-center gap-3 p-3 border border-line bg-cream/50">
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => moveProduct(i, -1)} disabled={i === 0} className="disabled:opacity-30 text-ink hover:text-forest transition-colors">
                        ▲
                      </button>
                      <button onClick={() => moveProduct(i, 1)} disabled={i === data.products.length - 1} className="disabled:opacity-30 text-ink hover:text-forest transition-colors">
                        ▼
                      </button>
                    </div>
                    <div className="w-12 h-16 shrink-0 bg-sand relative overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 font-sans text-[14px]">
                      <span className="block truncate">{p.name}</span>
                      <span className="block text-[12px] text-faint truncate">
                        {p.category || '—'}
                      </span>
                    </div>
                    <button onClick={() => removeProduct(p._id)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

      </div>

      <div className="sticky bottom-0 inset-x-0 mt-12 p-4 bg-cream/90 backdrop-blur-md border-t border-line-dark flex justify-end z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
        <Button onClick={save} disabled={saving} variant="solid">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}
