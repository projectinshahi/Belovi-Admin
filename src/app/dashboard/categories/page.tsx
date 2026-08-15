'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Tags, Trash2, X } from 'lucide-react';

import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  ImagePicker,
  Input,
  PageHeader,
  Reveal,
  SearchInput,
  SkeletonTable,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Thumb,
  Tr,
} from '@/components/ui';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';

interface ICategory {
  _id: string;
  name: string;
  image: string;
  status: string;
}

/**
 * Mirrors `MAX_CATEGORIES` in the backend's categoryController, which is the
 * real gate — this copy only keeps the studio from composing a category the API
 * would then refuse.
 *
 * What is created here is the whole of the storefront's category system: its
 * Shop menu, homepage Category Section, search chips and shop filter are built
 * from these rows and nothing else. An empty table means a storefront with no
 * categories on it.
 */
const MAX_CATEGORIES = 8;

export default function CategoriesPage() {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    categoryId: string | null;
  }>({ isOpen: false, categoryId: null });
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');

  // Form state. `previewUrl` is gone — ImagePicker owns the object URL for a
  // picked File and revokes it, rather than minting a fresh one per render.
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState('ACTIVE');

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      const data = res.data;
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load categories.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The compiler can't see that every setState here lands after an await;
    // fetching on mount is the external-system sync effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, []);

  // Filtering stays client-side over the already-fetched list — no API change.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) =>
      (category.name || '').toLowerCase().includes(q)
    );
  }, [categories, query]);

  // Drives the disabled Add button. The API rejects an over-cap POST regardless,
  // and `apiErrorMessage` surfaces that message, so this is affordance only.
  const atCap = categories.length >= MAX_CATEGORIES;


  const openAddForm = () => {
    setEditingId(null);
    setName('');
    setImage('');
    setImageFile(null);
    setStatus('ACTIVE');
    setIsAddCategoryOpen(true);
  };

  const closeForm = () => {
    setIsAddCategoryOpen(false);
    setEditingId(null);
  };

  const handleEdit = (category: ICategory) => {
    setEditingId(category._id);
    setName(category.name);
    // Same resolution the page did inline; `assetUrl` is the one copy of it.
    setImage(assetUrl(category.image) || '');
    setImageFile(null);
    setStatus(category.status);
    setIsAddCategoryOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name) return toast.error('Name is required');
    if (!image && !imageFile && !editingId) return toast.error('Image is required');

    setSaving(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('status', status);
    if (imageFile) {
      formData.append('imageFile', imageFile);
    } else if (image) {
      formData.append('image', image);
    }

    try {
      // FormData is passed straight through — axios sets the multipart
      // boundary itself; hand-setting Content-Type strips it.
      const res = editingId
        ? await api.put(`/categories/${editingId}`, formData)
        : await api.post('/categories', formData);

      const data = res.data;
      if (data.success) {
        toast.success(
          editingId ? 'Category updated successfully' : 'Category created successfully'
        );
        setIsAddCategoryOpen(false);
        setEditingId(null);
        fetchCategories();
      } else {
        toast.error(data.message || 'Failed to save category');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save category.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, categoryId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.categoryId) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/categories/${deleteModal.categoryId}`);
      const data = res.data;
      if (data.success) {
        toast.success('Category deleted successfully');
        fetchCategories();
        setDeleteModal({ isOpen: false, categoryId: null });
      } else {
        toast.error(data.message || 'Failed to delete category');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete category.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="The Edit"
        title="Categories"
        description={`The collections that shape the storefront — each one a doorway into the range, up to ${MAX_CATEGORIES}. Only active categories appear in navigation and in a piece's Category list.`}
        action={
          <Button variant="solid" size="sm" onClick={openAddForm} disabled={atCap}>
            <Plus size={13} aria-hidden />
            Add Category
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Catalog */}
        <Reveal className={isAddCategoryOpen ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <Card padded={false} className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search categories…"
                className="w-full max-w-xs"
              />
              <p className="eyebrow-tight text-faint hidden sm:block shrink-0">
                {query
                  ? `${filtered.length} of ${categories.length}`
                  : `${categories.length} / ${MAX_CATEGORIES} Categories`}
              </p>
            </div>

            {loading ? (
              <SkeletonTable rows={5} cols={4} />
            ) : filtered.length === 0 ? (
              query ? (
                <EmptyState
                  eyebrow="No matches"
                  title="Nothing found"
                  message={`No category matches “${query}”. Try a different spelling.`}
                  icon={<Tags size={18} aria-hidden />}
                  action={
                    <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No categories yet"
                  message="Categories group your pieces into the collections the storefront navigates by. Add the first one to begin."
                  icon={<Tags size={18} aria-hidden />}
                  action={
                    <Button variant="solid" size="sm" onClick={openAddForm}>
                      Add Category
                    </Button>
                  }
                />
              )
            ) : (
              <Table>
                <THead>
                  <Th className="w-[72px]">Image</Th>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </THead>
                <TBody>
                  {filtered.map((category) => (
                    <Tr key={category._id}>
                      <Td>
                        <Thumb
                          src={category.image}
                          alt={category.name}
                          className="w-12 h-12"
                        />
                      </Td>
                      <Td>{category.name}</Td>
                      <Td>
                        <StatusBadge status={category.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton
                            label={`Edit ${category.name}`}
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil size={13} aria-hidden />
                          </IconButton>
                          <IconButton
                            label={`Delete ${category.name}`}
                            tone="danger"
                            onClick={() => handleDeleteClick(category._id)}
                          >
                            <Trash2 size={13} aria-hidden />
                          </IconButton>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </Reveal>

        {/* Compose / amend */}
        {isAddCategoryOpen && (
          <Reveal className="lg:col-span-4 lg:sticky lg:top-6" delay={0.05}>
            <Card>
              <CardHeader
                eyebrow={editingId ? 'Amend' : 'Compose'}
                title={editingId ? 'Edit Category' : 'New Category'}
                action={
                  <IconButton label="Close form" onClick={closeForm}>
                    <X size={14} aria-hidden />
                  </IconButton>
                }
              />

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <Field
                  label="Category Name"
                  htmlFor="category-name"
                  required
                  hint="Appears on the storefront exactly as typed."
                >
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Luxury Furniture"
                    autoComplete="off"
                  />
                </Field>

                <ImagePicker
                  label="Category Image"
                  file={imageFile}
                  url={image || null}
                  onSelect={setImageFile}
                  onClear={() => {
                    setImageFile(null);
                    setImage('');
                  }}
                  hint="400×400px · JPG, PNG or WEBP"
                />

                <div className="border-t border-line pt-5">
                  <Checkbox
                    label="Active"
                    description="Active categories are shown in the storefront navigation."
                    checked={status === 'ACTIVE'}
                    onChange={(checked) => setStatus(checked ? 'ACTIVE' : 'INACTIVE')}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    variant="solid"
                    size="sm"
                    loading={saving}
                    className="flex-1"
                  >
                    {editingId ? 'Update Category' : 'Create Category'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={closeForm}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </Reveal>
        )}
      </div>

      <ConfirmDialog
        open={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, categoryId: null })}
        onConfirm={confirmDelete}
        title="Delete Category?"
        message="Are you sure you want to delete this category? All associated products may be affected."
        confirmLabel="Yes, Delete"
        loading={deleting}
        tone="danger"
      />
    </>
  );
}
