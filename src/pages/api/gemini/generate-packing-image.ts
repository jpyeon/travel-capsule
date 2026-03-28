// POST /api/gemini/generate-packing-image
//
// Generates a photorealistic packing visualization using Gemini image generation.
// Runs server-side so GEMINI_API_KEY is never exposed to the browser.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthUser } from '../../../lib/apiAuth';
import {
  generatePackingImage,
  type PackingVisualizationInput,
  type BagType,
} from '../../../services/packingVisualization/packingVisualizationService';

export interface GeneratePackingImageResponse {
  imageData: string; // base64 data URL
}

export interface GeneratePackingImageError {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeneratePackingImageResponse | GeneratePackingImageError>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const body = req.body as Partial<PackingVisualizationInput> & { suitcaseSize?: string };

  if (!body.destination?.trim()) {
    return res.status(400).json({ error: 'destination is required' });
  }
  if (!Array.isArray(body.clothingItems) || body.clothingItems.length === 0) {
    return res.status(400).json({ error: 'clothingItems must be a non-empty array' });
  }

  // Accept bagType directly, or map legacy suitcaseSize field for backwards compat
  const VALID_BAG_TYPES: BagType[] = ['suitcase', 'backpack', 'duffel'];
  const bagType: BagType = VALID_BAG_TYPES.includes(body.bagType as BagType)
    ? (body.bagType as BagType)
    : 'suitcase';

  try {
    const result = await generatePackingImage(
      {
        clothingItems: body.clothingItems,
        accessories:   body.accessories ?? [],
        bagType,
        destination:   body.destination,
        vibe:          body.vibe ?? 'relaxed',
      },
      apiKey,
    );

    return res.status(200).json({ imageData: result.imageData });
  } catch (err) {
    console.error('[generate-packing-image]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate image' });
  }
}
