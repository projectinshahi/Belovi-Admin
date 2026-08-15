'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  Field,
  IconButton,
  ImagePicker,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { NEW_IMAGE_TOKEN } from '@/app/dashboard/products/_components/types';

/**
 * Featured Collection — the homepage rail.
 *
 * A CARD IS A GROUP OF PIECES. The workflow is: name the badge → add the pieces
 * that belong to it → adjust the card → save. Selecting a card on the storefront
 * shows its pieces together beneath the rail.
 *
 * The BADGE is free text and deliberately unrelated to any product's category —
 * "Best seller" is a claim the studio makes, not a fact the catalogue holds.
 *
 * Title, subtitle and image are overrides. Left empty, each falls back to the
 * FIRST piece's name, category and photograph, so a usable card costs a badge
 * and one dropdown.
 *
 * ORDER IS POSITION, twice over: the cards' order in this list is the rail's
 * order, and the pieces' order within a card is the order they are shown in.
 * Both are moved with arrows and neither has a separate sort field, because
 * position already is the fact.
 */

interface FeaturedCard {
  /**
   * The card's own id, blank until it has been saved once. Carried back to the
   * API untouched: this card has a listing page at `/collections/<id>`, and
   * dropping it here would mint a new id on every save and break every link the
   * studio had shared.
   */
  _id: string;
  /** Product ids, in display order. At least one. */
  products: string[];
  /** Overrides the first piece's photograph. `_file` supersedes it until saved. */
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  /** Picked in this session, not yet uploaded (client only). */
  _file?: File | null;
}

interface Section {
  heading: string;
  description: string;
  isVisible: boolean;
}

interface IProduct {
  _id: string;
  name: string;
  category?: string;
  images?: string[];
  variants?: { images?: string[] }[];
}

const BADGE_SUGGESTIONS = ['Best seller', 'Premium', 'New', 'Limited', 'Sale'];

const blankCard = (): FeaturedCard => ({
  _id: '',
  products: [],
  image: '',
  badge: '',
  title: '',
  subtitle: '',
  _file: null,
});

/** The API returns `products` populated; the form only needs their ids. */
const toCard = (c: {
  _id?: string;
  products?: (string | { _id?: string } | null)[];
  image?: string;
  badge?: string;
  title?: string;
  subtitle?: string;
}): FeaturedCard => ({
  _id: c._id ?? '',
  products: (c.products ?? [])
    .map((p) => (typeof p === 'string' ? p : (p?._id ?? '')))
    .filter(Boolean),
  image: c.image ?? '',
  badge: c.badge ?? '',
  title: c.title ?? '',
  subtitle: c.subtitle ?? '',
  _file: null,
});

