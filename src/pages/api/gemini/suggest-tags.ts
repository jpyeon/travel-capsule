// POST /api/gemini/suggest-tags
//
// Suggests clothing item tags from a free-text description.
// Runs server-side so GEMINI_API_KEY is never exposed to the browser.

import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthUser } from '../../../lib/apiAuth';
import { stripJsonFences } from '../../../utils/gemini.utils';
import { errorMessage } from '../../../utils/error.utils';

export interface SuggestTagsResponse {
  tags: string[];
}

export interface SuggestTagsError {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestTagsResponse | SuggestTagsError>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { description } = req.body as { description?: string };
  if (!description?.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const prompt = `
You are a wardrobe assistant. Given a clothing item description, suggest 2–5 short tags
that describe its use cases, properties, or occasions.

Good tag examples: waterproof, everyday, layering, smart-casual, beach, business, packable, lightweight

Clothing description: "${description}"

Respond with ONLY a JSON array of lowercase tag strings (no markdown, no explanation):
["tag1", "tag2", "tag3"]

Rules:
- 2 to 5 tags maximum.
- Each tag must be a single word or hyphenated phrase, lowercase.
- Focus on versatility, occasions, and practical properties.
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = stripJsonFences(result.response.text());

    const tags = (JSON.parse(text) as unknown[])
      .filter((t): t is string => typeof t === 'string')
      .slice(0, 5);

    return res.status(200).json({ tags });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
}
