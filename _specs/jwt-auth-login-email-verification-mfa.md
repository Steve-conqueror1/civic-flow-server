# Spec: JWT Auth Login Email Verification MFA

## Overview

CivicFlow serves citizens and government employees who require secure, role-differentiated access to sensitive public services. This feature establishes the foundational authentication layer: secure JWT issuance, role-aware login, email ownership verification, progressive account lockout after failed attempts, and opt-in TOTP-based MFA. Without it, no other protected endpoint can function safely.

## Functional Requirements

- Users can register with email and password; their account starts unverified.
- A verification email is sent on registration containing a time-limited token.
- Login is blocked for unverified accounts until the email is confirmed.
- Successful login issues a short-lived JWT access token (HTTP-only cookie) and a refresh token.
- The JWT payload includes `userId`, `role`, and `departmentId` so downstream RBAC middleware can gate access without a DB lookup on every request.
- After 5 consecutive failed login attempts, `accountLockedUntil` is set to 15 minutes in the future; login is rejected until the lock expires.
- `failedLoginAttempts` resets to 0 on a successful login.
- If `mfaEnabled` is `true` on the user record, login returns a partial challenge response instead of a full JWT; the client must submit a valid TOTP code to complete authentication.
- A `/refresh` endpoint exchanges a valid refresh token for a new access token.
- A `/logout` endpoint clears the cookies.

## Proposed API Changes

### Endpoints

| Method | Path                            | Auth/RBAC                        | Description                                 |
| ------ | ------------------------------- | -------------------------------- | ------------------------------------------- |
| POST   | `/api/auth/register`            | Public                           | Create account, send verification email     |
| GET    | `/api/auth/verify-email`        | Public (token in query)          | Confirm email ownership                     |
| POST   | `/api/auth/login`               | Public                           | Authenticate, issue tokens or MFA challenge |
| POST   | `/api/auth/mfa/verify`          | Public (challenge token in body) | Complete MFA step                           |
| POST   | `/api/auth/refresh`             | Public (refresh cookie)          | Rotate access token                         |
| POST   | `/api/auth/logout`              | Authenticated                    | Clear auth cookies                          |
| POST   | `/api/auth/resend-verification` | Public                           | Re-send verification email                  |

### Schema Requirements

**Existing `users` table fields consumed (no schema changes needed):**

- `id`, `email`, `passwordHash` — core identity
- `role` — embedded in JWT payload for RBAC
- `departmentId` — embedded in JWT payload
- `isActive` — gate for login (inactive users rejected)
- `isEmailVerified` — gate for login
- `mfaEnabled` — triggers MFA challenge branch
- `failedLoginAttempts` — lockout counter
- `accountLockedUntil` — lockout expiry
- `lastLoginAt`, `lastLoginIp` — audit fields updated on success
- `passwordChangedAt` — used to invalidate tokens issued before a password change

**Zod validation schemas (to be defined in `auth.schema.ts`):**

```ts
RegisterBody: {
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().optional(),
}

LoginBody: {
  email: z.string().email(),
  password: z.string().min(1),
}

MfaVerifyBody: {
  challengeToken: z.string().uuid(),
  totpCode: z.string().length(6),
}

ResendVerificationBody: {
  email: z.string().email(),
}
```

**Token storage strategy:**

- Email verification tokens and MFA challenge tokens are short-lived opaque UUIDs stored in a Redis key (`email_verify:<token>`, `mfa_challenge:<token>`) with TTLs. No new DB table is required for the initial implementation — if Redis is not yet available, fall back to signed JWTs with short expiry as an interim measure and note it as a known gap.
- Refresh tokens: stored as a signed JWT in an HTTP-only, `SameSite=Strict` cookie named `refresh_token`. Stateless for now; revocation support is an open question (see below).

## Logic Flow

### Registration (`POST /api/auth/register`)

1. **Controller**: Validate body with `RegisterBody` schema. Pass validated data to `AuthService.register()`.
2. **Service**:
   - Check no existing user with that email (call `AuthRepository.findByEmail()`).
   - Hash password with `bcryptjs` (cost factor 12).
   - Call `AuthRepository.createUser()`.
   - Generate a UUID verification token, store in Redis with 24 h TTL (key: `email_verify:<token>`, value: `userId`).
   - Dispatch verification email (stub for now — log to console or call a placeholder `EmailService.sendVerification()`).
