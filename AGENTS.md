# Planleggreise agent guide

## Project overview

Planleggreise is a travel planning web application. The repository is an npm
workspace monorepo. The frontend and backend currently live in the same
repository, but the backend is intentionally structured as a separate
application so it can be deployed independently later.

**Planleggreise** is the tentative final product name. Use planleggreise for new product
copy unless a branding task explicitly addresses the existing prototype.

## Product decisions

- **Backend platform:** Supabase is the planned hosted database and
  authentication platform.
- **Supabase frontend configuration:** use
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in
  `apps/frontend/.env.local`. These values are browser-visible configuration;
  never put a Supabase `service_role` key or any other privileged secret in a
  `VITE_*` variable or frontend code.
- **Authentication:** Google is the first authentication provider. Build the
  auth boundary so additional providers can be added later without changing
  application-wide user handling.
- **Session persistence:** give users an explicit option to persist their login
  on the device. Do not silently introduce a different persistence policy.
- **Language and locale:** the interface should use Norwegian Bokmal and the
  `nb-NO` locale by default. Format dates, times, numbers, and relative dates
  with the platform internationalization APIs rather than hand-written
  formatting.
- **Testing:** add and maintain backend tests only for now. Frontend and shared
  package tests are intentionally out of scope unless this decision changes.

## Basic product scope

The first version is intentionally a simple trip planner:

1. A user can log in.
2. A user can create a trip.
3. A trip has an inclusive `startDate` and `endDate`.
4. The app generates one day for every calendar date between those dates.
5. A trip can be at most 60 inclusive calendar days long.
6. Each day can have zero or more housing, activity, and meal entries.
7. A trip can optionally be shared through registered-user invitations or an
   access link.
8. Everyone with access can edit the trip. Access links still require login.

The app has two modes:

- **Plan mode:** create and organize the trip plan.
- **Travel mode:** the agenda and activity-picker experience used during the
  actual trip. Its editing and progress behavior is intentionally deferred.

### Initial domain concepts

These are the conceptual models for the basic feature set:

```text
User
Trip
TripMember
TripAccessLink
TripDay          # generated from Trip.startDate through Trip.endDate
HousingStay      # one stay with check-in and check-out dates
Activity
Meal
```

`TripDay` should be derived from the trip date range rather than persisted as
an independently editable record in the first version. Activities and meals
are initially attached to one trip date. Housing is represented as a stay
that can cover multiple nights.

### Date and time semantics

- Store trip and entry dates as calendar dates in `YYYY-MM-DD` form.
- Start and end dates are both included in the trip.
- Entry times are optional and support an all-day option.
- Times are wall-clock values at the trip location. A meal planned for `20:00`
  remains `20:00` when viewed from another timezone; do not convert it to the
  user's device timezone.
- Use local `HH:mm` values and Supabase `date`/`time`-compatible fields rather
  than timezone-aware timestamps for these planned values.

Do not add detailed fields for cost, links, transport, locations, recurrence,
or progress tracking until the relevant product behavior is requested.

## Repository structure

```text
.
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── app.ts       # Express app and API routes
│   │   │   ├── app.test.ts  # Backend route tests
│   │   │   ├── auth.ts      # Supabase bearer-token authentication
│   │   │   ├── index.ts     # Environment loading and HTTP server startup
│   │   │   ├── supabase.ts  # Authenticated Supabase client factory
│   │   │   └── trip-repository.ts
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   └── DatePicker.tsx
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   │   └── LoginScreen.tsx
│       │   │   └── trips/
│       │   │       ├── TripDashboard.tsx
│       │   │       ├── TripDetails.tsx
│       │   │       ├── TripForm.tsx
│       │   │       └── TripSettings.tsx
│       │   ├── lib/
│       │   │   ├── date-format.ts
│       │   │   ├── errors.ts
│       │   │   └── supabase.ts
│       │   ├── api.ts       # Typed frontend API client
│       │   ├── App.tsx      # Auth initialization and top-level routing
│       │   ├── index.css    # Tailwind imports and global styles
│       │   └── main.tsx
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig*.json
│       └── vite.config.ts   # Tailwind plugin and /api development proxy
├── packages/
│   └── models/
│       ├── src/
│       │   ├── index.ts     # Public model exports
│       │   └── trip.ts      # Trip and activity schemas/types
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   └── migrations/              # Database schema and RLS policies
├── package.json             # Root workspace scripts
├── package-lock.json
└── README.md
```

## Package boundaries

### `apps/frontend`

