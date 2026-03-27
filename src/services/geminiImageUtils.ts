// Shared utilities for extracting image data from Gemini API responses.
// Used by both packingVisualizationService and geminiProvider.

import type { GenerateContentResult } from '@google/generative-ai';

/**
 * Extract the first inline image from a Gemini generateContent response.
 * Returns a data URL string (`data:<mimeType>;base64,<data>`).
 * @throws if the response contains no image data.
 */
export function extractGeminiImage(result: GenerateContentResult): string {
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const inlineData = (part as { inlineData?: { mimeType: string; data: string } }).inlineData;
    if (inlineData?.data) {
      return `data:${inlineData.mimeType};base64,${inlineData.data}`;
    }
  }

  throw new Error('Gemini returned no image data. Try regenerating.');
}
