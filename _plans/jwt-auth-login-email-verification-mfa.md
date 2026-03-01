# Plan: JWT Auth — Login, Email Verification, MFA

## Context

The CivicFlow backend has a fully scaffolded `src/modules/auth/` directory, an empty Redis config, an empty env config, and an empty auth middleware — all stubs. The `users` table already contains every field needed for auth (lockout, MFA flag, email verification, etc.). This plan wires everything up end-to-end: registration, email verification, login with account lockout, TOTP MFA, JWT refresh token rotation with Redis denylist, logout, password reset, and resend-verification with rate limiting.

---

## Pre-implementation steps (run first)

```bash
npm install redis
```

New `.env` variables required:
```env
JWT_SECRET=<min-64-char-random>
JWT_REFRESH_SECRET=<different-min-64-char-random>
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="CivicFlow <your@gmail.com>"
```

After step 4 below (auth.schema.ts is written), run migrations:
```bash
npm run drizzle:generate
npm run drizzle:migrate
```

---

## Implementation Order

### 1. `src/shared/errors/AppError.ts` — NEW

Custom error class for HTTP-semantic errors. Required by the service layer and the error middleware.

```ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

---

### 2. `src/config/env.ts` — NEW (was empty stub)

Zod-validated env config. Fails fast at startup if required vars are missing.

Validates: `PORT`, `NODE_ENV`, `CLIENT_URL`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`.

Export: `env` — typed config object. Used everywhere instead of `process.env`.

---

### 3. `src/config/redis.ts` — NEW (was empty stub)

`redis` v4 client singleton. Connects at module load time. Logs connect/error events.

```ts
export { redisClient }
```

**Redis key reference:**

| Key | Value | TTL |
|---|---|---|
| `email_verify:<uuid>` | userId | 86400s (24h) |
| `mfa_challenge:<uuid>` | userId | 300s (5m) |
| `pwd_reset:<uuid>` | userId | 3600s (1h) |
| `refresh_denylist:<jti>` | `"1"` | Remaining token lifetime |
| `resend_email:<email>` | incr count | 3600s (1h) |
| `resend_ip:<ip>` | incr count | 3600s (1h) |

---

### 4. `src/modules/auth/auth.schema.ts` — NEW

Two concerns in one file (per module convention):

**Drizzle table — `user_mfa`:**
```ts
export const userMfa = pgTable("user_mfa", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  totpSecret: text("totp_secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```
`unique()` enforces 1-to-1 with users. `onDelete: "cascade"` keeps the table clean.

**Zod schemas (all exported):**
- `RegisterBodySchema` — email, password (min 8, max 128), firstName, lastName, phoneNumber?
- `LoginBodySchema` — email, password
- `MfaVerifyBodySchema` — challengeToken (uuid), totpCode (length 6)
- `ResendVerificationBodySchema` — email
- `RequestPasswordResetBodySchema` — email
- `ResetPasswordBodySchema` — token (uuid), password (min 8, max 128)
- Inferred types exported for each schema

---

### 5. `src/db/index.ts` — MODIFY

Add one line:
```ts
export { userMfa } from "../modules/auth/auth.schema";
```
This makes Drizzle Kit pick up the new table for migration generation.

**→ Run migrations now.**

---

### 6. `src/modules/auth/auth.types.ts` — NEW

```ts
export type UserRow = InferSelectModel<typeof users>
export type SafeUser = Omit<UserRow, "passwordHash">

export interface JwtAccessPayload {
  sub: string          // userId
  role: UserRow["role"]
  departmentId: string | null
  jti: string          // UUID per token
}

export interface JwtRefreshPayload {
  sub: string
  jti: string
}
```

Augments `express-serve-static-core` so `req.user?: JwtAccessPayload` is globally typed.

---

### 7. `src/modules/auth/auth.repository.ts` — NEW

All Drizzle queries. Creates its own `db = drizzle(pool, { schema })` using the shared pool from `src/config/index.ts`.

