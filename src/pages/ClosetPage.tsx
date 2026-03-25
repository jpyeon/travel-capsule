// Route-level component for the digital wardrobe view.
// Delegates data fetching and state to useCloset hook; no business logic here.

import { useState, useEffect, type FormEvent } from 'react';
import type { NextPage } from 'next';
import { supabase } from '../lib/supabase';
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
  category: ClothingCategory;
  color: string;
  material: string;
  warmth: string;
  formality: string;
  imageUrl: string;
  tags: string; // comma-separated
}

const EMPTY_FORM: ClosetFormState = {
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ClosetPage: NextPage = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const { items, loading, error, addItem, updateItem, removeItem } = useCloset(userId ?? '');

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [form, setForm]               = useState<ClosetFormState>(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // AI tag suggestion
  const [description, setDescription]   = useState('');
  const [suggesting, setSuggesting]     = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDescription('');
    setSuggestError(null);
    setModalOpen(true);
  }

  function openEdit(item: ClosetItem) {
    setEditingItem(item);
    setForm(itemToFormState(item));
    setFormError(null);
    setDescription('');
    setSuggestError(null);
    setModalOpen(true);
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
      const res = await fetch('/api/gemini/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          category:  form.category,
          color:     form.color,
          material:  form.material,
          warmth:    parseInt(form.warmth) as WarmthLevel,
          formality: parseInt(form.formality) as FormalityLevel,
          imageUrl:  form.imageUrl || null,
          tags:      parseTags(form.tags),
        };
        await updateItem(editingItem.id, input);
      } else {
        const input: CreateClosetItemInput = {
          category:  form.category,
          color:     form.color,
          material:  form.material,
          warmth:    parseInt(form.warmth) as WarmthLevel,
          formality: parseInt(form.formality) as FormalityLevel,
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
    <main className="p-8">
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
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5"
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
              <p className="text-xs text-gray-400 mt-1">AI will suggest tags based on your description.</p>
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

          <Field label="Image URL (optional)">
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              className={INPUT_CLS}
              placeholder="https://..."
            />
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

// ---------------------------------------------------------------------------
// Field — label wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  'rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1';