- Vite, React, TypeScript, and Tailwind CSS.
- Runs on `http://localhost:3000`.
- Calls the backend through `/api`.
- Vite proxies `/api` to `http://localhost:3001` during development.
- Frontend API responses must use schemas from `@planleggreise/models`.
- Keep UI-only state, presentation types, and components in this app.

### `apps/backend`

- Express and TypeScript.
- Runs on `http://localhost:3001`.
- Exposes the HTTP API under `/api`.
- `/api/trips` and `/api/trips/:tripId` require a Supabase bearer token.
- The first slice supports authenticated trip listing, creation, editing,
  recoverable archiving, activities, and generated days.
- Trip deletion is a soft delete. The backend sets `deleted_at` and never
  removes the row; archived trips are hidden from normal user queries.
- Keep HTTP concerns, authentication, persistence, and backend services here.
- Database/ORM-specific models and mappings belong here, not in the shared
  package.

### `packages/models`

- The shared source of truth for API-safe domain models.
- Define each model as a Zod schema and derive its TypeScript type:

  ```ts
  export const ExampleSchema = z.object({
    id: z.string(),
  })

  export type Example = z.infer<typeof ExampleSchema>
  ```
- Export public models from `src/index.ts`.
- Both frontend and backend may import this package.
- Do not put secrets, database clients, Express types, React types, or ORM
  entities in this package.
- Keep persistence-specific fields out of shared models unless they are part
  of the public API contract.

## Development commands

Run these from the repository root:

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run start
```

`npm run dev` builds the shared models package, then starts the models watcher,
backend, and frontend together.

Workspace-specific commands are also available:

```bash
npm run build --workspace @planleggreise/models
npm run build --workspace @planleggreise/backend
npm run build --workspace @planleggreise/frontend
npm run dev --workspace @planleggreise/backend
npm run dev --workspace @planleggreise/frontend
```

## Configuration

- Backend configuration is documented in `apps/backend/.env.example`.
- Use `apps/backend/.env` for local backend settings.
- Use `apps/frontend/.env.local` for `VITE_API_BASE_URL` when the API is
  deployed separately.
- Use `apps/frontend/.env.local` for the Supabase values documented in
  `apps/frontend/.env.example`.
- Apply the SQL migration in `supabase/migrations` to the configured Supabase
  project before using persistent trip data.
- Never commit `.env` files, credentials, API keys, or other secrets.

## Implementation conventions

- Use TypeScript and preserve strict type checking.
- Prefer existing workspace scripts and dependencies over adding new tooling.
- Validate external input and API responses with Zod schemas.
- Keep authenticated Supabase requests scoped to the current user's bearer
  token so database row-level security remains active.
- Keep API routes thin; move business logic into backend service modules as the
  backend grows.
- Keep frontend API access in API client modules rather than calling `fetch`
  throughout components.
- Use clear, domain-oriented names and avoid coupling frontend code to the
  backend's database or ORM.
- Make small, focused changes and do not overwrite unrelated user changes.
- Update `README.md` or this file when the architecture or developer workflow
  changes.

## Validation expectations

After code changes, run at least:

```bash
npm run build
npm run lint
npm test
```

For API changes, also verify the relevant endpoint locally. The current health
endpoint is `GET /api/health`, and the authenticated trip endpoints are
`GET /api/trips`, `GET /api/trips/:tripId`, `POST /api/trips`,
`PATCH /api/trips/:tripId`, and `DELETE /api/trips/:tripId`.

## Future decisions

The following remain to be specified:

1. **Admin restore:** define the admin authentication boundary and UI/API for
   restoring trips where `deleted_at` is set.
2. **Supabase schema and migrations:** define local development workflow and
   seed data.
3. **Row-level security:** verify the final sharing policies as members and
   access links are implemented.
3. **Persistence model boundary:** decide which database fields are exposed by
   the API and map ORM entities to shared API models in the backend.
4. **Authentication details:** configure Google OAuth redirect URLs, account
   linking, logout behavior, and the exact persisted-session opt-in UX.
5. **Travel mode behavior:** decide whether it is read-only, supports marking
   items complete/skipped, or allows full editing.
6. **Entry fields:** decide when to add locations, links, notes, costs,
   transport, and other details.
7. **Access links:** define expiration, revocation, and whether links can be
   limited to specific trips or permissions.
8. **Cross-day entries:** decide whether activities or meals may span multiple
   dates.
9. **API contract:** decide whether request/response schemas should be split
   from domain models and how breaking API changes are versioned.
10. **Backend test stack:** choose the backend test runner and add route,
    validation, authentication, and persistence tests as those features land.
11. **Quality automation:** add backend/models linting and CI checks once the
    codebase grows beyond the initial prototype.
