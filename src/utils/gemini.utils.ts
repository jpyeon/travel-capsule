/** Strip markdown code fences that Gemini sometimes wraps around JSON responses. */
export function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
