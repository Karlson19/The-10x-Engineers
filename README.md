# Chrysmec Auto Center

### [Try the live app](https://chrysmec.vercel.app)

[![Live demo](https://img.shields.io/badge/Live%20demo-chrysmec.vercel.app-2E3192?style=for-the-badge)](https://chrysmec.vercel.app)
[![API health](https://img.shields.io/badge/API-health-2E3192?style=for-the-badge)](https://chrysmec-api.onrender.com/health)

A progressive web app for Chrysmec Auto Center, a vehicle repair and servicing business with
branches in Kumasi, Techiman, Accra and Sunyani.

A customer books through a guided symptom intake instead of "my car has a problem". The booking
is routed to the mechanical or electrical section, assigned to a technician, and the customer
follows it stage by stage without ringing anyone. Technicians log diagnosis, parts and labour
against the job. Management gets live figures on bookings, revenue, stock and staff workload.
It keeps working when the network drops and syncs when it returns.

Primary users are on mid-range Android phones over 3G and 4G, so every performance and design
decision is made for the phone first.

---

## Contents

- [Running it in five minutes](#running-it-in-five-minutes)
- [Signing in](#signing-in)
- [What to look at first](#what-to-look-at-first)
- [How the app is put together](#how-the-app-is-put-together)
- [The three roles](#the-three-roles)
- [Things worth understanding before you change code](#things-worth-understanding-before-you-change-code)
- [The API](#the-api)
- [Testing](#testing)
- [Working on this as a team](#working-on-this-as-a-team)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Running it in five minutes

You need Node 20.11 or newer and pnpm 11.

```bash
pnpm install
```

Copy the example environment file and fill in a database URL:

```bash
cp .env.example apps/api/.env
```

`DATABASE_URL` is the only value you must supply. A free Neon project takes about a minute to
create. Then set up the schema and demo data:

```bash
pnpm db:deploy && pnpm db:seed
```

Point the web app at your local API:

```bash
echo 'NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"' > apps/web/.env.local
```

Start both apps together:

```bash
pnpm dev
```

The web app is on http://localhost:3000 and the API on http://localhost:4000.

---

## Signing in

Every seeded account uses the password `Chrysmec#2026`.

| Role | Email | Where it lands |
| --- | --- | --- |
| Management | `ama.boateng@chrysmec.com` | Dashboard, requests, staff, stock, prices, payments |
| Technician, mechanical | `kwame.mensah@chrysmec.com` | Job queue and the work log editor |
| Technician, electrical | `yaw.owusu@chrysmec.com` | The same, for the electrical section |
| Customer | `akosua.danso@example.com` | Booking wizard, requests, status timeline |

> **These exist only after you seed.** If sign in is refused on the deployed app, the demo data
> has been cleared from it. Re-seed, or register a fresh customer account through the app.

---

## What to look at first

If you have five minutes, these are the parts worth seeing.

**The guided intake, and what it does with the answers.** Book a service, choose Brakes, and
answer "Grinding or metal on metal" but say the car is still drivable. The app overrules the
customer and tells them to stop driving, with the workshop's number as the main action. The
assessment lives in `packages/shared/src/triage.ts` and is deliberately conservative: it never
diagnoses, and it always shows its reasons.

**The status timeline.** Open any booking as a customer. This is the thing the product is built
around: every stage timestamped, so nobody has to ring and ask. The same component runs on the
landing page as a live demonstration.

**The estimate loop.** A technician sends a price, the booking moves to awaiting approval, and
the customer approves or declines it before any work continues. That is what stops arguments at
handover.

**The work log and the stock ledger.** Add a part to a job and watch it leave stock. Then open
that part's history from the management inventory screen: every movement in and out, what each
delivery cost, and who recorded it.

**The management dashboard.** Pick different months from the period selector.

---

## How the app is put together

```
chrysmec/
├── apps/
│   ├── web/          Next.js 15 PWA, App Router, React 19
│   └── api/          Express 5 + Prisma, REST under /api/v1
├── packages/
│   └── shared/       Zod schemas, types, enums, symptom catalogue, triage
└── .github/workflows/
```

| Layer | Choice |
| --- | --- |
| Client | Next.js 15 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4 with CSS variable tokens |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Motion | Motion (framer-motion) |
| Offline | Serwist service worker + Dexie outbox |
| Charts | Recharts |
| API | Node.js + Express 5 + TypeScript |
| ORM | Prisma, PostgreSQL on Neon |
| Auth | JWT in memory + refresh token in an httpOnly cookie, argon2 hashing |
| Payments | Paystack, test mode |
| Tests | Vitest + Supertest |

**The rule that matters most:** every request and response shape is a Zod schema in
`packages/shared`, imported by both apps. The API validates with it and the client's forms
validate with the same one. Never hand-write a TypeScript interface that duplicates a schema.
Use `z.infer`.

### The 13 models

`User`, `Vehicle`, `ServiceRequest`, `Job`, `ServiceCatalogItem`, `RequestedService`,
`InventoryItem`, `StockMovement`, `WorkLogEntry`, `Payment`, `StatusEvent`, `Feedback`,
`Notification`.

Money is always `Decimal(10,2)` in GHS, serialised as a string in JSON and formatted on the
client. Never use a float for money.

---

## The three roles

Roles are separated strictly, and the separation is enforced on the server. Hiding a button is
not access control.

| | Customer | Technician | Management |
| --- | --- | --- | --- |
| Area | `/dashboard` | `/staff` | `/admin` |
| Sees | Only their own vehicles and bookings | Only jobs assigned to them, only stock in their section | Everything |
| Can | Book, approve or decline an estimate, pay, leave feedback | Log diagnosis, parts and labour, move a job on | Assign work, manage staff, stock, prices, see the figures |

`/account` sits outside all three, because everybody has an account.

### Status transitions

Enforced server side. Anything else is refused with a 400.

```
SUBMITTED         → SCHEDULED | CANCELLED
SCHEDULED         → IN_PROGRESS | CANCELLED
IN_PROGRESS       → AWAITING_APPROVAL | COMPLETED
AWAITING_APPROVAL → IN_PROGRESS | CANCELLED
COMPLETED         → terminal
CANCELLED         → terminal
```

A customer may only make two of these moves, both from awaiting approval: approve the estimate,
or decline it and cancel. Everything else belongs to the workshop.

---

## Things worth understanding before you change code

These are the decisions that are not obvious from the code, and the mistakes already made once.

### Stock is a ledger, not a number

`InventoryItem.quantityInStock` is a **cache**. The truth is `StockMovement`: an immutable row
for every receipt, consumption, return and adjustment, each carrying the price it moved at.

This matters because the item used to hold a single quantity and a single cost, both overwritten
in place. Restocking recorded no price at all, so what a part cost over time was unknowable, and
consumption was valued at whatever the price happened to be that day, which silently rewrote the
cost of jobs already finished.

- Everything that moves stock goes through `postMovement` in `apps/api/src/services/stock-ledger.ts`.
- Nothing is ever updated or deleted. A part going back on the shelf is a **new movement in the
  opposite direction**, not the removal of the old one.
- Stock leaving is valued at the weighted average of what is held, frozen onto the movement.
- The quantity and cost are **not editable by hand**. Stock arrives through a receipt, which
  takes the price, and is corrected through a stock take, which takes a reason.

### The session, and why it is the way it is

- The access token lives in a **module variable**, never in localStorage, so a cross-site script
  cannot read it.
- The refresh token is an **httpOnly cookie**.
- `AppProviders` is mounted **once, in the root layout**. It used to be per route group, which
  meant signing in crossed a boundary, destroyed the query cache and restored an older session.
  People ended up in whichever account the browser was last used with. Do not move it back.
- The session restore carries a **session epoch**. A slow refresh that lands after somebody signs
  in is discarded rather than written over them.
- In the browser the API is reached through **this app's own origin**, which `next.config.ts`
  rewrites to the real one. That keeps the refresh cookie first party so it survives in Chrome
  incognito and wherever third party cookies are blocked.

### Offline

1. A booking made offline goes into a **Dexie outbox** with a UUID `clientRequestId`.
2. It appears in the customer's list immediately with a "Pending sync" badge.
3. On reconnect the outbox flushes in order.
4. The server treats `clientRequestId` as an **idempotency key**: the same one twice returns the
   original record rather than creating a duplicate.

Test it by hand: submit in airplane mode, close the tab, reopen, go online, confirm exactly one
record exists.

### The service worker will bite you

API reads are **network first**, not stale-while-revalidate. Stale-while-revalidate is what the
original specification asked for, and it made the app look broken: every read came from cache
first, so the refetch after a booking or an approval painted the data from *before* the change.
That was the "you have to refresh before anything happens" report.

Two things guard against a stale build after a deploy: `ServiceWorkerRefresh` reloads once when a
new worker takes control, and the error boundary clears the caches and reloads if a stale chunk
slips through anyway.

The worker is **disabled in development**, so none of this shows up locally.

### Money and dates

- Currency always renders as `GHS 450.00`.
- Dates as `12 Aug 2026`, times in 24 hour format.
- The analytics net counts parts against the month the **job was completed**, not when the part
  left the shelf. Counting consumption alone made any month with work in progress read as a loss.

### Writing style

No em dashes or en dashes anywhere, including code comments and commit messages. Sentence case
for headings and buttons. No emoji. Error messages say what happened and what to do next.

---

## The API

Base path `/api/v1`. JSON in, JSON out. `Authorization: Bearer <accessToken>`.

Every failure uses the same envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": {} } }
```

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` `/login` `/refresh` `/logout` `/change-password`, `GET /auth/me` |
| Users | `GET|POST /users`, `GET|PATCH|DELETE /users/:id` (management only) |
| Vehicles | `GET|POST /vehicles`, `GET|PATCH|DELETE /vehicles/:id` |
| Service requests | `GET|POST /service-requests`, `GET|PATCH|DELETE /service-requests/:id`, `PATCH /:id/status`, `GET /:id/timeline`, `GET /:id/invoice`, `POST|GET /:id/feedback` |
| Jobs | `GET|POST /jobs`, `GET|PATCH /jobs/:id`, `POST|GET /jobs/:id/worklog`, `DELETE /jobs/:id/worklog/:entryId` |
| Catalogue | `GET /services/public` (open), `GET|POST /services`, `PATCH|DELETE /services/:id` |
| Inventory | `GET|POST /inventory`, `PATCH /inventory/:id`, `POST /:id/receive`, `POST /:id/adjust`, `GET /:id/history` |
| Payments | `POST /payments/initialize`, `POST /payments/webhook`, `GET /payments/:reference/confirm`, `GET /payments` |
| Analytics | `GET /analytics/summary?period=YYYY-MM` (management only) |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Health | `GET /health` |

`GET /services/public` is open on purpose: a workshop advertises its prices, and the landing page
reads its price list from it.

### Security

- argon2 password hashing. Access token 15 minutes, refresh token 7 days.
- Authorisation checked on the server for **every** request, including ownership.
- `/auth/*` rate limited to 10 requests per 15 minutes per IP.
- `helmet`, a strict CORS allowlist, body size limits.
- Every input validated with a shared Zod schema at the route boundary. `req.body` never reaches
  Prisma raw.
- The Paystack webhook signature is verified before the payload is trusted.
- Passwords, tokens and full payment payloads are never logged.

---

## Testing

```bash
pnpm test        # everything
pnpm test:api    # API, Vitest + Supertest
pnpm test:web    # client, Vitest
```

86 API tests and 20 client tests. They cover the happy path through register, login and a
protected route; rejection of a missing or invalid token; a customer refused on a management
route; a customer unable to read another customer's booking; full CRUD on a service request;
invalid status transitions; idempotency; stock decrementing and refusing an over-quantity line;
the price history the ledger produces; and a technician being blocked from leaving while they
still hold open work.

### Give the tests their own database

The suite creates and deletes accounts, bookings and payments. Pointed at the database the dev
servers use, runs fail for reasons that have nothing to do with the code. Pointed at the deployed
one it would delete real work, so **it refuses to run against anything that is not local** unless
you name it.

1. Branch the project in the Neon console. A branch is free and takes seconds.
2. Put its connection string in `apps/api/.env` as `TEST_DATABASE_URL`.
3. `pnpm --filter api exec prisma migrate deploy`

CI already does this with a Postgres service container.

Seeding has the same guard: it empties every table first, so it will not run against a
non-local database unless you pass `SEED_REMOTE=yes`.

---

## Working on this as a team

### Before you push

```bash
pnpm typecheck && pnpm lint && pnpm test
```

CI runs all three plus a build of both apps on every push and pull request. Anything red will be
caught there, so it is faster to catch it here.

### House rules

- **No `any`, no `@ts-ignore`, no `!` to silence the compiler.** Fix the type.
- **Controllers parse and delegate.** Business logic lives in services.
- **Never duplicate a type a Zod schema already defines.**
- **Never trust `role` from a client payload.**
- **Never commit `.env`, secrets or a database URL.**
- **No paid dependency or service.** Everything here is free tier.
- Commit with conventional messages: `feat:`, `fix:`, `chore:`. The commit history is part of
  what is assessed, so commit at each meaningful step rather than once at the end.

### A feature is not done until

- [ ] Input validated with a shared Zod schema on the server
- [ ] Authorisation enforced server side, including ownership
- [ ] Loading, empty and error states all designed and implemented
- [ ] Works at 360px wide and with a keyboard
- [ ] Text contrast clears AA in both light and dark mode
- [ ] No TypeScript errors and no console errors in the browser
- [ ] Tests written and passing
- [ ] Still usable with the network throttled to Slow 3G

### Design tokens

The palette lives in `apps/web/src/app/globals.css` and nowhere else. Do not hardcode a colour.

| Token | Light | Meaning |
| --- | --- | --- |
| `--primary` | `#2E3192` | The brand blue. Structure, headers, standard buttons |
| `--accent` | `#F5A524` | Amber. **The single most important action on a screen** |
| `--accent-text` | `#96500A` | Amber as text, because the fill is too light on white |
| `--destructive` | `#B3121B` | Destructive and error, and nothing else |
| `--background` | `#F7F8FC` | The page |
| `--card` | `#FFFFFF` | Surfaces that lift off it |

Two amber buttons competing in one view is a bug. Red is never a call to action: it was once,
which meant "Book a service" and "Delete this booking" were the same colour.

Dark mode is designed, not inverted, and every pairing the product paints was checked against
WCAG AA in both modes.

### Motion

Timings live in `apps/web/src/lib/motion.ts` and nothing exceeds 400ms. Use the primitives in
`components/shared/reveal.tsx` rather than writing one-off animations.

- Animate **transform and opacity only**. Never width, height, top or left.
- Animate on **mount and on genuine state change**, never on a refetch. A list that re-staggers
  itself every thirty seconds is infuriating.
- `prefers-reduced-motion` is handled once, globally, by `MotionProvider`. Individual components
  do not need to ask.

---

## Deployment

| Service | What | Notes |
| --- | --- | --- |
| Vercel | `apps/web` | Set `NEXT_PUBLIC_API_URL` |
| Render | `apps/api` | Runs `prisma migrate deploy` on build |
| Neon | PostgreSQL | Use the pooled connection string |

Render free instances sleep after 15 minutes. A scheduled GitHub Action pings `/health`, but
**warm it by hand before any demo**: open the health URL and wait for it to answer.

`.env.example` documents every variable. Real values live in the Vercel and Render dashboards,
never in the repository.

---

## Troubleshooting

**Sign in hangs, or the first request takes about a minute.** The Render instance was asleep.
Wait and try again; everything is quick once it is awake.

**Sign in is refused with the seeded accounts on the deployed app.** The demo data has been
cleared from that database. Re-seed it, or register a fresh customer through the app.

**The app looks broken after a deploy, and a hard refresh fixes it.** An old service worker was
still serving the previous build. This should now correct itself; if it does not, clear the site
data for the origin and reload.

**`pnpm dev` serves 404s for JavaScript chunks.** A production build has overwritten `.next`
underneath the dev server. Stop it, `rm -rf apps/web/.next`, and start again.

**The tests refuse to run.** They are pointed at a database that is not local and not named as
the test database. See [Testing](#testing).

**Prisma types are missing after pulling.** `pnpm db:generate`.

**Shared types are missing or stale.** `pnpm build:shared`. Both `pnpm dev` and `pnpm typecheck`
do this first, but a bare `tsc` in one app will not.
