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
| Utilities | `src/utils/` | Pure helper functions (date, temperature) |

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
- `src/utils/` — date and temperature helpers
- `src/types/` — global domain types (`WeatherForecast` re-exported from `src/features/trips/types/trip.ts`)
- `src/lib/supabase.ts` — Supabase singleton
- `src/lib/apiAuth.ts` — Bearer token validation for API routes (`getAuthUser`)
- `src/contexts/AuthContext.tsx` — `AuthProvider` + `useAuth()` (user, userId, loading, signOut)
- `src/features/trips/` — `TripService` with weather pipeline integration
- `src/services/weather/weatherService.ts` — Open-Meteo integration, no API key required
- `src/services/geocoding/geocodingService.ts` — Open-Meteo geocoding, no API key; `searchDestination(query)` returns up to 5 `GeocodingResult[]`
- `src/algorithms/capsule/capsuleGenerator.ts` — full 5-step pipeline with versatility scoring + unit tests
- `src/algorithms/outfit/outfitGenerator.ts` — activity formality filtering, streak tracking, color ranking + unit tests
- `src/features/packing/services/packingService.ts` — wear-count aggregation, accessory dedup, toiletries + unit tests
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
- `src/pages/api/gemini/parse-trip.ts` — POST; parses free-text trip description → `{ activities, vibe }` via Gemini 2.0 Flash
- `src/pages/api/gemini/suggest-tags.ts` — POST; suggests clothing tags from free-text description via Gemini 2.0 Flash
- `src/pages/api/ai/generate-packing-image.ts` — POST; generates suitcase flat-lay visualization via Gemini 2.5 Flash Image
- `src/pages/api/ai/generate-outfit-image.ts` — POST; generates outfit flat-lay via provider abstraction (Gemini default, swap via `OUTFIT_PROVIDER` env var)
- `src/pages/api/images/upload-profile-photo.ts` — POST; normalizes (sharp) + uploads profile photo to Supabase Storage, saves URL in `user_profiles`
- `src/services/imageNormalization/imageNormalizationService.ts` — server-side sharp pipeline: EXIF rotate, cover-crop, strip metadata, JPEG 85%
- `src/services/packingVisualization/packingVisualizationService.ts` — builds structured prompt + calls Gemini image generation
- `src/services/outfitVisualization/types.ts` — `OutfitVisualizationProvider` interface for swappable AI backends
- `src/services/outfitVisualization/geminiProvider.ts` — Gemini 2.5 Flash Image implementation of `OutfitVisualizationProvider`
- `src/features/userImages/` — `UserImageRepository`: `getProfile`, `uploadProfileImage`, `upsertProfileImageUrl`
- `src/hooks/useProfileImage.ts` — loads profile image URL on mount; `upload(file)` POSTs to normalize+upload route
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
- Current coverage: capsule generator (3), outfit generator (22), packing service (15) = 40 tests total
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

