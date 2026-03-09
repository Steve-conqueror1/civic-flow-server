# Service Requests API — Implementation Plan

## Context

The `serviceRequests` module has only a schema file; no router, controller, service, or repository exists yet. The schema is complete and must not be modified. This plan implements the full private REST API for service requests with RBAC, S3 file upload (pre-signed GET URLs), email notifications on status change, and a citizen cancel flow.

---

## Step 1 — Install AWS SDK packages

```
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

`multer` v2 is already installed. No extra `@types/` needed for the AWS packages.

---

## Step 2 — Add AWS env vars

**File:** `src/config/env.ts`

Add four required fields to the Zod `envSchema` object:

```ts
AWS_REGION: z.string().min(1),
AWS_ACCESS_KEY_ID: z.string().min(1),
AWS_SECRET_ACCESS_KEY: z.string().min(1),
AWS_S3_BUCKET: z.string().min(1),
```

---

## Step 3 — S3 client config

**New file:** `src/config/s3.config.ts`

Create and export a singleton `S3Client` (lazy, no startup network call):

```ts
export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
```

Do NOT re-export from `src/config/index.ts` — import directly where needed.

---

## Step 4 — Zod schemas

**New file:** `src/zodschemas/serviceRequests.ts`

Follow the structure of `src/zodschemas/services.ts`.

**Body schemas:**

- `CreateRequestSchema` — `{ serviceId (uuid), title (1-255), description, location? { address?, lat?, lng? }, attachments? (url[], max 4) }`
- `UpdateRequestStatusSchema` — `{ status (enum: all 7 values from schema), note? }`
- `CancelRequestSchema` — `{ note? }`

**Query schemas:**

- `CitizenRequestQuerySchema` — `{ status? (enum), page (coerce, default 1), limit (coerce, default 10, max 100) }`
- `AdminRequestQuerySchema` — same plus `{ serviceId? (uuid), departmentId? (uuid), userId? (uuid) }`

**Exported types:** infer all 5 schemas with `z.infer<typeof ...>`.

Status enum values (exact match with `requests.schema.ts`): `open | in_progress | under_review | pending_review | resolved | rejected | closed`

---

## Step 5 — Repository

**New file:** `src/modules/serviceRequests/requests.repository.ts`

Reference: `src/modules/services/service.repository.ts` for the count+rows parallel pattern.

**Type:** `export type RequestRow = InferSelectModel<typeof serviceRequests>`

**Finders:**

- `findById(id)` — simple select by PK
- `findAllForUser({ userId, status?, page, limit })` — filter by userId + optional status; return `{ rows, total }` using `Promise.all([rowsQuery, countQuery])`
- `findAll({ status?, serviceId?, departmentId?, userId?, page, limit })` — admin query; when `departmentId` is present, inner-join with `services` table (`eq(serviceRequests.serviceId, services.id)`) and add `eq(services.departmentId, departmentId)` to the where clause. Return `{ rows, total }`.
- `findUserById(id)` — select `{ email, firstName, lastName }` from `users` table; used for email notification

**Mutations:**

- `create(data)` — insert and return row; set `status: "open"` as default
- `updateStatus(id, { status, note?, resolvedAt? })` — update and return row
- `cancel(id, note?)` — set `status: "closed"`, update note, return row
- `serviceExists(serviceId)` — boolean check before insert to produce clean 404

**JSONB note:** Pass `attachments` array directly — Drizzle handles serialization. Do NOT `JSON.stringify()` manually.

---

## Step 6 — Service layer

**New file:** `src/modules/serviceRequests/requests.service.ts`

**S3 upload function:** `uploadFilesToS3(files: Express.Multer.File[]): Promise<string[]>`

1. Guard: `files.length > 4` → `AppError(400, ...)`
2. For each file: `PutObjectCommand` to upload buffer, then `getSignedUrl` with `GetObjectCommand` (expires 7 days / 604800s)
3. Return array of pre-signed GET URLs
4. If S3 send throws, let the error propagate (controller catches → 500)

**Business functions:**

`createRequest(userId, data: CreateRequestBody)`

1. `serviceExists(data.serviceId)` → `AppError(404)` if false
2. `repo.create({ userId, ...data })` → return row

`getRequestById(requestId, callerId, callerRole)`

1. `findById` → `AppError(404)` if missing
2. If `callerRole === "citizen"` and `row.userId !== callerId` → `AppError(403, "Access denied.")`
3. Return row

`listRequestsForUser(userId, query: CitizenRequestQuery)` → calls `findAllForUser`, returns `{ requests, pagination }`

`listAllRequests(query: AdminRequestQuery)` → calls `findAll`, returns `{ requests, pagination }`

`updateRequestStatus(requestId, data: UpdateRequestStatusBody)`

1. `findById` → `AppError(404)` if missing
2. Set `resolvedAt = new Date()` if `status === "resolved"`, else `undefined`
3. `repo.updateStatus(...)` → get updated row
4. `findUserById(row.userId)` → fire-and-forget email: `sendEmail(...).catch(console.error)`
5. Return updated row

`cancelRequest(requestId, userId, note?)`

1. `findById` → `AppError(404)` if missing
2. `row.userId !== userId` → `AppError(403)`
3. `row.status` is `closed | resolved | rejected` → `AppError(409, "Request cannot be cancelled in its current status.")`
4. `repo.cancel(requestId, note)` → return row

**Email utility:** `src/utils/email.ts` — `sendEmail(to, subject, html)` already exists. Import and use directly.

---

## Step 7 — Controller

**New file:** `src/modules/serviceRequests/requests.controller.ts`

Follow the exact pattern of `src/modules/services/service.controller.ts`:

- All handlers wrapped in `try/catch`, pass errors to `next(err)`
- `.safeParse()` for body and query; on failure: `res.status(400).json({ success: false, message: "Validation failed", errors: parsed.error.flatten().fieldErrors })`
- Success: `res.status(2xx).json({ success: true, message: "...", data: { ... } })`

**Handlers:**

- `uploadAttachmentsHandler` — guard empty `req.files`, call `service.uploadFilesToS3`, return 200 `{ urls }`
- `createRequestHandler` — parse body, use `req.user!.sub` as userId, call service, return 201
- `listRequestsHandler` — branch by `req.user!.role`: citizen → `CitizenRequestQuerySchema` + `listRequestsForUser`; admin/super_admin → `AdminRequestQuerySchema` + `listAllRequests`
- `getRequestHandler` — call `getRequestById(req.params.id, req.user!.sub, req.user!.role)`, return 200
- `updateRequestStatusHandler` — parse body, call `updateRequestStatus`, return 200
- `cancelRequestHandler` — parse body, call `cancelRequest`, return 200

---

## Step 8 — Router

**New file:** `src/modules/serviceRequests/requests.router.ts`

Define multer in the router file (not a separate middleware file):

```ts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

