// Shared interface for outfit visualization providers.
// Swap providers by implementing this interface — no other files change.

export interface OutfitVisualizationInput {
  /** Human-readable names of items in the outfit, e.g. ["Navy Chinos", "White Linen Shirt"] */
  items: OutfitItem[];
  activity: string;   // e.g. "hiking"
  vibe: string;       // e.g. "adventurous"
  destination: string;
  weatherDescription: string; // e.g. "warm, 24°C, low rain"
}

export interface OutfitItem {
  name: string;
  category: string;  // e.g. "tops"
  color: string;
  material: string;
}

export interface OutfitVisualizationResult {
  imageData: string; // base64 data URL — data:image/png;base64,...
}

export interface OutfitVisualizationProvider {
  generateOutfitImage(input: OutfitVisualizationInput): Promise<OutfitVisualizationResult>;
}