- **2026-03-12 — Initial scaffold:** Architecture scaffolded with layered pattern (types → repository → service → hook → component → page). Only `closet` module is fully implemented. All other modules, algorithms, hooks, and UI are stubs.
- **2026-03-12 — features/ convention introduced:** New feature work lives under `src/features/<feature>/` (types/, services/, hooks/, pages/) rather than the flat `src/<feature>/` layout used by the initial closet scaffold. `src/features/trips/` is the first module under this convention. `src/trip/` is a legacy stub and should not be extended.
- **2026-03-14 — WeatherService implemented:** `src/services/weather/weatherService.ts` replaced stub with Open-Meteo integration. Exports `getWeatherForecast(latitude, longitude)` — no API key required. `WeatherForecast` is defined in `src/features/trips/types/trip.ts` (source of truth) and re-exported from `weatherService.ts`. Caching and retry logic not yet implemented.
- **Type divergence (closet):** `src/closet/types/closet.types.ts` DTO uses `warmth`/`formality` field names (DB column names); domain type uses `warmthScore`/`formalityScore`. Intentional — repository mapper bridges the difference. Both types also include `material: string` and `tags: string[]`.
- **2026-03-14 — Weather pipeline connected to trip creation:** `createTrip()` calls `getWeatherForecast()` and stores result as `weather_forecast` (JSONB). Weather fetch is best-effort — failures are logged and trip is saved with `weatherForecast: []`. `CreateTripInput` requires `latitude` and `longitude`.
- **2026-03-16 — Capsule generator rewritten:** `capsuleGenerator.ts` replaced placeholder 0.5 scores with a concrete formula: `warmthScore × 0.3 + formalityScore × 0.2 + tags.length × 0.5 − rainPenalty`. Weather conditions derived from `avgTemp` (mean of `temperatureHigh`) and `rainRisk` (mean of `rainProbability`). Fahrenheit thresholds from spec converted to °C (50°F → 10°C, 70°F → 21°C). `ItemScore` shape changed to `{ versatilityScore, breakdown: { warmth, formality, tags, rainPenalty } }`.
- **2026-03-16 — Type fixes:** Stale `WeatherForecast` in `src/types/trip.types.ts` (old fields: `tempHighC`, `location`, `condition`) removed and replaced with a re-export from `src/features/trips/types/trip.ts`. Closet DTO and repository updated to include `material` and `tags` fields.
- **2026-03-16 — Outfit generator tests added:** 22 tests covering activity formality filtering, streak tracking, color ranking, required category coverage, output shape, and multi-slot day behaviour.
- **2026-03-16 — Packing service tests added:** 15 tests covering clothing wear-count aggregation, accessory deduplication, alphabetical sorting, toiletries always present, and reference isolation.
- **2026-03-16 — Next.js bootstrapped:** `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts` added. Pages updated from `export {}` stubs to valid `NextPage` default exports. `src/pages/_app.tsx` and `src/pages/index.tsx` added.
- **2026-03-18 — useCloset implemented:** `src/hooks/useCloset.ts` bridges `ClosetRepository` + `ClosetService` to React state. Fetches on mount, exposes `addItem` / `updateItem` / `removeItem` / `refresh`. Mutations are optimistic.
- **2026-03-26 — All hooks implemented:** `useTrip` (createTrip non-optimistic due to weather fetch; updateTrip/deleteTrip optimistic, list re-sorted by startDate after changes), `useCapsuleWardrobe` (manual `generate()` trigger; builds TripDay[] from dateRange × activities; falls back to mild default forecast if Open-Meteo has no data for a date).
- **2026-03-26 — Auth layer added:** `AuthContext` + `AuthProvider` wrap the app in `_app.tsx`. `useAuth()` exposes `user`, `userId`, `loading`, `signOut`. `src/lib/apiAuth.ts` provides `getAuthUser(req)` for API route handlers — validates Bearer token without mutating the global Supabase singleton.
- **2026-03-26 — All pages implemented:** `LoginPage` (email/password sign in + sign up via Supabase), `ClosetPage` (full CRUD with `useCloset`), `TripPage` (full CRUD with `useTrip`), `CapsulePage` (select trip + generate pipeline with `useCapsuleWardrobe`). `NavBar` added to `_app.tsx` — shows nav links only when signed in.
- **2026-03-26 — Gemini API routes added:** `POST /api/gemini/parse-trip` parses free-text trip descriptions into `{ activities, vibe }`. `POST /api/gemini/suggest-tags` suggests clothing tags from a description. Both routes require a valid Supabase Bearer token and `GEMINI_API_KEY` env var. Both use `gemini-2.0-flash`. Add `GEMINI_API_KEY` to `.env.local`.
- **2026-03-26 — Geocoding service added:** `src/services/geocoding/geocodingService.ts` wraps Open-Meteo geocoding API (no key required). `searchDestination(query, signal?)` returns up to 5 `GeocodingResult[]` (name, country, region, lat, lng). Used in `TripPage` to resolve destination names to coordinates before calling `createTrip`.
- **2026-03-26 — Shared components completed:** `NavBar` (auth-aware), `ErrorBoundary` (page-level crash protection), `TripCard` (trip summary + actions).
- **2026-03-27 — AI visualization added:** Packing suitcase visualization (`POST /api/ai/generate-packing-image`) and per-outfit flat-lay visualization (`POST /api/ai/generate-outfit-image`) using Gemini 2.5 Flash Image. Outfit provider is abstracted behind `OutfitVisualizationProvider` interface — swap via `OUTFIT_PROVIDER` env var. Visualization URLs persisted in `capsule_wardrobes` table (`packing_visualization_url TEXT`, `outfit_visualizations JSONB`). Migration: `006_visualization_urls.sql`.
- **2026-03-27 — Profile photo + image normalization pipeline:** `src/services/imageNormalization/imageNormalizationService.ts` (sharp: EXIF rotate, cover-crop 512×768 or 512×512, strip metadata, JPEG 85%). `POST /api/images/upload-profile-photo` normalizes → uploads to `profile-images` Supabase Storage bucket → saves URL in `user_profiles` table. `ProfilePage` with photo preview and file picker. Migration: `007_user_profile_images.sql`. **Manual step required:** create `profile-images` bucket in Supabase dashboard (Storage → New bucket → name: `profile-images`, public: true).