**Route order (static before parameterized):**

```
POST   /upload            authenticate, upload.array("files", 4), uploadAttachmentsHandler
POST   /                  authenticate, createRequestHandler
GET    /                  authenticate, listRequestsHandler
GET    /:id               authenticate, getRequestHandler
PATCH  /:id/cancel        authenticate, cancelRequestHandler
PATCH  /:id/status        authenticate, requireRole("admin","super_admin"), updateRequestStatusHandler
```

---

## Step 9 — Module index + app.ts wiring

**New file:** `src/modules/serviceRequests/index.ts`

```ts
export { default as serviceRequestsRouter } from "./requests.router";
export { serviceRequests, requestStatusEnum } from "./requests.schema";
```

**Modify:** `src/app.ts`

- Import: `import { serviceRequestsRouter } from "./modules/serviceRequests";`
- Mount (after servicesRouter, before notFoundRouteMiddleware): `app.use("/api/v1/service-requests", serviceRequestsRouter);`

`src/db/index.ts` already exports `serviceRequests` and `requestStatusEnum` — no change needed.

---

## Step 10 — Tests

**New file:** `src/tests/serviceRequests.test.ts`

Reference: `src/tests/services.test.ts` for mock block structure, token helper, and test patterns.

Mock block (before imports):

```ts
vi.mock("../config/env", ...)
vi.mock("../config/redis", ...)
vi.mock("../config/db.config", ...)
vi.mock("../config/s3.config", () => ({ s3Client: {} }))
vi.mock("../modules/serviceRequests/requests.service")
```

Token helper: `signToken(role, userId = "user-123")` using `jwt.sign`.

Test suites:

- `POST /upload` — 401 unauth, 400 no files, 200 returns URLs (mock `uploadFilesToS3`)
- `POST /` — 401, 400 invalid body, 201 success
- `GET /` — 401, 200 citizen sees own list, 200 admin sees all (separate mock functions)
- `GET /:id` — 200 owner, 403 citizen accessing other's request, 404 not found
- `PATCH /:id/cancel` — 200 success, 403 wrong user, 409 already closed
- `PATCH /:id/status` — 401, 403 citizen role, 400 invalid status, 200 admin success

Attach files in upload test: `.attach("files", Buffer.from("test"), "test.jpg")`.

---

## Soft Delete Note

The spec requested soft delete, but the schema has no `deletedAt` column and schema modification is forbidden (CLAUDE.md). **No delete endpoint will be implemented.** Citizens use `PATCH /:id/cancel` (sets `status: "closed"`). A future migration can add `deletedAt` if needed.

---

## Critical Files

| File                                                 | Action             |
| ---------------------------------------------------- | ------------------ |
| `src/config/env.ts`                                  | Add 4 AWS env vars |
| `src/config/s3.config.ts`                            | Create S3 client   |
| `src/zodschemas/serviceRequests.ts`                  | Create schemas     |
| `src/modules/serviceRequests/requests.repository.ts` | Create             |
| `src/modules/serviceRequests/requests.service.ts`    | Create             |
| `src/modules/serviceRequests/requests.controller.ts` | Create             |
| `src/modules/serviceRequests/requests.router.ts`     | Create             |
| `src/modules/serviceRequests/index.ts`               | Create             |
| `src/app.ts`                                         | Mount router       |
| `src/tests/serviceRequests.test.ts`                  | Create             |

## Verification

1. Run `npm run dev` — confirm server starts without env validation errors (after adding AWS vars to `.env`)
2. Use Postman/curl to test `POST /api/v1/service-requests/upload` with a real S3 bucket
3. Create a request with returned URLs, verify `attachments` persisted in DB
4. Test `PATCH /:id/status` as admin — confirm email fires and status updates
5. Test `GET /` with citizen token — confirm only own requests returned
6. Test `GET /:id` with a different citizen's token — confirm 403
7. Run `npm run test` — all test suites should pass
