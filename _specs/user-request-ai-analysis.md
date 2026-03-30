# Spec for User Request AI Analysis

branch: claude/api-feat/user-request-ai-analysis

## Summary

A single POST endpoint that accepts a citizen's request title, description, and optional note, then uses the Claude AI API to analyse the content and return structured guidance: the best-matching category and service, a short bullet-point summary, confidence percentages for the matches, and any contextual alerts such as possible duplicates or ambiguous intent.

This feature brings the existing `src/ai/` stub files to life, starting with the classifier and summarizer services, and adds a new `ai` module that exposes the endpoint.

## Functional Requirements

- The endpoint is `POST /api/v1/ai/analyse-request` and requires the user to be authenticated (`authenticate` middleware).
- Request body fields:
  - `title` — required string, 1–255 characters
  - `description` — required string, minimum 1 character
  - `note` — optional string
- The AI layer fetches all active categories and services from the database before calling the Claude API, so the model can reason over real data rather than hallucinated names.
- The response payload must include:
  - `category` — object with `id`, `name`, and `matchPercentage` (0–100 integer)
  - `service` — object with `id`, `name`, `categoryId`
  - `summary` — array of up to 3 short plain-text strings (bullet points)
  - `alert` — object, each with a `type` (`"duplicate"` | `"ambiguous"` | `"out_of_scope"` | `"info"`) and a `message` string. null when no alert apply.
- Duplicate detection: query existing open/in-progress service requests for the authenticated user and include a `"duplicate"` alert if a semantically similar request is found.
- If no service can be matched with reasonable confidence (below an internal threshold), return `service: null` and include an `"out_of_scope"` alert.
- The endpoint must not persist anything to the database; it is a stateless analysis call.
- The existing `aiSummary` field on the `serviceRequests` table is out of scope for this feature — this endpoint is a pre-submission helper only.

## Possible Edge Cases

- All categories or services are inactive — return a graceful `out_of_scope` alert rather than an error.
- The Claude API is unavailable or times out — propagate as a 503 `AppError` with a user-friendly message.
- Input is too vague to match anything (e.g., a single word) — return low match percentages and an `ambiguous` alert.
- User has many historical requests — duplicate detection query should be limited to recent open/in-progress requests to avoid performance issues.

## Acceptance Criteria

- `POST /api/v1/ai/analyse-request` returns 200 with the full response shape described above when given valid input.
- Returns 400 when `title` or `description` is missing or fails validation.
- Returns 401 when the request is unauthenticated.
- `matchPercentage` values are integers between 0 and 100 inclusive.
- `summary` array contains no more than 3 items, each being a non-empty string.
- `alerts` is always an array (never null/undefined), even when empty.
- A `"duplicate"` alert is present when the authenticated user has an open or in-progress request with a closely matching title and description.
- A 503 is returned (not a 500) when the upstream Claude API call fails.

## Open Questions

- Should unauthenticated users (public/pre-login) be able to call this endpoint, or must they be authenticated? no, only authenticated users
- What confidence threshold should trigger an `out_of_scope` alert vs. returning a low-confidence match? if less than 30% results to category `other`
- Should duplicate detection be limited to the authenticated user's requests only, or should it check all users' requests (to catch already-handled system-wide duplicates)? only users' request for now.
- Is there a rate limit requirement for this endpoint to prevent abuse? not needed

## Testing Guidelines

Create a test file `tests/ai-analyse-request.test.ts` and cover the following cases without going too heavy:

- Happy path: valid title + description returns correct response shape with category, service, summary, and alerts fields.
- Missing `title` returns 400 with field errors.
- Missing `description` returns 400 with field errors.
- Unauthenticated request returns 401.
- Simulate Claude API failure and assert 503 is returned.
- When a matching open request already exists for the user, assert a `"duplicate"` alert is included in the response.
- When no active services exist, assert `service` is null and an `"out_of_scope"` alert is present.

**Important**

- Use open AI not Claude AI API.
- If no category matches, it should belong to `other`.
- Alert should be just one of any type.
