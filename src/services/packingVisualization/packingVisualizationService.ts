// Pure service — no UI, no React, no Supabase.
// Calls Gemini image generation and returns a base64 data URL.

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerationConfig } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PackingVisualizationInput {
  clothingItems: string[];   // e.g. ["navy chinos", "white linen shirt"]
  accessories: string[];     // e.g. ["sunglasses", "belt"]
  suitcaseSize: 'carry-on' | 'checked';
  destination: string;       // e.g. "Tokyo"
  vibe: string;              // e.g. "relaxed"
}

export interface PackingVisualizationResult {
  imageData: string; // data URL — data:image/png;base64,...
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(input: PackingVisualizationInput): string {
  const allItems = [...input.clothingItems, ...input.accessories];

  return `
Create a photorealistic top-down view of an open ${input.suitcaseSize} suitcase
packed for a ${input.vibe} trip to ${input.destination}.

The suitcase contains these items, neatly arranged and clearly visible:
${allItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Style requirements:
- Clean, flat-lay aesthetic on a neutral background
- Items folded and organized in tidy rows by category
- Soft natural lighting, no harsh shadows
- Minimalist travel editorial quality
- Suitcase viewed from directly above, fully open
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

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const inlineData = (part as { inlineData?: { mimeType: string; data: string } }).inlineData;
    if (inlineData?.data) {
      return { imageData: `data:${inlineData.mimeType};base64,${inlineData.data}` };
    }
  }

  throw new Error('Gemini returned no image data. Try regenerating.');
}
