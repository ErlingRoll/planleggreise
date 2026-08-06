# planleggreise

Travel planning app built as a small npm workspace. The API is kept in its own Express application so it can be deployed independently later, while the Vite development server proxies API requests locally.

## Stack

- `apps/frontend`: Vite, React, TypeScript, and Tailwind CSS
- `apps/backend`: Express and TypeScript
- `packages/models`: Shared Zod schemas and TypeScript model types
- Local API: `http://localhost:3001`
- Local frontend: `http://localhost:5173`

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend loads its starter trip data from `GET /api/trips`.

Shared models belong in `packages/models/src`. Define each model's Zod schema there and derive its TypeScript type from the schema. The backend and frontend both import the package, while database/ORM-specific mappings remain backend-owned.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and backend together |
| `npm run build` | Build both workspaces |
| `npm run lint` | Lint the frontend |
| `npm run start` | Start the built backend |

## Configuration

Copy `apps/backend/.env.example` to `apps/backend/.env` when local API configuration is needed. The frontend can target a separately deployed API by setting `VITE_API_BASE_URL` in `apps/frontend/.env.local`.
