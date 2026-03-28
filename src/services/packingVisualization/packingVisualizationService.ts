// Pure service — no UI, no React, no Supabase.
// Calls Gemini image generation and returns a base64 data URL.

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerationConfig } from '@google/generative-ai';
import { extractGeminiImage } from '../geminiImageUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BagType = 'suitcase' | 'backpack' | 'duffel';

export interface PackingVisualizationInput {
  clothingItems: string[];   // e.g. ["navy chinos", "white linen shirt"]
  accessories: string[];     // e.g. ["sunglasses", "belt"]
  bagType: BagType;
  destination: string;       // e.g. "Tokyo"
  vibe: string;              // e.g. "relaxed"
}

export interface PackingVisualizationResult {
  imageData: string; // data URL — data:image/png;base64,...
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

interface BagStyle {
  label: string;
  layout: string;
}

const BAG_STYLES: Record<BagType, BagStyle> = {
  suitcase: {
    label: 'hard-shell carry-on suitcase',
    layout: [
      '- Items folded and organized in tidy rows by category',
      '- Flat-lay arrangement with clear separation between sections',
      '- Suitcase viewed from directly above, fully open',
    ].join('\n'),
  },
  backpack: {
    label: 'travel backpack',
    layout: [
      '- Items rolled and layered vertically from bottom to top',
      '- Heavier items at the base, lighter items on top',
      '- Backpack open and leaning slightly back, showing interior layers',
    ].join('\n'),
  },
  duffel: {
    label: 'travel duffel bag',
    layout: [
      '- Items softly stacked and nested inside the bag',
      '- Packing cubes or bundles visible with casual organization',
      '- Duffel unzipped and viewed from above at a slight angle',
    ].join('\n'),
  },
};

function buildPrompt(input: PackingVisualizationInput): string {
  const style = BAG_STYLES[input.bagType];
  const allItems = [...input.clothingItems, ...input.accessories];

  return `
Create a photorealistic top-down view of an open ${style.label}
packed for a ${input.vibe} trip to ${input.destination}.

The bag contains these items, neatly arranged and clearly visible:
${allItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Layout:
${style.layout}

Style requirements:
- Clean, editorial aesthetic on a neutral background
- Soft natural lighting, no harsh shadows
- Minimalist travel editorial quality
- Each item should be clearly distinguishable
`.trim();
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Generate a photorealistic packing visualization image using Gemini.
 *
 * @throws if the API call fails or returns no image data
 */
export async function generatePackingImage(
  input: PackingVisualizationInput,
  apiKey: string,
): Promise<PackingVisualizationResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
    // responseModalities is not yet in the SDK's GenerationConfig typings
    generationConfig: {
      responseModalities: ['image'],
    } as unknown as GenerationConfig,
  });

  return { imageData: extractGeminiImage(result) };
}
