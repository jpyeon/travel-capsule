// Gemini implementation of OutfitVisualizationProvider.
//
// Generates a flat-lay editorial image of the outfit items arranged together.
// Does not require a user photo — items are shown as a styled clothing arrangement.
// To switch to a virtual try-on provider (e.g. fal.ai), implement the same
// OutfitVisualizationProvider interface in a separate file.

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerationConfig } from '@google/generative-ai';
import type {
  OutfitVisualizationInput,
  OutfitVisualizationResult,
  OutfitVisualizationProvider,
} from './types';
import { extractGeminiImage } from '../geminiImageUtils';

function buildPrompt(input: OutfitVisualizationInput): string {
  const itemLines = input.items
    .map((item) => `- ${item.name} (${item.color} ${item.material} ${item.category})`)
    .join('\n');

  return `
Create a photorealistic editorial flat-lay of a complete travel outfit for a ${input.vibe} ${input.activity} outing in ${input.destination}.

Weather context: ${input.weatherDescription}

Outfit items arranged neatly on a light neutral background:
${itemLines}

Style requirements:
- Top-down flat-lay view, items arranged as a complete outfit
- Clean, minimal background (light grey or white)
- Soft natural lighting, no harsh shadows
- Items touching or slightly overlapping to suggest they form one look
- Editorial travel magazine quality
- Each item clearly visible and identifiable
`.trim();
}

export class GeminiOutfitProvider implements OutfitVisualizationProvider {
  constructor(private readonly apiKey: string) {}

  async generateOutfitImage(
    input: OutfitVisualizationInput,
  ): Promise<OutfitVisualizationResult> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseModalities: ['image'],
      } as unknown as GenerationConfig,
    });

    return { imageData: extractGeminiImage(result) };
  }
}
