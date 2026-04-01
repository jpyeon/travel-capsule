# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Travel Capsule is a Next.js + React + TypeScript travel wardrobe planning app backed by Supabase (PostgreSQL). Users connect their existing closet to trip itineraries and receive a minimal "capsule wardrobe" recommendation covering all planned activities and forecasted weather.

## Commands

```bash
npm run dev             # Start Next.js dev server (http://localhost:3000)
npm run build           # Production build
npm run lint            # ESLint via next lint
npm run test            # Vitest run (all tests, non-watch)
npm run test:watch      # Vitest in watch mode
```

To run a single test file:
```bash
npx vitest run src/algorithms/capsule/__tests__/capsuleGenerator.test.ts
```

Environment variables required (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```
Copy `.env.local.example` to `.env.local` and fill in values from Supabase dashboard → Project Settings → API. `GEMINI_API_KEY` is a server-side-only key (never prefixed with `NEXT_PUBLIC_`) used by the Gemini API routes.

## Architecture

**Dependency flow:**
```
Pages → Hooks → Services → Repositories → Supabase
         ↓
     Algorithms (pure functions, no I/O)
```

### Layer Responsibilities

| Layer | Path | Role |
|---|---|---|
| Global types | `src/types/` | Shared domain models across all layers |
| Supabase client | `src/lib/supabase.ts` | Singleton client; injected into repositories |
| API auth helper | `src/lib/apiAuth.ts` | Validates Bearer token in Next.js API routes |
| Auth context | `src/contexts/AuthContext.tsx` | `AuthProvider` + `useAuth()` hook; wraps entire app |
| Feature modules | `src/closet/`, `src/trip/` | Each contains `types/`, `repository/`, `service/`, `index.ts` |
| Algorithms | `src/algorithms/` | Pure functions — no DB, no HTTP, no React |
| Hooks | `src/hooks/` | Bridge services/algorithms ↔ React state |
| Components | `src/components/` | Dumb UI; no business logic |
| Pages | `src/pages/` | Route-level; delegate everything to hooks |
| API routes | `src/pages/api/` | Server-side Next.js API handlers (Gemini integration) |
| External services | `src/services/` | Third-party API integrations (weather, geocoding) |
| Utilities | `src/utils/` | Pure helper functions (date, temperature, packing capacity, Gemini response cleanup, error extraction) |

### Feature Module Structure

Every feature module (`closet/`, `trip/`) follows the same internal layout:

```
src/<feature>/
├── types/<feature>.types.ts   # DTOs for DB persistence (snake_case field names)
├── repository/<feature>.repository.ts  # Supabase CRUD; maps snake_case ↔ camelCase
├── service/<feature>.service.ts        # Business logic and validation
└── index.ts                           # Public exports
```

**Fully implemented:**
- `src/closet/` — repository + service + types (DTO includes `material` and `tags`)
- `src/utils/` — date helpers, temperature helpers, packing capacity estimation, Gemini utils, error utils
- `src/types/` — global domain types (`WeatherForecast` re-exported from `src/features/trips/types/trip.ts`)
- `src/lib/supabase.ts` — Supabase singleton
- `src/lib/apiAuth.ts` — Bearer token validation for API routes (`getAuthUser`)
- `src/contexts/AuthContext.tsx` — `AuthProvider` + `useAuth()` (user, userId, loading, signOut)
- `src/features/trips/` — `TripService` with weather pipeline integration
- `src/services/weather/weatherService.ts` — Open-Meteo integration, no API key required; in-memory cache (30-min TTL) with LRU eviction (max 50) and localStorage persistence
- `src/services/geocoding/geocodingService.ts` — Open-Meteo geocoding, no API key; `searchDestination(query)` returns up to 5 `GeocodingResult[]`
- `src/algorithms/capsule/capsuleGenerator.ts` — full 5-step pipeline with versatility scoring + unit tests
- `src/algorithms/outfit/outfitGenerator.ts` — activity formality filtering, streak tracking, color ranking + unit tests
- `src/features/packing/services/packingService.ts` — wear-count aggregation, accessory dedup, toiletries with priority tiers (`PackingPriority`: essential/recommended/optional), `ToiletryEntry` type + unit tests
- `src/hooks/useCloset.ts` — optimistic state: addItem / updateItem / removeItem / refresh
- `src/hooks/useTrip.ts` — createTrip (non-optimistic, weather-aware) / updateTrip / deleteTrip / refresh
- `src/hooks/useCapsuleWardrobe.ts` — manual `generate()` trigger; runs capsule → outfits → packing pipeline
- `src/components/shared/Button.tsx` — primary / secondary / danger variants, loading spinner
- `src/components/shared/Modal.tsx` — Escape + backdrop close, body scroll lock
- `src/components/shared/NavBar.tsx` — auth-aware nav; links hidden when signed out
- `src/components/shared/ErrorBoundary.tsx` — React error boundary for page-level crash protection
- `src/components/closet/ClosetItemCard.tsx` — color swatch, DotScale, tags, Edit/Delete actions
- `src/components/closet/ClosetGrid.tsx` — loading skeletons, error, empty state, responsive grid
- `src/components/trip/TripCard.tsx` — trip summary card with actions
- `src/pages/index.tsx` — home/landing page
- `src/pages/LoginPage.tsx` — Supabase email/password auth (sign in + sign up)
- `src/pages/ClosetPage.tsx` — full closet management page (add/edit/delete items)
- `src/pages/TripPage.tsx` — full trip management page (create/edit/delete trips)
- `src/pages/CapsulePage.tsx` — capsule wardrobe generation, daily outfits, packing list view
- `src/pages/api/gemini/parse-trip.ts` — POST; parses free-text trip description → `{ activities, vibe }` via Gemini 2.5 Flash
- `src/pages/api/gemini/suggest-tags.ts` — POST; suggests clothing tags from free-text description via Gemini 2.5 Flash
- `src/pages/api/gemini/travel-info.ts` — POST; returns destination-specific savings tips and travel considerations via Gemini 2.5 Flash
- `src/pages/api/gemini/generate-packing-image.ts` — POST; generates bag-specific flat-lay visualization (suitcase/backpack/duffel) via Gemini 2.5 Flash Image
- `src/pages/api/ai/generate-outfit-image.ts` — POST; generates outfit flat-lay via provider abstraction (Gemini default, swap via `OUTFIT_PROVIDER` env var)
- `src/pages/api/images/upload-profile-photo.ts` — POST; normalizes (sharp) + uploads profile photo to Supabase Storage, saves URL in `user_profiles`
- `src/services/imageNormalization/imageNormalizationService.ts` — server-side sharp pipeline: EXIF rotate, cover-crop, strip metadata, JPEG 85%
- `src/services/packingVisualization/packingVisualizationService.ts` — multi-bag prompt builder (`BagType`: suitcase/backpack/duffel) + Gemini image generation
- `src/services/outfitVisualization/types.ts` — `OutfitVisualizationProvider` interface for swappable AI backends
- `src/services/outfitVisualization/geminiProvider.ts` — Gemini 2.5 Flash Image implementation of `OutfitVisualizationProvider`
- `src/features/userImages/` — `UserImageRepository`: `getProfile`, `uploadProfileImage`, `upsertProfileImageUrl`
- `src/hooks/usePackingVisualization.ts` — manual `generate()` trigger; tracks `stale` state when bag type changes; abort on unmount, 30s timeout, retry support
- `src/hooks/useTravelInfo.ts` — manual `fetch()` trigger; returns savings tips and travel considerations (not persisted); abort on unmount, 30s timeout, retry support
- `src/hooks/useOutfitVisualization.ts` — per-outfit image generation; abort on unmount, 30s timeout, retry support
- `src/hooks/useProfileImage.ts` — loads profile image URL on mount; `upload(file)` POSTs to normalize+upload route
- `src/utils/packingCapacity.ts` — heuristic packing capacity estimation with category weights, per-bag capacity limits, status thresholds (underpacked/optimal/overpacked), and overpacked suggestions
- `src/utils/gemini.utils.ts` — `stripJsonFences()` shared utility for cleaning markdown code fences from Gemini JSON responses
- `src/utils/error.utils.ts` — `errorMessage()` safe error extraction from unknown catch values
- `src/utils/fetchWithTimeout.ts` — fetch wrapper with AbortController + 30s timeout + merged signals; `TimeoutError` class
- `src/validation/` — shared zod schemas for closet items, trips, and login; used by both client forms (react-hook-form) and service-layer validation
- `src/components/trip/BagSelector.tsx` — suitcase/backpack/duffel toggle with icons
- `src/components/trip/PackingCard.tsx` — packing list UI grouped by priority tier with capacity bar, pack/unpack checkboxes
- `src/pages/TripDetailsPage.tsx` — trip details with capsule wardrobe, daily outfits, packing list, bag selector, packing visualization with stale detection
- `src/pages/ProfilePage.tsx` — profile photo upload UI with preview, file picker, error handling

**Stubbed / legacy (do not extend):**
- `src/trip/` — legacy stub, superseded by `src/features/trips/`
- `src/algorithms/capsule/capsule.algorithm.ts` — legacy stub, superseded by `capsuleGenerator.ts`
- `src/algorithms/outfit/outfit.algorithm.ts` — legacy stub, superseded by `outfitGenerator.ts`
- `src/algorithms/packing/packing.algorithm.ts` — legacy stub, superseded by `packingService.ts`

> **Note:** New feature work lives under `src/features/<feature>/` with the layout `types/`, `services/`, `hooks/`, `pages/`. The older `src/closet/` and `src/trip/` directories predate this convention.

## Coding Conventions

**Types:**
- Global domain types live in `src/types/`; feature-specific persistence DTOs live inside each module's `types/` subfolder
- `ISODate = string` (YYYY-MM-DD), `ISODateTime = string` (ISO 8601)
- `WarmthLevel` and `FormalityLevel` are literal union types: `1 | 2 | 3 | 4 | 5`

**Naming:**
- Interfaces: `I{Entity}Repository`, `I{Entity}Service`
- DB mapper functions: `to{EntityName}(row)` — convert snake_case DB row to camelCase domain object
- Validation helpers: `validate{InputName}(data)` — throw descriptive errors on invalid input
- Table name constants: module-level `const TABLE = '<table_name>'`
- Hook return types: `Use{Name}Return` interface exported alongside the hook

**Patterns:**
- Dependency injection: Supabase client passed into repositories; repository instances passed into services — never imported directly in service/component files
- Hooks instantiate their own service/repository internally using the Supabase singleton — components never import service or repository classes directly
- Mutations in hooks are optimistic: local state updates immediately; errors are caught and re-thrown so the calling component can respond
- Algorithms must be pure (no side effects, no external calls) — verified testable in isolation
- Validation lives exclusively in the service layer, not repositories
- Components receive all data via props; no direct service or repository calls
- All async methods use `async/await` (never `.then()`)
- Errors thrown with descriptive messages: `throw new Error('Failed to ...: ${error.message}')`

**Imports:**
- Use explicit relative paths, not barrel imports from distant `index.ts` files within the same module
- Cross-module imports go through the module's `index.ts`

## Testing

- Test runner: Vitest (`npm run test`)
- Test files: co-located under `__tests__/` inside each module
- All algorithm and service tests use factory helpers (`makeItem`, `makeWeather`, etc.) — never raw object literals
- Current coverage: capsule generator (11), outfit generator (22), packing service (31), packing capacity (12), closet service (22), image normalization (16), closet item schema (16), trip schema (15), login schema (5), fetchWithTimeout (5), weather cache (7) = 162 tests total
- Hooks and components are not yet tested

## Maintenance Rule

Whenever a change modifies architecture, project structure, tooling, or developer workflow, update this file before committing the change.

## Git Workflow

- Before major edits: read affected files and summarize the impact
- After meaningful completed work: run `npm run lint` and `npm run test` before committing
- Prefer small, frequent commits — one commit = one complete thought
- Commit message format: conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`)
- Push to current tracked branch: `git push`
- Do not commit code that throws unhandled errors or breaks TypeScript compilation
- Do not push if lint or tests clearly fail, unless explicitly instructed to