3. **Repository**: `INSERT INTO users ...`, return the new user record minus `passwordHash`.

### Email Verification (`GET /api/auth/verify-email?token=<uuid>`)

1. **Controller**: Read `token` from query string. Call `AuthService.verifyEmail(token)`.
2. **Service**:
   - Look up `email_verify:<token>` in Redis. If missing or expired, throw `401 Invalid or expired token`.
   - Call `AuthRepository.setEmailVerified(userId)` to set `isEmailVerified = true`.
   - Delete the Redis key.
3. **Repository**: `UPDATE users SET is_email_verified = true WHERE id = $1`.

### Login (`POST /api/auth/login`)

1. **Controller**: Validate body with `LoginBody`. Pass to `AuthService.login(email, password, ip)`.
2. **Service**:
   - `AuthRepository.findByEmail(email)`. If not found, throw `401` (generic message to prevent user enumeration).
   - Check `isActive`. If false, throw `403 Account disabled`.
   - Check `accountLockedUntil`. If in the future, throw `423 Account locked` with `retryAfter`.
   - Compare password with `bcryptjs.compare()`. On failure:
     - Increment `failedLoginAttempts`.
     - If `failedLoginAttempts >= 5`, set `accountLockedUntil = now + 15 min`.
     - `AuthRepository.updateLoginFailure(userId, attempts, lockedUntil)`.
     - Throw `401 Invalid credentials`.
   - On success:
     - Check `isEmailVerified`. If false, throw `403 Email not verified`.
     - Reset `failedLoginAttempts = 0`, update `lastLoginAt`, `lastLoginIp`.
     - `AuthRepository.updateLoginSuccess(userId, ip)`.
     - If `mfaEnabled`: generate MFA challenge UUID, store in Redis (`mfa_challenge:<uuid>` → `userId`, TTL 5 min). Return `{ mfaRequired: true, challengeToken }` with `HTTP 202`.
     - Else: issue access token and refresh token. Return user profile.
3. **Repository**: Targeted updates (separate calls for failure and success paths to minimise data exposure).

### MFA Verify (`POST /api/auth/mfa/verify`)

1. **Controller**: Validate `MfaVerifyBody`. Call `AuthService.verifyMfa(challengeToken, totpCode)`.
2. **Service**:
   - Look up `mfa_challenge:<challengeToken>` in Redis. If absent, throw `401`.
   - `AuthRepository.findById(userId)`. Retrieve the TOTP secret (stored field TBD — see Open Questions).
   - Validate `totpCode` against the secret using a TOTP library (e.g., `otplib`).
   - On failure, throw `401 Invalid MFA code`.
   - On success, delete Redis key, issue access + refresh tokens.
3. **Repository**: `SELECT` by `id` to fetch TOTP secret.

### Token Issuance (shared utility in `auth.service.ts`)

```
accessToken = jwt.sign({ sub: userId, role, departmentId }, JWT_SECRET, { expiresIn: '15m' })
refreshToken = jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
```

Set `access_token` as HTTP-only cookie (`maxAge: 15 min`).
Set `refresh_token` as HTTP-only cookie (`maxAge: 7 days`).

### Refresh (`POST /api/auth/refresh`)

1. **Controller**: Read `refresh_token` cookie. Call `AuthService.refresh(token)`.
2. **Service**:
   - Verify and decode `refreshToken` using `jwt.verify()`.
   - `AuthRepository.findById(userId)`. Check `isActive` and that `passwordChangedAt` is before token `iat`. If not, throw `401`.
   - Issue new access token. Optionally rotate refresh token.
3. **Repository**: Fetch user by `id`.

### Logout (`POST /api/auth/logout`)

1. **Controller**: Clear both cookies by setting `maxAge: 0`. Return `200 OK`.
2. No service or repository call needed for stateless JWT approach.

## Security & Privacy

