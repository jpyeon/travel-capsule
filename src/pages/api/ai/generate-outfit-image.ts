// POST /api/ai/generate-outfit-image
//
// Generates a flat-lay outfit visualization using the configured AI provider.
// Runs server-side so API keys are never exposed to the browser.
//
// Provider is selected via OUTFIT_PROVIDER env var:
//   'gemini' (default) — flat-lay via Gemini image generation
//   'falai'            — virtual try-on via fal.ai (future)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthUser } from '../../../lib/apiAuth';
import { GeminiOutfitProvider } from '../../../services/outfitVisualization/geminiProvider';
import type { OutfitVisualizationInput } from '../../../services/outfitVisualization/types';

export interface GenerateOutfitImageResponse {
  imageData: string;
}

export interface GenerateOutfitImageError {
  error: string;
}

function getProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  // When OUTFIT_PROVIDER='falai' is set, swap in the fal.ai provider here.
  // const provider = process.env.OUTFIT_PROVIDER === 'falai'
  //   ? new FalAiOutfitProvider(process.env.FAL_API_KEY!)
  //   : new GeminiOutfitProvider(apiKey);

  return new GeminiOutfitProvider(apiKey);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateOutfitImageResponse | GenerateOutfitImageError>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as Partial<OutfitVisualizationInput>;

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (!body.destination?.trim()) {
    return res.status(400).json({ error: 'destination is required' });
  }

  try {
    const provider = getProvider();
    const result = await provider.generateOutfitImage({
      items:               body.items,
      activity:            body.activity            ?? 'casual',
      vibe:                body.vibe                ?? 'relaxed',
      destination:         body.destination,
      weatherDescription:  body.weatherDescription  ?? 'mild weather',
    });

    return res.status(200).json({ imageData: result.imageData });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate image' });
  }
}
