# Chrysmec Auto Center

A progressive web app for a vehicle repair and servicing business in Kumasi. Customers book a
service through a guided symptom intake, the booking is routed to the mechanical or electrical
section and assigned to a technician, staff log diagnosis, parts and labour against the job, and
management gets live analytics on bookings, revenue, expenses and stock. It keeps working when
the network drops and syncs when it comes back.

Primary users are on mid-range Android phones over 3G and 4G, so every performance and design
decision is made for the phone first.

## Stack

| Layer | Choice |
| --- | --- |
| Client | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Offline | Serwist service worker + Dexie (IndexedDB) outbox |
| Charts | Recharts |
| API | Node.js + Express + TypeScript, REST under `/api/v1` |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Auth | JWT access token in memory + refresh token in an httpOnly cookie, argon2 hashing |
| Validation | Zod schemas shared between client and server |
| Tests | Vitest + Supertest |
| CI | GitHub Actions |
| Deploy | Web on Vercel, API on Render, database on Neon |
| Package manager | pnpm workspaces |

Everything above is free-tier. No dependency in this repo requires a paid plan.

## Repository layout

```
chrysmec/
├── apps/
│   ├── web/                 Next.js PWA
│   │   ├── src/app/         App Router routes and global styles
│   │   ├── src/components/  ui/ (shadcn), shared/, feature components
│   │   └── src/lib/         fonts, motion tokens, formatting, utils
│   └── api/                 Express API
│       ├── src/routes/      one file per resource
│       ├── src/controllers/ parse and delegate, nothing else
│       ├── src/services/    business logic
│       ├── src/middleware/  error handling, and from Phase 2 auth and RBAC
│       ├── src/lib/         Prisma client, logger, HttpError
│       ├── prisma/          schema, migrations, seed
│       └── tests/           Vitest + Supertest
├── packages/
│   └── shared/              Zod schemas, inferred types, enums, constants
└── .github/workflows/       CI and the uptime ping
```

Request and response shapes are defined once as Zod schemas in `packages/shared` and imported by
both apps. The API validates with them, client forms validate with them, and the OpenAPI document
is generated from them. Types come from `z.infer`, never hand-written twice.

## Design system

The look is editorial and spacious: warm paper, deep ink, a serif that carries the headings, and
enough whitespace that every element looks deliberate. Structure comes from hairline rules and
vertical rhythm rather than boxes and shadows.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--background` | `#FAF7F2` warm paper | `#16140F` warm near-black | Page surface |
| `--foreground` | `#1C1917` ink | `#F3EEE5` | Body and headings |
| `--primary` | `#17403A` deep pine | `#396B60` | Structure, panels, completed states |
| `--accent` | `#A64B1B` copper | `#EB8B3D` | The one most important action, the current stage |
| `--border` | `#E6DFD5` | warm charcoal | Hairline rules |

Copper carries white text in light mode (5.7:1) and ink text in dark mode. Pine carries paper
text (11.5:1). Every pairing clears WCAG AA.

Type is **Fraunces** for display, **Public Sans** for body and UI, **JetBrains Mono** for
references, SKUs, registration numbers and the small uppercase eyebrow labels. All three are
self-hosted by `next/font`, subset to latin, so there is no blocking request to Google on 3G.

The logo is a workshop seal that doubles as a C and as a progress ring: the ink arc is the
monogram, the copper segment is the stage a job has reached. It is the same idea as the status
timeline, reduced to something that still reads at 20px. The mark, the name and the mono
descriptor travel together as a lockup, in `src/components/brand`.

## Prerequisites

- Node.js 20.11 or newer (22 LTS recommended, which is what CI uses)
- pnpm 11 or newer: `npm install -g pnpm`
- PostgreSQL 14 or newer, running locally or a free Neon database

## Local setup

1. Install dependencies from the repository root.

   ```bash
   pnpm install
   ```

2. Create the API environment file. Copy `.env.example` and fill in the API block.

   ```bash
   cp .env.example apps/api/.env
   ```

   `DATABASE_URL` points at your PostgreSQL database. Generate each JWT secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Create the web environment file.

   ```bash
   printf 'NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"\n' > apps/web/.env.local
   ```

4. Create the database if it does not exist yet, then apply the migration and load the seed data.

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start both apps.

   ```bash
   pnpm dev
   ```

   The web app is on http://localhost:3000 and the API on http://localhost:4000. Check the API
   with http://localhost:4000/health, which reports uptime and whether the database is reachable.

## Seed data and demo accounts

`pnpm db:seed` wipes the database and loads a full demo dataset: one management user, two staff
(one per section), two clients with two vehicles each, 10 catalogue items, 15 inventory items,
and 20 service requests spread across every status and the last six months, with their status
timelines, jobs, work logs, payments, feedback and notifications. The analytics dashboard has a
real curve on it the first time it loads.

Every seeded account uses the password `Chrysmec#2026`. These accounts exist for development and
demonstration only.

| Role | Email |
| --- | --- |
| Management | ama.boateng@chrysmec.com |
| Staff, mechanical | kwame.mensah@chrysmec.com |
| Staff, electrical | yaw.owusu@chrysmec.com |
| Client | akosua.danso@example.com |
| Client | kofi.asare@example.com |