Exports:
- `findUserByEmail(email)` → `UserRow | undefined` (includes passwordHash for bcrypt)
- `findUserById(id)` → `UserRow | undefined`
- `createUser(data)` → `SafeUser` (strips passwordHash via destructuring)
- `setEmailVerified(userId)` → `void`
- `updateLoginFailure(userId, attempts, lockedUntil)` → `void`
- `updateLoginSuccess(userId, ip)` → `void`
- `findMfaSecret(userId)` → `string | null`
- `updatePassword(userId, passwordHash)` → `void` (also sets `passwordChangedAt = now()`)

---

### 8. `src/modules/auth/auth.service.ts` — NEW

Business logic only. No `req`/`res`. Imports: repository, redisClient, env, `sendEmail` from `src/utils/email.ts`, bcryptjs, jsonwebtoken, crypto, otplib.

**Key flows:**

**`register(body)`**
1. Check email uniqueness → 409 if taken
2. `bcrypt.hash(password, 12)`
3. `createUser()`
4. Store `email_verify:<uuid>` in Redis (24h TTL)
5. `sendEmail()` with verification link

**`login(email, password, ip)`**
Timing-attack-safe ordering:
1. `findUserByEmail()` (may return null)
2. `bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)` — always runs
3. Check `accountLockedUntil` — throw 423 if locked (before counting this attempt)
4. If user not found OR password invalid → increment `failedLoginAttempts`, lock at 5 → throw 401
5. Check `isActive` → 403
6. Check `isEmailVerified` → 403
7. `updateLoginSuccess()` (reset counter, set lastLoginAt/lastLoginIp)
8. If `mfaEnabled`: store `mfa_challenge:<uuid>` in Redis (5m TTL) → return `{ mfaRequired: true, challengeToken }`
9. Else: return `{ user: SafeUser }`

**`issueTokens(user)`** — exported helper (controller calls this)
- Access token: `jwt.sign({ sub, role, departmentId, jti }, JWT_SECRET, { expiresIn: "15m" })`
- Refresh token: `jwt.sign({ sub, jti }, JWT_REFRESH_SECRET, { expiresIn: "7d" })`
- Returns `{ accessToken, refreshToken, accessJti, refreshJti }`

**`buildCookieOptions(type)`** — exported helper
- Both: `httpOnly: true, secure: (NODE_ENV === "production"), sameSite: "strict"`
- Access: `maxAge: 15 * 60 * 1000`
- Refresh: `maxAge: 7 * 24 * 60 * 60 * 1000`

**`refresh(refreshToken)`**
1. `jwt.verify()` → 401 on failure
2. Check `refresh_denylist:<jti>` in Redis → 401 if found
3. `findUserById()`, check `isActive`
4. Check `passwordChangedAt > token.iat` → 401
5. Add old jti to denylist (`EX = payload.exp - now`)
6. Return `issueTokens(user)`

**`logout(jti, exp)`**
- Add `refresh_denylist:<jti>` to Redis with remaining TTL

**`resendVerification(email, ip)`**
- Rate limit: `resend_email:<email>` ≤ 3/h, `resend_ip:<ip>` ≤ 10/h → 429
- If user exists and unverified: generate new UUID, store in Redis, send email
- Always return success (no enumeration)
- Increment Redis counters with `INCR` + `EXPIRE`

**`requestPasswordReset(email)`**
- If user exists and email verified: `pwd_reset:<uuid>` in Redis (1h), send email
- Always return success

**`resetPassword(token, newPassword)`**
- Look up `pwd_reset:<token>` → 401 if missing
- `bcrypt.hash()`, `updatePassword()` (sets `passwordChangedAt`)
- Delete Redis key

---

### 9. `src/middleware/error.middleware.ts` — MODIFY

Add `AppError` handling before the generic 500:
```ts
import { AppError } from "../shared/errors/AppError.js";

if (err instanceof AppError) {
  res.status(err.statusCode).json({ success: false, message: err.message, ...(err.meta ?? {}) });
  return;
}
// existing 500 handler
```

---

### 10. `src/middleware/auth.middleware.ts` — NEW (was empty stub)

**`authenticate`** — verifies `access_token` cookie, attaches `req.user`. Returns 401 on missing/invalid/expired token.

**`optionalAuthenticate`** — same but silently continues if token is absent or invalid.