/** Move an item within an array. Returns the same array when it cannot move. */
const shift = <T,>(list: T[], from: number, dir: -1 | 1): T[] => {
  const to = from + dir;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

/** First photograph a piece can offer — its own, else its first variant's. */
const productImage = (p?: IProduct) => p?.images?.[0] || p?.variants?.[0]?.images?.[0] || '';

export default function FeaturedCollectionPage() {
  const [section, setSection] = useState<Section | null>(null);
  const [cards, setCards] = useState<FeaturedCard[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/featured-collection').then((r) => r.data?.data),
      api.get('/products').then((r) => r.data?.data),
    ])
      .then(([collection, prods]) => {
        setSection({
          heading: collection?.heading ?? '',
          description: collection?.description ?? '',
          isVisible: collection?.isVisible ?? true,
        });
        setCards((collection?.cards ?? []).map(toCard));
        setProducts(Array.isArray(prods) ? prods : []);
      })
      .catch((e) => toast.error(apiErrorMessage(e, 'Could not load Featured Collection.')))
      .finally(() => setLoading(false));
  }, []);

  const productById = (id: string) => products.find((p) => p._id === id);

  const patch = (index: number, changes: Partial<FeaturedCard>) =>
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...changes } : c)));

  /**
   * Adding the FIRST piece fills the card in: its photograph, its name as the
   * title and its category as the subtitle — the shape the rail already had.
   * Each is only a starting point and stays editable, and nothing already typed
   * or uploaded is overwritten. Later pieces change none of it, since the card's
   * identity is the group rather than any one member.
   *
   * The badge is untouched throughout, on purpose: it is the studio's own claim
   * about the group, not a fact carried over from a piece.
   */
  const addProduct = (index: number, id: string) => {
    const card = cards[index];
    if (!id || card.products.includes(id)) return;
    const isFirst = card.products.length === 0;
    const p = productById(id);
    patch(index, {
      products: [...card.products, id],
      ...(isFirst
        ? {
            image: !card.image && !card._file ? productImage(p) : card.image,
            title: card.title || p?.name || '',
            subtitle: card.subtitle || p?.category || '',
          }
        : {}),
    });
  };

  const removeProduct = (index: number, id: string) =>
    patch(index, { products: cards[index].products.filter((p) => p !== id) });

  const moveProduct = (index: number, at: number, dir: -1 | 1) =>
    patch(index, { products: shift(cards[index].products, at, dir) });

  const addCard = () => setCards((prev) => [...prev, blankCard()]);

  const removeCard = (index: number) => setCards((prev) => prev.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => setCards((prev) => shift(prev, index, dir));

  const save = async () => {
    if (!section) return;

    const blank = cards.findIndex((c) => c.products.length === 0);
    if (blank !== -1) {
      toast.error(`Card ${blank + 1} needs at least one product.`);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('heading', section.heading);
      formData.append('description', section.description);
      formData.append('isVisible', String(section.isVisible));

      /* A token stands in for each freshly picked file; the files follow in the
         same order and the backend swaps them back in position — so reordering
         and uploading in one save cannot pair a card with another's photograph. */
      formData.append(
        'cards',
        JSON.stringify(
          cards.map((c) => ({
            // Omitted entirely when blank, so the API mints one for a new card
            // instead of choking on an empty string where an id belongs.
            ...(c._id ? { _id: c._id } : {}),
            products: c.products,
            image: c._file ? NEW_IMAGE_TOKEN : c.image,
            badge: c.badge,
            title: c.title,
            subtitle: c.subtitle,
          }))
        )
      );
      cards.forEach((c) => {
        if (c._file) formData.append('cardImages', c._file);
      });

      const res = await api.put('/featured-collection', formData);
      if (res.data?.success) {
        // Re-seed from what was stored, so uploaded files become real URLs and
        // the pickers stop holding File objects that are already saved.
        setCards((res.data.data?.cards ?? []).map(toCard));
        toast.success('Featured Collection updated');
      } else {
        toast.error(res.data?.message || 'Save failed.');
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

  if (!section) return null;

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Featured Collection"
        description="The rail of cards on the homepage. Each card is a named group of pieces; selecting it on the storefront shows them together."
        action={
          <Button onClick={save} disabled={saving} variant="solid" size="sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        }
      />

      <div className="max-w-[900px] space-y-6">
        <Card className="p-5 sm:p-6">
          <CardHeader eyebrow="Section" title="Heading & visibility" />
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Heading" htmlFor="fc-heading">
                <Input
                  id="fc-heading"
                  value={section.heading}
                  onChange={(e) => setSection({ ...section, heading: e.target.value })}
                  placeholder="e.g. Featured collection"
                />
              </Field>
              <Field label="Description" htmlFor="fc-description">
                <Textarea
                  id="fc-description"
                  rows={2}
                  value={section.description}
                  onChange={(e) => setSection({ ...section, description: e.target.value })}
                  placeholder="A thoughtfully curated collection…"
                />
              </Field>
            </div>
            <div className="border-t border-line pt-4">
              <Checkbox
                label="Show this section on the storefront"
                description="Unticked — or with no cards — the band does not render at all."
                checked={section.isVisible}
                onChange={(checked) => setSection({ ...section, isVisible: checked })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader
            eyebrow="Cards"
            title="Featured cards"
            description="Add the pieces that belong together, name the badge, adjust the card. Arrows reorder — both the cards and the pieces inside them."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={addCard}
                disabled={products.length === 0}
              >
                <Plus size={13} aria-hidden />
                Add Card
              </Button>
            }
          />

          {products.length === 0 && (
            <p className="mt-4 border border-line bg-cream/60 p-3 font-sans text-[13px] text-muted">
              No pieces in the catalogue yet. Add one under <strong>Products</strong> first —
              a card is built from a piece.
            </p>
          )}

          <div className="mt-5 space-y-5">
            {cards.length === 0 ? (
              <EmptyState
                title="No cards yet"
                message="Add a card to feature a piece on the homepage."
                action={
                  <Button
                    variant="solid"
                    size="sm"
                    onClick={addCard}
                    disabled={products.length === 0}
                  >
                    Add Card
                  </Button>
                }
              />
            ) : (
              cards.map((card, i) => {
                const available = products.filter((p) => !card.products.includes(p._id));
                return (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-5 border border-line p-4 sm:grid-cols-[168px_1fr]"
                >
                  {/* Shown at the card's real 4:5, so what is cropped here is
                      what is cropped on the storefront. */}
                  <ImagePicker
                    label={`Card ${i + 1} image`}
                    ratio="aspect-[4/5]"
                    file={card._file}
                    url={card.image || null}
                    onSelect={(file) => patch(i, { _file: file })}
                    onClear={() => patch(i, { _file: null, image: '' })}
                    hint="Defaults to the product's own"
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="eyebrow text-bronze-deep">
                        Position {i + 1}
                        {/* Only once saved — an unsaved card has no id and so no
                            page yet. Shown so the studio can see, and open, the
                            listing this card leads to. */}
                        {card._id && (
                          <span className="ml-2 font-sans text-[11px] normal-case tracking-normal text-faint">
                            /collections/{card._id}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <IconButton
                          label={`Move card ${i + 1} earlier`}
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                        >
                          <ArrowUp size={13} aria-hidden />
                        </IconButton>
                        <IconButton
                          label={`Move card ${i + 1} later`}
                          onClick={() => move(i, 1)}
                          disabled={i === cards.length - 1}
                        >
                          <ArrowDown size={13} aria-hidden />
                        </IconButton>
                        <IconButton
                          label={`Remove card ${i + 1}`}
                          tone="danger"
                          onClick={() => removeCard(i)}
                        >
                          <Trash2 size={13} aria-hidden />
                        </IconButton>
                      </div>
                    </div>

                    {/* 1 — the group. Controlled at "" so the select returns to
                        its placeholder after each pick: this is an action, not a
                        stored value. Pieces already in this card are dropped from
                        the options, so it cannot add a duplicate. */}
                    <Field
                      label="Products"
                      htmlFor={`fc-products-${i}`}
                      required
                      hint={
                        card.products.length
                          ? `${card.products.length} in this collection. The first supplies the card's fallbacks.`
                          : 'The pieces shown when this card is selected.'
                      }
                    >
                      <Select
                        id={`fc-products-${i}`}
                        value=""
                        disabled={available.length === 0}
                        onChange={(e) => addProduct(i, e.target.value)}
                      >
                        <option value="" disabled>
                          {available.length === 0 ? 'Every piece is already added' : 'Add a piece…'}
                        </option>
                        {available.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                            {p.category ? ` — ${p.category}` : ''}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {card.products.length > 0 && (
                      <ul className="space-y-2">
                        {card.products.map((id, at) => {
                          const p = productById(id);
                          return (
                            <li
                              key={id}
                              className="flex items-center gap-3 border border-line bg-cream/50 p-2.5"
                            >
                              <span className="eyebrow text-faint w-5 shrink-0">{at + 1}</span>
                              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                                {/* A piece deleted from the catalogue still lists
                                    by id, so it can be seen and removed rather
                                    than blocking every save invisibly. */}
                                {p ? p.name : '(piece no longer exists)'}
                                {p?.category ? (
                                  <span className="text-muted"> — {p.category}</span>
                                ) : null}
                              </span>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <IconButton
                                  label={`Move ${p?.name ?? 'piece'} earlier`}
                                  onClick={() => moveProduct(i, at, -1)}
                                  disabled={at === 0}
                                >
                                  <ArrowUp size={12} aria-hidden />
                                </IconButton>
                                <IconButton
                                  label={`Move ${p?.name ?? 'piece'} later`}
                                  onClick={() => moveProduct(i, at, 1)}
                                  disabled={at === card.products.length - 1}
                                >
                                  <ArrowDown size={12} aria-hidden />
                                </IconButton>
                                <IconButton
                                  label={`Remove ${p?.name ?? 'piece'} from this card`}
                                  tone="danger"
                                  onClick={() => removeProduct(i, id)}
                                >
                                  <X size={12} aria-hidden />
                                </IconButton>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* 2 — the badge. Free text, and never taken from the
                        piece's category: it is a claim, not a fact. */}
                    <Field
                      label="Badge"
                      htmlFor={`fc-badge-${i}`}
                      optional
                      hint="The red pill, top right. Independent of the product's category."
                    >
                      <Input
                        id={`fc-badge-${i}`}
                        list={`fc-badge-options-${i}`}
                        value={card.badge}
                        onChange={(e) => patch(i, { badge: e.target.value })}
                        placeholder="e.g. Best seller"
                        autoComplete="off"
                      />
                      <datalist id={`fc-badge-options-${i}`}>
                        {BADGE_SUGGESTIONS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </Field>

                    {/* 3 — the rest of the card. Prefilled from the piece. */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Title" htmlFor={`fc-title-${i}`} hint="Dark line on the card.">
                        <Input
                          id={`fc-title-${i}`}
                          value={card.title}
                          onChange={(e) => patch(i, { title: e.target.value })}
                          placeholder="e.g. The original Tantra"
                        />
                      </Field>
                      <Field
                        label="Subtitle"
                        htmlFor={`fc-sub-${i}`}
                        optional
                        hint="Red line beneath it."
                      >
                        <Input
                          id={`fc-sub-${i}`}
                          value={card.subtitle}
                          onChange={(e) => patch(i, { subtitle: e.target.value })}
                          placeholder="e.g. Signature Chair"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