## Scripts

Run these from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Builds the shared package, then runs the API, the web app and the shared package watcher together |
| `pnpm dev:api` | API only, on port 4000 |
| `pnpm dev:web` | Web only, on port 3000 |
| `pnpm build` | Builds the shared package, the API and the web app |
| `pnpm lint` | ESLint across every workspace |
| `pnpm typecheck` | `tsc --noEmit` across every workspace |
| `pnpm test` | API tests with Vitest and Supertest |
| `pnpm db:migrate` | Creates and applies a migration in development |
| `pnpm db:deploy` | Applies existing migrations, used in CI and on Render |
| `pnpm db:seed` | Wipes and reloads the demo dataset |
| `pnpm db:reset` | Drops, re-migrates and re-seeds the database |
| `pnpm db:studio` | Opens Prisma Studio |

## How authentication works

- Passwords are hashed with **argon2id** at the OWASP floor: 19 MiB of memory, two passes.
- Signing in returns a 15 minute **access token in the response body**, which the client holds in
  a module variable. It is never written to localStorage or sessionStorage, so a cross-site
  script cannot read it back.
- The 7 day **refresh token is an httpOnly cookie**, invisible to JavaScript. After a page reload
  the client calls `POST /auth/refresh` once to get a new access token, which is how the session
  survives without storing anything readable in the browser.
- Refresh **rotates** both tokens, so a leaked refresh token is only useful until the real client
  next refreshes.
- Every authenticated request reloads the account from the database, so role changes and
  deactivations take effect immediately rather than when the token happens to expire.
- Registration always creates a `CLIENT`. The schema has no role field, so a role sent by a
  browser cannot be trusted or even read. Staff and management accounts are created by management
  through `POST /users`.
- `/auth/*` is rate limited to 10 requests per 15 minutes per IP.

## Testing

```bash
pnpm test
```

29 tests across three files cover the happy path, missing and invalid tokens, a refresh token
presented as an access token, role based access control, the role escalation attempt on register,
deactivated accounts, duplicate emails, refresh and logout, and the ownership guard.

Tests run against a real PostgreSQL database using the `DATABASE_URL` in `apps/api/.env`. Point
it at a throwaway database, not one holding data you care about. CI runs them against a
`postgres:16` service container.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: install with a frozen lockfile,
build the shared package, generate the Prisma client, lint, typecheck, apply migrations against a
PostgreSQL service container, seed, run the tests, then build both apps.

`.github/workflows/keep-warm.yml` pings the deployed `/health` endpoint every 10 minutes so the
Render free instance does not sleep. Set the `API_HEALTH_URL` repository variable once the API is
deployed, otherwise the job skips itself.

## Deployment

- **Vercel**, root directory `apps/web`, environment variable `NEXT_PUBLIC_API_URL`.
- **Render**, root directory `apps/api`.
  Build: `pnpm install && pnpm --filter api build && pnpm --filter api prisma migrate deploy`.
  Start: `pnpm --filter api start`.
- **Neon**, `DATABASE_URL` set to the pooled connection string.

Render free instances sleep after 15 minutes of no traffic. Warm the API by hand before any demo
as well as relying on the scheduled ping.

## Environment variables

Every variable is documented in `.env.example`. Real values live in the Vercel, Render and Neon
dashboards and are never committed.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | API | Signs the 15 minute access token |
| `JWT_REFRESH_SECRET` | API | Signs the 7 day refresh token, must differ from the access secret |
| `CORS_ORIGIN` | API | Comma separated allowlist of browser origins |
| `PAYSTACK_SECRET_KEY` | API | Paystack test mode key (Phase 6) |
| `AFRICASTALKING_API_KEY` | API | SMS sandbox key (Phase 6) |
| `AFRICASTALKING_USERNAME` | API | SMS sandbox username (Phase 6) |
| `NEXT_PUBLIC_API_URL` | Web | Base URL of the API including the version prefix |
| `PORT` | API | Port the server listens on, set for you on Render |
| `NODE_ENV` | API | `development`, `test` or `production` |

## Build progress

The build runs in phases and a phase does not start until the previous one runs.

- [x] **Phase 1, Foundation.** Workspace, both apps scaffolded, shared package, Prisma schema,
      migration, seed script, health endpoint, CI, this README.
- [x] **Phase 2, Auth.** argon2id hashing, JWT issue, verify and refresh with rotation, auth and
      RBAC middleware, the `/auth` and `/users` routes, login and register screens, the session
      context and the protected route wrapper.
- [ ] **Phase 3, Core CRUD.** Vehicles and service requests end to end, status transitions and the
      timeline, the booking wizard, request list and request detail.
- [ ] **Phase 4, Staff and management.** Jobs, work log, inventory decrements, catalogue,
      analytics, the staff job queue and the management dashboard.
- [ ] **Phase 5, Offline and polish.** Service worker, Dexie outbox, sync, notifications, feedback,
      every loading, empty and error state, accessibility and Lighthouse passes.
- [ ] **Phase 6, Integrations and deploy.** Paystack test mode, Africa's Talking SMS sandbox, and
      deployment of all three services.
