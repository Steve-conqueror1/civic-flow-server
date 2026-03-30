# Plan: User Request AI Analysis

## Context

Citizens need help choosing the right category and service before submitting a request. This feature adds a stateless `POST /api/v1/ai/analyse-request` endpoint that accepts a request title, description, and optional note, then uses the OpenAI API (already wired up in the codebase) to return a best-match category and service, a short bullet-point summary, confidence percentage, and a single contextual alert (duplicate, ambiguous, out_of_scope, or info). It is a pre-submission helper only — nothing is persisted.

---

## Response Shape

```json
{
  "success": true,
  "message": "Request analysis complete.",
  "data": {
    "category": { "id": "uuid-or-other", "name": "Category Name", "matchPercentage": 85 },
    "service": { "id": "uuid", "name": "Service Name", "categoryId": "uuid" } | null,
    "summary": ["User reporting a large pothole on 104th Ave.", "Issue causing traffic slowdowns during rush hour", "Potential tire damage hazard identified"],
    "alert": { "type": "duplicate", title:"Duplicate Alert", "message": "You already have a similar open request." } | null
  }
}
```

- `alert` is a **single object or null** (not an array).
- If `matchPercentage < 30`, return `category: { id: "other", name: "Other", matchPercentage: <value> }` and `service: null`.
- `summary` has at most 3 items.

---

## Files to Create

### `src/ai/aiClient.ts`

Export a shared OpenAI client using `@ai-sdk/openai` (already in package.json):

- Use `createOpenAI({ apiKey: env.OPENAI_API_KEY })` from `@ai-sdk/openai`.

### `src/ai/ai.types.ts`

Define TypeScript types:

- `AnalysisCategory` — `{ id: string; name: string; matchPercentage: number }`
- `AnalysisService` — `{ id: string; name: string; categoryId: string }`
- `AnalysisAlert` — `{ type: "duplicate" | "ambiguous" | "out_of_scope" | "info"; message: string }`
- `AnalysisResult` — full response shape with category, service | null, summary string[], alert | null

### `src/ai/promptTemplate.ts`

Export `buildAnalysisPrompt(input)` that constructs the prompt string.

- Input: title, description, note, categories[], services[], recentUserRequests[]
- Prompt instructs the model to return **only valid JSON** matching the AnalysisResult shape.
- Include categories (id, name, description) and services (id, name, description, categoryId) in the prompt context.
- Include recent user requests (title, description) for duplicate detection.
- Threshold rule in prompt: if confidence < 30, set category to `{ id: "other", name: "Other" }` and service to null.

### `src/ai/classifier.service.ts`

Export `classifyRequest(prompt: string): Promise<AnalysisResult>`:

- Calls `generateText({ model: openai("gpt-4o-mini"), prompt })` — use `gpt-4o-mini` for structured JSON reliability.
- Wraps in try/catch; on OpenAI error throw `new AppError(503, "AI analysis service is currently unavailable.")`.
- Parses `text` response with `JSON.parse`.
- If parse fails, throw `new AppError(503, "AI returned an invalid response. Please try again.")`.

### `src/zodschemas/ai.ts` (extend existing)

The existing file only has `featuredCaseSchema`. Add:

```ts
export const AnalyseRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  note: z.string().optional(),
});
export type AnalyseRequestBody = z.infer<typeof AnalyseRequestSchema>;
```

### `src/modules/ai/ai.router.ts`

- `POST /` → `authenticate` → `analyseRequestHandler`
- Mounted in app.ts as `/api/v1/ai`.

### `src/modules/ai/ai.controller.ts`

- Validate body with `AnalyseRequestSchema.safeParse()`; return 400 on failure.
- Call `aiService.analyseRequest(userId, body)`.
- Return `200 { success: true, message: "Request analysis complete.", data: result }`.
- Wrap in try/catch, pass errors to `next(err)`.

### `src/modules/ai/ai.service.ts`

Orchestration logic:

1. `categoryRepository.findAllActive()` — fetch all active categories.
2. `serviceRepository.findAll({ page: 1, limit: 500 })` — fetch all active services (default filters inactive).
3. `requestRepository.findActiveForUser(userId)` — fetch user's open/in_progress requests (new method).
4. If no categories or services → return early with `out_of_scope` alert, no AI call.
5. Build prompt via `buildAnalysisPrompt(...)`.
6. Call `classifyRequest(prompt)`.
7. Return result.

### `src/modules/ai/index.ts`

```ts
export { default as aiRouter } from "./ai.router";
```

---

## Files to Modify

### `src/modules/serviceRequests/requests.repository.ts`

Add one new method:

```ts
findActiveForUser(userId: string, limit = 10): Promise<RequestRow[]>
```

Queries requests where `userId = userId` AND `status IN ('open', 'in_progress')`, ordered by `createdAt DESC`, limited to `limit`. Uses `inArray(serviceRequests.status, ['open', 'in_progress'])` from drizzle-orm.

### `src/app.ts`

Import `aiRouter` and mount:

```ts
import { aiRouter } from "./modules/ai";
app.use("/api/v1/ai", aiRouter);
```

Insert after existing route registrations, before the error handlers.

---

## Critical File Paths

| File                                                 | Role                                      |
| ---------------------------------------------------- | ----------------------------------------- |
| `src/ai/aiClient.ts`                                 | Shared OpenAI client                      |
| `src/ai/ai.types.ts`                                 | AnalysisResult TypeScript types           |
| `src/ai/promptTemplate.ts`                           | Prompt builder                            |
| `src/ai/classifier.service.ts`                       | OpenAI call + response parsing            |
| `src/zodschemas/ai.ts`                               | Input validation schema (extend existing) |
| `src/modules/ai/ai.router.ts`                        | Route definition                          |
| `src/modules/ai/ai.controller.ts`                    | HTTP layer                                |
| `src/modules/ai/ai.service.ts`                       | Orchestration                             |
| `src/modules/ai/index.ts`                            | Public exports                            |
| `src/modules/serviceRequests/requests.repository.ts` | Add `findActiveForUser()`                 |
| `src/app.ts`                                         | Mount `aiRouter`                          |

## Reusable Existing Utilities

| Utility                              | Location                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| `categoryRepository.findAllActive()` | `src/modules/serviceCategories/category.repository.ts`            |
| `serviceRepository.findAll()`        | `src/modules/services/service.repository.ts`                      |
| `requestRepository` (base instance)  | `src/modules/serviceRequests/requests.repository.ts`              |
| `AppError`                           | `src/shared/errors/AppError.ts`                                   |
| `authenticate` middleware            | `src/middleware/auth.middleware.ts`                               |
| `generateText` from "ai"             | already used in `src/modules/serviceRequests/requests.service.ts` |
| `env.OPENAI_API_KEY`                 | `src/config/env.ts` (already validated)                           |

---

## Verification

1. Run `npm run dev` and POST to `http://localhost:5002/api/v1/ai/analyse-request` with a valid cookie.
2. Confirm 401 without a cookie.
3. Confirm 400 when `title` or `description` is missing.
4. Confirm a well-formed request returns `{ category, service, summary, alert }`.
5. Submit a title+description identical to an existing open request → verify `alert.type === "duplicate"`.
6. Submit something very vague (e.g., `{ title: "x", description: "y" }`) → verify `alert.type === "out_of_scope"` or `"ambiguous"`.
