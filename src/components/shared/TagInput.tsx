// Reusable tag chip input.
//
// Shows selected tags as removable chips.
// Preset options appear as clickable pills below the input.
// Users can also type a custom tag and press Enter or comma to add it.

import { useState, type KeyboardEvent } from 'react';
import { INPUT_CLS } from './FormField';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  presets?: string[];
  placeholder?: string;
}

export function TagInput({ tags, onChange, presets = [], placeholder = 'Type a tag and press Enter' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const unusedPresets = presets.filter((p) => !tags.includes(p));

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 text-xs text-accent-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 text-accent-400 hover:text-accent-700 leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Text input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) { addTag(inputValue); setInputValue(''); } }}
        className={INPUT_CLS}
        placeholder={placeholder}
      />

      {/* Preset pills */}
      {unusedPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addTag(preset)}
              className="rounded-full border border-sand-300 bg-sand-50 px-2.5 py-0.5 text-xs text-gray-500 hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 transition-colors dark:border-night-100 dark:bg-night-200 dark:text-sand-400"
            >
              + {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
