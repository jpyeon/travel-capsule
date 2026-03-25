// POST /api/gemini/parse-trip
//
// Parses a free-text trip description into structured { activities, vibe }.
// Runs server-side so GEMINI_API_KEY is never exposed to the browser.

import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TripActivity, TripVibe } from '../../../types';
import { getAuthUser } from '../../../lib/apiAuth';

const TRIP_ACTIVITIES: TripActivity[] = [
  'beach', 'hiking', 'business', 'sightseeing', 'dining', 'nightlife', 'skiing', 'casual',
];

const TRIP_VIBES: TripVibe[] = [
  'relaxed', 'adventurous', 'formal', 'romantic', 'family', 'backpacker',
];

export interface ParseTripResponse {
  activities: TripActivity[];
  vibe: TripVibe;
}

export interface ParseTripError {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseTripResponse | ParseTripError>,
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
You are a travel assistant. Given a trip description, extract the activities and overall vibe.

Valid activities: ${TRIP_ACTIVITIES.join(', ')}
Valid vibes: ${TRIP_VIBES.join(', ')}

Trip description: "${description}"

Respond with ONLY a JSON object in this exact shape (no markdown, no explanation):
{"activities": ["activity1", "activity2"], "vibe": "vibe_value"}

Rules:
- Pick 1–4 activities that best match the description. Default to ["casual"] if unclear.
- Pick exactly 1 vibe. Default to "relaxed" if unclear.
- Only use values from the valid lists above.
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const parsed = JSON.parse(text) as { activities: unknown; vibe: unknown };

    const activities = (parsed.activities as string[]).filter((a): a is TripActivity =>
      TRIP_ACTIVITIES.includes(a as TripActivity),
    );
    const vibe = TRIP_VIBES.includes(parsed.vibe as TripVibe)
      ? (parsed.vibe as TripVibe)
      : 'relaxed';

    return res.status(200).json({ activities: activities.length ? activities : ['casual'], vibe });
  } catch (err) {
    console.error('[parse-trip]', err);
    return res.status(500).json({ error: 'Failed to parse trip description' });
  }
}