- **PII**: `email`, `firstName`, `lastName`, `phoneNumber`, `lastLoginIp` are PII. Never log raw values. Return only the minimum necessary fields in API responses (never return `passwordHash`).
- **User enumeration**: Registration and login errors must use generic messages. Do not distinguish between "user not found" and "wrong password" in the HTTP response.
- **Timing attacks**: Always run `bcryptjs.compare()` even when the user is not found (compare against a static dummy hash) to prevent timing-based enumeration.
- **Token leakage**: Access and refresh tokens stored exclusively in HTTP-only cookies — never in response body JSON for client-side storage.
- **IDOR**: Auth endpoints operate on the currently authenticated user (`req.user.id` from JWT) or on unauthenticated flows where the token itself is the credential. No endpoint accepts an arbitrary `userId` from the request body.
- **Lockout bypass**: The lockout check happens before password comparison so it cannot be bypassed by supplying the correct password during a lock window.
- **MFA challenge token**: Single-use; deleted from Redis immediately after successful verification.

## Acceptance Criteria

- [ ] `POST /api/auth/register` creates a user with `isEmailVerified: false` and sends a verification token.
- [ ] `GET /api/auth/verify-email?token=<valid>` sets `isEmailVerified: true` and returns `200`.
- [ ] `GET /api/auth/verify-email?token=<expired>` returns `401`.
- [ ] `POST /api/auth/login` with unverified email returns `403`.
- [ ] `POST /api/auth/login` with correct credentials returns access + refresh cookies and user profile.
- [ ] `POST /api/auth/login` with wrong password 5 times returns `423` on the 6th attempt.
- [ ] Lock expires after 15 minutes; login succeeds with correct credentials afterward.
- [ ] `POST /api/auth/login` for MFA-enabled user returns `202` with `challengeToken` and no JWT cookies.
- [ ] `POST /api/auth/mfa/verify` with valid TOTP code issues JWT cookies.
- [ ] `POST /api/auth/refresh` with a valid refresh cookie returns a new access token.
- [ ] `POST /api/auth/refresh` after password change returns `401`.
- [ ] `POST /api/auth/logout` clears both cookies.
- [ ] `passwordHash` is never present in any API response
      email reset.
- [ ] `POST /api/auth/request-password-reset`.
- [ ] `POST /api/auth/reset-password`

## Open Questions

- **TOTP secret storage**: Where is the per-user TOTP secret stored? The `users` table has no `mfaSecret` field. Options: (a) add a `mfa_secret` column (requires schema change — currently restricted), (b) store encrypted in a separate `user_mfa` table, (c) store in Redis with no expiry. Needs decision before MFA verify is implemented. user_mfa table
- **Refresh token revocation**: Current stateless approach cannot revoke individual refresh tokens on logout. Should a token denylist be maintained in Redis? Yes, maintain Redis denylist
- **Email sending**: No email provider is integrated yet. Is a stub/log acceptable for the first iteration, or should SendGrid / SES be wired up as part of this feature? just use gmail smpt for now, detail in .env file
- **TOTP library**: `otplib` is not yet in `package.json`. Confirm the preferred library before implementation. yes, use otplib.
- **Resend rate limiting**: How many times can `/api/auth/resend-verification` be called per email per hour? 3 per email per hour, 10 per IP per hour.

## Testing Plan

Scenarios for `civicflow-api-test-generator`:

- **Happy path — registration → verify → login → refresh → logout**
- **Registration with duplicate email** → `409`
- **Login before email verification** → `403`
- **Login with wrong password (1–4 times)** → `401`, counter increments
- **Login with wrong password (5th time)** → `423`, `accountLockedUntil` set
- **Login during lockout window** → `423`
- **Login after lockout expires** → `200`
- **MFA login flow** — login returns `202`, verify with valid code → `200`
- **MFA verify with expired challenge token** → `401`
- **Refresh with valid cookie** → new access token, `200`
- **Refresh after password change** → `401`
- **Logout clears cookies** — subsequent request with cleared cookies is `401`
- **Expired verification token** → `401`
- **Resend verification** → new token issued, old token invalidated
