// Route-level component for the digital wardrobe view.
// Delegates data fetching and state to useCloset hook; no business logic here.

import { useState, useRef, type ChangeEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { closetItemSchema, type ClosetItemFormData } from '../validation/closetItem.schema';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { uploadClosetImage } from '../lib/uploadImage';
import { useAuth } from '../contexts/AuthContext';
import { useCloset } from '../hooks/useCloset';
import type {
  ClosetItem,
  CreateClosetItemInput,
  UpdateClosetItemInput,
} from '../closet/types/closet.types';
import type { ClothingCategory, WarmthLevel, FormalityLevel } from '../types';
import { ClosetGrid } from '../components/closet/ClosetGrid';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { FormField as Field, INPUT_CLS, inputCls } from '../components/shared/FormField';
import { TagInput } from '../components/shared/TagInput';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CATEGORIES: ClothingCategory[] = [
  'tops', 'bottoms', 'outerwear', 'footwear', 'accessories', 'dresses', 'activewear',
];

const LEVELS: (WarmthLevel | FormalityLevel)[] = [1, 2, 3, 4, 5];

// ---------------------------------------------------------------------------
// Form defaults
// ---------------------------------------------------------------------------

const DEFAULT_VALUES: ClosetItemFormData = {
  name: '',
  category: 'tops',
  color: '',
  material: '',
  warmth: 3,
  formality: 3,
  tags: [],
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ClosetPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { items, loading, error, addItem, updateItem, removeItem } = useCloset(userId ?? '');

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // react-hook-form
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<ClosetItemFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(closetItemSchema) as any,
    mode: 'onTouched',
    defaultValues: DEFAULT_VALUES,
  });

  // Watch custom-input fields
  const watchColor = watch('color');
  const watchTags = watch('tags');
  const watchImageUrl = watch('imageUrl');

  // Image upload
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]       = useState(false);

  // AI tag suggestion
  const [description, setDescription]   = useState('');
  const [suggesting, setSuggesting]     = useState(false);

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  function openAdd() {
    setEditingItem(null);
    reset(DEFAULT_VALUES);
    setDescription('');
    setModalOpen(true);
  }

  function openEdit(item: ClosetItem) {
    setEditingItem(item);
    reset({
      name: item.name,
      category: item.category,
      color: item.color,
      material: item.material,
      warmth: item.warmthScore as 1 | 2 | 3 | 4 | 5,
      formality: item.formalityScore as 1 | 2 | 3 | 4 | 5,
      imageUrl: item.imageUrl ?? undefined,
      tags: item.tags,
    });
    setDescription('');
    setModalOpen(true);
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const url = await uploadClosetImage(supabase, userId, file);
      setValue('imageUrl', url, { shouldValidate: true });
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

  async function handleSuggestTags() {
    if (!description.trim()) return;
    setSuggesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/gemini/suggest-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ description }),
      });
      const data = await res.json() as { tags?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to suggest tags');
      // Merge suggested tags with any the user already typed
      const currentTags = watch('tags') ?? [];
      const merged = [...new Set([...currentTags, ...(data.tags ?? [])])];
      setValue('tags', merged, { shouldValidate: true });
    } catch {
      toast.error('Failed to suggest tags');
    } finally {
      setSuggesting(false);
    }
  }

  async function onSubmit(data: ClosetItemFormData) {
    setSubmitting(true);

    try {
      if (editingItem) {
        const input: UpdateClosetItemInput = {
          name:      data.name,
          category:  data.category,
          color:     data.color,
          material:  data.material,
          warmth:    data.warmth as WarmthLevel,
          formality: data.formality as FormalityLevel,
          imageUrl:  data.imageUrl || null,
          tags:      data.tags,
        };
        await updateItem(editingItem.id, input);
      } else {
        const input: CreateClosetItemInput = {
          name:      data.name,
          category:  data.category,
          color:     data.color,
          material:  data.material,
          warmth:    data.warmth as WarmthLevel,
          formality: data.formality as FormalityLevel,
          imageUrl:  data.imageUrl || undefined,
          tags:      data.tags,
        };
        await addItem(input);
      }
      toast.success(editingItem ? 'Item updated' : 'Item added');
      closeModal();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <ClosetGrid
        items={items}
        loading={loading}
        error={error}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={removeItem}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingItem ? 'Edit item' : 'Add item'}
      >
        <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col gap-4">

          <Field label="Name">
            <input
              type="text"
              {...register('name')}
              className={inputCls(!!errors.name)}
              placeholder="e.g. Blue linen shirt"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </Field>

          <div className="flex gap-3">
            <Field label="Category" className="flex-1">
              <select
                {...register('category')}
                className={inputCls(!!errors.category)}
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
              {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            </Field>
            <Field label="Color" className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={watchColor || '#000000'}
                  onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-sand-300 p-0.5"
                />
                <input
                  type="text"
                  {...register('color')}
                  className={`${inputCls(!!errors.color)} flex-1`}
                  placeholder="#3b82f6 or navy"
                />
              </div>
              {errors.color && <p className="text-sm text-red-500">{errors.color.message}</p>}
            </Field>
          </div>

          <Field label="Material">
            <input
              type="text"
              {...register('material')}
              className={inputCls(!!errors.material)}
              placeholder="e.g. cotton, wool, polyester"
            />
            {errors.material && <p className="text-sm text-red-500">{errors.material.message}</p>}
          </Field>

          <div className="flex gap-3">
            <Field label="Warmth (1–5)" className="flex-1">
              <select
                {...register('warmth', { valueAsNumber: true })}
                className={inputCls(!!errors.warmth)}
              >
                {LEVELS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {errors.warmth && <p className="text-sm text-red-500">{errors.warmth.message}</p>}
            </Field>
            <Field label="Formality (1–5)" className="flex-1">
              <select
                {...register('formality', { valueAsNumber: true })}
                className={inputCls(!!errors.formality)}
              >
                {LEVELS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {errors.formality && <p className="text-sm text-red-500">{errors.formality.message}</p>}
            </Field>
          </div>

          <Field label="Describe this item (optional)">
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${INPUT_CLS} flex-1`}
                placeholder="e.g. waterproof hiking jacket with fleece lining"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSuggestTags(); } }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSuggestTags}
                loading={suggesting}
                disabled={!description.trim() || suggesting}
              >
                Suggest tags
              </Button>
            </div>
            <p className="text-xs text-sand-400 mt-1">AI will suggest tags based on your description.</p>
          </Field>

          <Field label="Tags">
            <TagInput
              tags={watchTags ?? []}
              onChange={(tags) => setValue('tags', tags, { shouldValidate: true })}
              presets={['waterproof', 'everyday', 'layering', 'smart-casual', 'beach', 'business', 'packable', 'lightweight', 'formal', 'activewear']}
            />
          </Field>

          <Field label="Photo (optional)">
            {watchImageUrl && (
              <img
                src={watchImageUrl}
                alt="Item preview"
                className="mb-2 h-32 w-32 rounded-xl object-cover border border-sand-200"
              />
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                disabled={uploading}
              >
                {watchImageUrl ? 'Replace photo' : 'Upload photo'}
              </Button>
              {watchImageUrl && !uploading && (
                <button
                  type="button"
                  onClick={() => setValue('imageUrl', undefined, { shouldValidate: true })}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!isValid || submitting}>
              {editingItem ? 'Save changes' : 'Add item'}
            </Button>
          </div>

        </form>
      </Modal>
    </main>
  );
};

export default ClosetPage;

