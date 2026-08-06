# planleggreise

Travel planning app built as a small npm workspace. The API is kept in its own Express application so it can be deployed independently later, while the Vite development server proxies API requests locally.

## Stack

- `apps/frontend`: Vite, React, TypeScript, and Tailwind CSS
- `apps/backend`: Express, TypeScript, Supabase API access, and backend tests
- `packages/models`: Shared Zod schemas and TypeScript model types
- `supabase/migrations`: Supabase database schema and row-level security policies
- Local API: `http://localhost:3001`
- Local frontend: `http://localhost:3000`

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Before starting the app, configure the frontend and backend environment files.
The frontend requires Supabase browser configuration, and the backend uses the
same project URL and publishable key to make requests in the authenticated
user's context.

```bash
copy apps\frontend\.env.example apps\frontend\.env.local
copy apps\backend\.env.example apps\backend\.env
```

Fill in the Supabase values, then open `http://localhost:3000`. The first
vertical slice supports Google login, private trip creation, authenticated
trip listing, trip settings, recoverable trip archiving, activities, and
generated days for each inclusive trip date. Trips, days, accommodation stays,
meals, and activities support editable notes; non-empty notes appear in travel
mode. Trips may contain at most 60 inclusive calendar days. The frontend uses
`/trips/<trip-id>` URLs for
bookmarked and shareable trip plans; access remains protected by authentication
and Supabase row-level security.

To add activities from Google Maps links, enable Places API (New) in Google
Cloud and set `GOOGLE_PLACES_API_KEY` in `apps/backend/.env`. Keep this key
backend-only; it must not be added to a `VITE_*` variable.

Apply all migrations in `supabase/migrations` to the Supabase project before
using trip persistence. Deleting a trip archives it by setting `deleted_at`;
the row and its related data remain in the database for a future admin restore
workflow. Archived trips are hidden from the normal user API.
Configure Google as an OAuth provider and add `http://localhost:3000` as a
redirect URL in Supabase Authentication.

Shared models belong in `packages/models/src`. Define each model's Zod schema there and derive its TypeScript type from the schema. The backend and frontend both import the package, while database/ORM-specific mappings remain backend-owned.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and backend together |
| `npm run build` | Build both workspaces |
| `npm run lint` | Lint the frontend |
| `npm test` | Run the backend test suite |
| `npm run start` | Start the built backend |

## Configuration

- Copy `apps/backend/.env.example` to `apps/backend/.env`.
- Copy `apps/frontend/.env.example` to `apps/frontend/.env.local`.
- `GOOGLE_PLACES_API_KEY` is required for resolving Google Maps activity links.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is browser-visible configuration, not a
  service secret. Never expose a Supabase `service_role` key through `VITE_*`
  variables or frontend code.
- The backend currently uses the user's bearer token so Supabase RLS remains
  effective. Do not replace this with a privileged service-role client
  without explicitly designing the security boundary.
