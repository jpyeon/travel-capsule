// Route-level component for the digital wardrobe view.
// Delegates data fetching and state to useCloset hook; no business logic here.

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
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
import { FormField as Field, INPUT_CLS } from '../components/shared/FormField';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CATEGORIES: ClothingCategory[] = [
  'tops', 'bottoms', 'outerwear', 'footwear', 'accessories', 'dresses', 'activewear',
];

const LEVELS: (WarmthLevel | FormalityLevel)[] = [1, 2, 3, 4, 5];

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface ClosetFormState {
  name: string;
  category: ClothingCategory;
  color: string;
  material: string;
  warmth: string;
  formality: string;
  imageUrl: string;
  tags: string; // comma-separated
}

const EMPTY_FORM: ClosetFormState = {
  name: '',
  category: 'tops',
  color: '',
  material: '',
  warmth: '3',
  formality: '3',
  imageUrl: '',
  tags: '',
};

function itemToFormState(item: ClosetItem): ClosetFormState {
  return {
    name: item.name,
    category: item.category,
    color: item.color,
    material: item.material,
    warmth: String(item.warmthScore),
    formality: String(item.formalityScore),
    imageUrl: item.imageUrl ?? '',
    tags: item.tags.join(', '),
  };
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Clamp a raw string to a valid 1–5 level, defaulting to 3 on bad input. */
function clampLevel(raw: string): WarmthLevel {
  const n = parseInt(raw);
  if (isNaN(n)) return 3 as WarmthLevel;
  return Math.max(1, Math.min(5, n)) as WarmthLevel;
}

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
  const [form, setForm]               = useState<ClosetFormState>(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // Image upload
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);

  // AI tag suggestion
  const [description, setDescription]   = useState('');
  const [suggesting, setSuggesting]     = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  if (!authLoading && !userId) {
    void router.replace('/LoginPage');
    return null;
  }

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setUploadError(null);
    setDescription('');
    setSuggestError(null);
    setModalOpen(true);
  }

  function openEdit(item: ClosetItem) {
    setEditingItem(item);
    setForm(itemToFormState(item));
    setFormError(null);
    setUploadError(null);
    setDescription('');
    setSuggestError(null);
    setModalOpen(true);
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadClosetImage(supabase, userId, file);
      setForm((p) => ({ ...p, imageUrl: url }));
    } catch (err) {
      setUploadError((err as Error).message);
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
    setSuggestError(null);
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
      const existing = parseTags(form.tags);
      const merged = [...new Set([...existing, ...(data.tags ?? [])])];
      setForm((p) => ({ ...p, tags: merged.join(', ') }));
    } catch (err) {
      setSuggestError((err as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingItem) {
        const input: UpdateClosetItemInput = {
          name:      form.name,
          category:  form.category,
          color:     form.color,
          material:  form.material,
          warmth:    clampLevel(form.warmth),
          formality: clampLevel(form.formality),
          imageUrl:  form.imageUrl || null,
          tags:      parseTags(form.tags),
        };
        await updateItem(editingItem.id, input);
      } else {
        const input: CreateClosetItemInput = {
          name:      form.name,
          category:  form.category,
          color:     form.color,
          material:  form.material,
          warmth:    clampLevel(form.warmth),
          formality: clampLevel(form.formality),
          imageUrl:  form.imageUrl || undefined,
          tags:      parseTags(form.tags),
        };
        await addItem(input);
      }
      closeModal();
    } catch (err) {
      setFormError((err as Error).message);
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <Field label="Name">
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={INPUT_CLS}
              placeholder="e.g. Blue linen shirt"
            />
          </Field>

          <div className="flex gap-3">
            <Field label="Category" className="flex-1">
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ClothingCategory }))}
                className={INPUT_CLS}
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Color" className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color || '#000000'}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-sand-300 p-0.5"
                />
                <input
                  required
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className={`${INPUT_CLS} flex-1`}
                  placeholder="#3b82f6 or navy"
                />
              </div>
            </Field>
          </div>

          <Field label="Material">
            <input
              required
              type="text"
              value={form.material}
              onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
              className={INPUT_CLS}
              placeholder="e.g. cotton, wool, polyester"
            />
          </Field>

          <div className="flex gap-3">
            <Field label="Warmth (1–5)" className="flex-1">
              <select
                value={form.warmth}
                onChange={(e) => setForm((p) => ({ ...p, warmth: e.target.value }))}
                className={INPUT_CLS}
              >
                {LEVELS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
            <Field label="Formality (1–5)" className="flex-1">
              <select
                value={form.formality}
                onChange={(e) => setForm((p) => ({ ...p, formality: e.target.value }))}
                className={INPUT_CLS}
              >
                {LEVELS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
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
            {suggestError && <p className="text-xs text-red-600 mt-1">{suggestError}</p>}
            {!suggestError && (
              <p className="text-xs text-sand-400 mt-1">AI will suggest tags based on your description.</p>
            )}
          </Field>

          <Field label="Tags (comma-separated)">
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              className={INPUT_CLS}
              placeholder="e.g. waterproof, everyday, layering"
            />
          </Field>

          <Field label="Photo (optional)">
            {form.imageUrl && (
              <img
                src={form.imageUrl}
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
                {form.imageUrl ? 'Replace photo' : 'Upload photo'}
              </Button>
              {form.imageUrl && !uploading && (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          </Field>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>
              {editingItem ? 'Save changes' : 'Add item'}
            </Button>
          </div>

        </form>
      </Modal>
    </main>
  );
};

export default ClosetPage;

