# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev               # Start dev server with nodemon + tsx (no build step needed)
npm run build             # Compile TypeScript to dist/
npm run start             # Run compiled output (requires build first)

# Database
npm run drizzle:generate  # Generate migration files from schema changes
npm run drizzle:migrate   # Apply pending migrations to the database
npm run initDB            # Run seed script (tsx src/seed/seed.ts)

# Docker
npm run docker:run        # Start containers (docker compose up -d --build)
npm run docker:stop       # Stop containers (docker compose down)
```

## Environment Variables

All env vars are validated at startup via Zod in `src/config/env.ts` — the process exits immediately if any required variable is missing.

| Variable           | Required | Default                    | Notes                        |
|--------------------|----------|----------------------------|------------------------------|
| `DATABASE_URL`     | Yes      | —                          | PostgreSQL connection string |
| `REDIS_URL`        | No       | `redis://localhost:6379`   | Used for token revocation    |
| `JWT_SECRET`       | Yes      | —                          | Min 32 chars                 |
| `JWT_REFRESH_SECRET` | Yes    | —                          | Min 32 chars                 |
| `SMTP_HOST`        | Yes      | —                          |                              |
| `SMTP_PORT`        | No       | `465`                      |                              |
| `SMTP_USER`        | Yes      | —                          |                              |
| `SMTP_PASS`        | Yes      | —                          |                              |
| `EMAIL_FROM`       | Yes      | —                          |                              |
| `PORT`             | No       | `5002`                     |                              |
| `CLIENT_URL`       | No       | `http://localhost:5173`    | CORS origin                  |
| `NODE_ENV`         | No       | `development`              |                              |

## Architecture

### Request Lifecycle

`server.ts` → `app.ts` (middleware stack) → module router → controller → service → repository

Global middleware order in `app.ts`: CORS → Helmet → Morgan → JSON → CookieParser → routes → `notFoundRouteMiddleware` → `errorMiddleware`. The not-found and error handlers **must stay last**.

All routes are mounted under `/api` or `/api/v1` in `app.ts`.

### Module Structure

Each domain module lives in `src/modules/<name>/` and follows this pattern:

- `<name>.router.ts` — Express Router, imported and mounted in `app.ts`
- `<name>.controller.ts` — HTTP handlers only; parse/validate request, call service, return response
- `<name>.service.ts` — Business logic
- `<name>.repository.ts` — All database queries via the shared `db` Drizzle instance
- `<name>.schema.ts` — Drizzle table definition (no Zod here; Zod lives in `src/zodschemas/`)
- `index.ts` — Public export surface for the module

### Database Layer

- `src/config/db.config.ts` — Creates the `pg.Pool` and exports the Drizzle instance as `db`
- `src/config/index.ts` — Re-exports `db` and `env` for convenient imports
- `src/db/index.ts` — **Schema aggregator**: every Drizzle table must be re-exported from here; `drizzle.config.ts` uses this file as the schema source for migration generation

When adding a new table: define it in the module's `*.schema.ts`, then re-export it from `src/db/index.ts`.

### Validation Pattern

Zod schemas live in `src/zodschemas/<domain>.ts` (not in module schema files). Each schema file also exports the inferred TypeScript types (`z.infer<typeof ...>`). Controllers call `.safeParse()` and return a 400 with `errors: parsed.error.flatten().fieldErrors` on failure.

### Error Handling

Throw `AppError` (from `src/shared/errors/AppError.ts`) for expected errors:

```ts
throw new AppError(404, "Resource not found");
throw new AppError(409, "Conflict message", { meta: "value" });
```

The global `errorMiddleware` catches `AppError` and returns the appropriate HTTP status. Unknown errors fall through to a 500 response.

### Auth System

- **Tokens**: JWT access token (15 min) + refresh token (7 days), both stored in `HttpOnly` cookies (`access_token`, `refresh_token`).
- **Token revocation**: Blacklisted JTIs are stored in Redis with TTL. `redisClient` connects automatically at startup and exits the process on failure.
- **MFA**: TOTP via `otplib`. Login returns a short-lived `challengeToken` (UUID stored in Redis) when MFA is enabled; client then calls `POST /auth/mfa/verify` with the TOTP code.
- **Email verification**: UUID token stored in DB; sent via Nodemailer on register and `POST /auth/resend-verification`.
- **Account lockout**: After `LOCKOUT_THRESHOLD` (5) failed logins, account is locked for `LOCKOUT_DURATION_MS` (15 min). Constants in `src/utils/constants.ts`.

### RBAC

Three roles defined in `users.schema.ts` (ascending privilege): `citizen` → `admin` → `super_admin`.

Apply role enforcement with the `requireRole` middleware from `src/middleware/rabc.middleware.ts` (note: filename typo is intentional — do not rename):

```ts
router.get("/admin/thing", authenticate, requireRole("admin", "super_admin"), handler);
```

`authenticate` sets `req.user` (typed as `JwtAccessPayload`). `req.user` is declared on `Request` via a type augmentation in `src/types/`.

### AI Layer (`src/ai/`)

Planned but mostly stubbed. Intended for Claude API integration: classifier, summarizer, guardrails, prompt templates, output validators. No AI package is installed yet.

### Seed Data

`src/seed/seed.ts` is the entry point. Data files for each domain (departments, categories, services, users, requests) live alongside it. Run with `npm run initDB`.

## Data Model Overview

```
users ──────────────────────────────────┐
  └─ user_mfa (1:1)                     │
                                        │
departments                             │
  └─ services (many:1 dept, many:1 cat) │
       └─ service_requests ─────────────┘
            (many:1 user, many:1 service)

categories (independent, linked to services)
```

`serviceRequests.status` is a PG enum: `open | in_progress | under_review | pending_review | resolved | rejected | closed`.

## IMPORTANT RULES

NEVER modify the database schema.