## Database Schema

Tables required in Supabase (run in SQL Editor):

```sql
-- closet_items
CREATE TABLE closet_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  color      TEXT NOT NULL,
  material   TEXT NOT NULL DEFAULT '',
  warmth     SMALLINT NOT NULL CHECK (warmth BETWEEN 1 AND 5),
  formality  SMALLINT NOT NULL CHECK (formality BETWEEN 1 AND 5),
  image_url  TEXT,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- trips
CREATE TABLE trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination      TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  activities       TEXT[] NOT NULL DEFAULT '{}',
  vibe             TEXT NOT NULL,
  weather_forecast JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Row Level Security must be enabled on both tables — users can only access their own rows.

## Working Notes

> Only non-obvious gotchas and active context kept here. Historical build log entries removed — see git history for details.

- **Type divergence (closet):** `src/closet/types/closet.types.ts` DTO uses `warmth`/`formality` field names (DB column names); domain type uses `warmthScore`/`formalityScore`. Intentional — repository mapper bridges the difference.
- **Type canonical sources:** `WeatherForecast`, `TripActivity`, `TripVibe`, `LuggageSize`, `Trip` all live in `src/features/trips/types/trip.ts`. `src/types/trip.types.ts` re-exports only — never add new types there.
- **Weather fetch is best-effort:** `createTrip()` and `updateTrip()` catch weather errors silently. Trips save with `weatherForecast: []` on failure. No UI warning for this yet.
- **Capsule scoring formula:** `warmthScore × 0.3 + formalityScore × 0.2 + tags.length × 0.5 − rainPenalty`. Weather thresholds in °C (10°C, 21°C).
- **Manual Supabase step:** `profile-images` storage bucket must be created manually in Supabase dashboard (Storage → New bucket → public: true).
- **Validation:** Shared zod schemas in `src/validation/` are the single source of truth. Service-layer `validateCreateInput`/`validateUpdateInput` call `schema.parse()`. Don't add hand-rolled validation.
- **Error handling:** Toast-only via `sonner` across all pages except `LoginPage` (keeps inline error). Don't add inline `<p>` error text.
- **Gemini resilience:** All client-side Gemini calls use `fetchWithTimeout` (30s). Hooks expose `timedOut` + `retry()`. Don't use raw `fetch()` for Gemini routes.