Does NOT check the Redis denylist (access tokens are 15m — short enough to not warrant denylist overhead).

---

### 11. `src/middleware/rabc.middleware.ts` — NEW (was empty stub)

```ts
export const requireRole = (...allowedRoles: UserRole[]) =>
  (req, res, next) => {
    if (!req.user) → 401
    if (!allowedRoles.includes(req.user.role)) → 403
    next()
  }
```

Usage: `router.get("/admin", authenticate, requireRole("admin"), handler)`

---

### 12. `src/modules/auth/auth.controller.ts` — NEW

HTTP layer only. Each handler: validate with Zod `safeParse()` → 400 on failure, call service, set cookies, respond.

**Cookie-setting routes** (login success, mfa/verify, refresh):
```ts
res
  .cookie("access_token", accessToken, authService.buildCookieOptions("access"))
  .cookie("refresh_token", refreshToken, authService.buildCookieOptions("refresh"))
```

**`logoutHandler`** — best-effort auth (per user decision):
- Try to read and decode `refresh_token` cookie (no verify needed, just decode for jti/exp)
- If jti and exp present → call `authService.logout(jti, exp)`
- Always clear both cookies regardless of token validity
- No auth middleware gate on this route

**Enumeration-safe responses** (resend, request-password-reset): always return 200 with a generic message.

**`registerHandler`** → 201
**`verifyEmailHandler`** → reads `token` from `req.query` → 200
**`loginHandler`** → 202 (MFA) or 200 (full login)
**`resetPasswordHandler`** → 200 + clears both cookies

---

### 13. `src/modules/auth/auth.router.ts` — NEW

```ts
// Public
router.post("/auth/register", registerHandler)
router.get("/auth/verify-email", verifyEmailHandler)
router.post("/auth/login", loginHandler)
router.post("/auth/mfa/verify", verifyMfaHandler)
router.post("/auth/refresh", refreshHandler)
router.post("/auth/resend-verification", resendVerificationHandler)
router.post("/auth/request-password-reset", requestPasswordResetHandler)
router.post("/auth/reset-password", resetPasswordHandler)

// Best-effort auth (no authenticate middleware — see logout design)
router.post("/auth/logout", logoutHandler)
```

---

### 14. `src/modules/auth/index.ts` — NEW

```ts
export { default as authRouter } from "./auth.router.js";
export type { SafeUser, JwtAccessPayload, JwtRefreshPayload } from "./auth.types.js";
```

---

### 15. `src/app.ts` — MODIFY

Add two lines:
```ts
import { authRouter } from "./modules/auth";
// ...
app.use("/api", authRouter);   // before notFoundRouteMiddleware
```

---

## Files Summary

| File | Action |
|---|---|
| `src/shared/errors/AppError.ts` | Create |
| `src/config/env.ts` | Implement (was stub) |
| `src/config/redis.ts` | Implement (was stub) |
| `src/modules/auth/auth.schema.ts` | Create |
| `src/modules/auth/auth.types.ts` | Create |
| `src/modules/auth/auth.repository.ts` | Create |
| `src/modules/auth/auth.service.ts` | Create |
| `src/modules/auth/auth.controller.ts` | Create |
| `src/modules/auth/auth.router.ts` | Create |
| `src/modules/auth/index.ts` | Create |
| `src/middleware/auth.middleware.ts` | Implement (was stub) |
| `src/middleware/rabc.middleware.ts` | Implement (was stub) |
| `src/middleware/error.middleware.ts` | Modify (add AppError handling) |
| `src/db/index.ts` | Modify (add userMfa export) |
| `src/app.ts` | Modify (mount authRouter) |

---

## Verification

```bash
# 1. Start the server
npm run dev

# 2. Health check still works
curl http://localhost:5000/api/health

# 3. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Jane","lastName":"Doe"}'

# 4. Login (before email verified → should return 403)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 5. After verifying email via the link in the email:
# Login → should return access_token + refresh_token cookies

# 6. Logout
curl -X POST http://localhost:5000/api/auth/logout --cookie "..."

# 7. Confirm refresh token is on denylist → refresh after logout returns 401
```
