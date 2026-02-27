# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with nodemon + tsx (no build step needed)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output (requires build first)

# Database
npm run drizzle:generate   # Generate migration files from schema changes
npm run drizzle:migrate    # Apply pending migrations to the database
```

## Environment Variables

The server reads from `.env` at startup. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — defaults to 5000
- `CLIENT_URL` — CORS origin, defaults to `http://localhost:5173`

## Architecture

### Request Lifecycle

`server.ts` → `app.ts` (middleware stack) → module router → controller

Global middleware order in `app.ts`: CORS → Helmet → Morgan → JSON → CookieParser → routes → `notFoundRouteMiddleware` → `errorMiddleware`. The not-found and error handlers **must stay last**.

All routes are mounted under the `/api` prefix in `app.ts`.

### Module Structure

Each domain module lives in `src/modules/<name>/` and follows this pattern:

- `<name>.router.ts` — Express Router, imported and registered in `app.ts`
- `<name>.controller.ts` — HTTP handlers only, delegates to service
- `<name>.service.ts` — Business logic
- `<name>.repository.ts` — All database queries via Drizzle
- `<name>.schema.ts` — Drizzle table definition **and** Zod validation schemas
- `index.ts` — Public export surface for the module

### Database Layer

- `src/config/db.config.ts` — `pg.Pool` instance (used by Drizzle)
- `src/config/index.ts` — re-exports the pool
- `src/db/index.ts` — **Schema aggregator**: every Drizzle table must be exported from here; `drizzle.config.ts` points to this file as the schema source for migration generation

When adding a new table, define it in the module's `*.schema.ts`, then re-export it from `src/db/index.ts`.

### AI Layer (`src/ai/`)

Planned but mostly stubbed. Intended structure:

- `aiClient.ts` — Claude API client wrapper
- `classifier.service.ts` — Classifies citizen requests by department/category
- `summarizer.service.ts` — Summarizes request content for officials
- `guardrails.ts` — Input/output safety checks
- `promptTemplate.ts` — Prompt builders
- `outputValidators.ts` — Validates AI response structure

### RBAC

Five roles defined in `users.schema.ts` (ascending privilege):
`citizen` → `government_employee` → `department_head` → `ministry_official` → `admin`

Role enforcement will go in `src/middleware/rabc.middleware.ts` (note: filename has a typo — `rabc` instead of `rbac`).

### TypeScript / Module System Note

`tsconfig.json` targets `commonjs` but `package.json` has `"type": "module"`. In development, `tsx` handles this transparently. If issues arise with ESM/CJS interop, check import paths — some internal imports use `.js` extensions.

## Current Implementation State

Most module files beyond `users.schema.ts` and the health module are stubs (empty files). The implemented foundation includes: Express app wiring, PostgreSQL pool, Drizzle config, users table schema, and the health check endpoint (`GET /api/health`).

Redis (`src/config/redis.ts`) and all AI services are scaffolded but not yet implemented — no Redis client package is installed yet.

## IMPORTANT RULES

NEVER modify Database Schema
