// POST /api/gemini/travel-info
//
// Returns destination-specific travel advice:
//   savings       — items not worth packing (cheaper or unnecessary locally)
//   considerations — practical reminders (visas, adapters, health, customs)
//
// All advice is AI-generated and must be verified before travel.

import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthUser } from '../../../lib/apiAuth';
import { stripJsonFences } from '../../../utils/gemini.utils';
import { errorMessage } from '../../../utils/error.utils';

export interface TravelInfoResponse {
  savings: string[];
  considerations: string[];
}

export interface TravelInfoError {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TravelInfoResponse | TravelInfoError>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { destination, activities, tripDays } = req.body as {
    destination?: string;
    activities?: string[];
    tripDays?: number;
  };

  if (!destination?.trim()) {
    return res.status(400).json({ error: 'destination is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

  const activitiesLine = activities?.length
    ? `Activities: ${activities.join(', ')}`
    : '';
  const daysLine = tripDays ? `Duration: ${tripDays} days` : '';

  const prompt = `
You are a knowledgeable travel advisor for a trip to ${destination}.
${activitiesLine}
${daysLine}

Provide two lists of concise, specific advice:

1. "savings" — items commonly overpacked that are cheaper to buy locally, readily available there, or simply not needed. Be specific to ${destination}.
   Examples: "Toiletries — convenience stores everywhere", "Adapters — buy at airport for ¥300"

2. "considerations" — important practical reminders a traveler might overlook. Include things like visa rules, power adapters, cultural dress codes, health precautions, tipping norms, local laws, or transportation tips. Be specific to ${destination}.
   Examples: "IC card (Suica/Pasmo) required for most Tokyo transit", "No tipping — considered rude in Japan"

Respond with ONLY a JSON object (no markdown, no explanation):
{"savings": ["tip 1", "tip 2", ...], "considerations": ["reminder 1", "reminder 2", ...]}

Rules:
- 4–7 items per list
- Each item under 12 words
- Specific to ${destination}, not generic travel advice
- For considerations: add "(verify before travel)" to any visa or health requirement
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = stripJsonFences(result.response.text());
    const parsed = JSON.parse(text) as { savings: unknown; considerations: unknown };

    const savings = Array.isArray(parsed.savings)
      ? parsed.savings.filter((s): s is string => typeof s === 'string')
      : [];
    const considerations = Array.isArray(parsed.considerations)
      ? parsed.considerations.filter((s): s is string => typeof s === 'string')
      : [];

    return res.status(200).json({ savings, considerations });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
}
