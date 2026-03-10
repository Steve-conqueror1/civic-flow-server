# Spec for Contact Enquiries

branch: claude/api-feat/contact-enquiries

## Summary

Add a contact enquiries module that allows citizens to submit general enquiries via a public API endpoint. Submissions are protected by Cloudflare Turnstile verification and rate limiting. On successful submission, an email notification is sent to the submitter. Admins can view and update the status of enquiries.

## Functional Requirements

- **Public endpoint** `POST /api/contact` accepts enquiry submissions (name, email, subject, message, Turnstile token).
- **Turnstile verification**: Before persisting any data, validate the Turnstile token against Cloudflare's siteverify API. Reject the request if verification fails.
- **Rate limiting**: Apply per-IP rate limiting to the public submission endpoint to prevent abuse (e.g. max 5 submissions per 15 minutes per IP).
- **Persistence**: Save validated enquiries to a `contact_enquiries` database table with a status field (default `open`).
- **Email notification**: After saving, send a confirmation email to the submitter acknowledging receipt of their enquiry.
- **Admin status update endpoint** `PATCH /api/v1/admin/contact/:id/status` allows admins and super admins to update the status of an enquiry (e.g. `open`, `in_progress`, `resolved`, `closed`).
- Admin endpoints require `authenticate` + `requireRole("admin", "super_admin")` middleware.
- The public endpoint requires no authentication.

## Possible Edge Cases

- Turnstile token is missing, expired, or invalid — return 400/422 before touching the database.
- Duplicate or replayed Turnstile tokens — Cloudflare's API handles this; treat a failed verification as invalid.
- Rate limit exceeded — return 429 with a clear retry-after message.
- Email delivery failure — log the error but still return a 201 success to the user so the enquiry is not lost.
- Invalid status value in admin PATCH — return 400 with validation errors.
- Enquiry ID does not exist — return 404.
- Submitter provides an invalid email format — return 400 before attempting Turnstile verification.

## Acceptance Criteria

- `POST /api/contact` with a valid payload and valid Turnstile token saves the enquiry and returns 201 with a success message.
- `POST /api/contact` with an invalid/missing Turnstile token returns a non-2xx error and does not save the enquiry.
- `POST /api/contact` exceeding the rate limit returns 429.
- A confirmation email is sent to the submitter's email address after a successful submission.
- `PATCH /api/v1/admin/contact/:id/status` updates the enquiry status and returns 200 with the updated record.
- `PATCH /api/v1/admin/contact/:id/status` called by an unauthenticated or non-admin user returns 401/403.
- `PATCH /api/v1/admin/contact/:id/status` with an unknown ID returns 404.
- All enquiry fields are validated with Zod; invalid input returns 400 with field-level errors.

## Open Questions

- Should admins be able to list/search all enquiries, or is the status-update endpoint the only admin interaction needed for this phase? yes, list for admins
- What statuses are valid for enquiries — reuse the `service_requests` status enum or define a simpler dedicated enum (`open`, `in_progress`, `resolved`, `closed`)? use contactMessageStatusEnum
- Should the confirmation email include a reference/tracking number? no for now
- Which Turnstile site key and secret should be used — is there an existing Cloudflare account, or does one need to be set up? there is one, secrets in .env file
- Should `TURNSTILE_SECRET` be added to the env validation in `src/config/env.ts`? yes
- Is there a desired daily/hourly cap beyond the per-IP rate limit (e.g. global submission cap)? no

## Testing Guidelines

Create a test file in the `./tests` folder for the contact module. Cover the following cases without going too heavy:

- Successful submission with valid payload and mocked Turnstile verification returns 201 and creates a DB record.
- Submission with invalid Turnstile token returns an error and does not create a DB record.
- Submission with missing required fields returns 400 with field-level validation errors.
- Rate limit enforcement — after exceeding the allowed number of requests, subsequent requests return 429.
- Admin PATCH updates the status of an existing enquiry and returns the updated record.
- Admin PATCH with invalid status value returns 400.
- Admin PATCH with a non-existent enquiry ID returns 404.
- Admin PATCH by an unauthenticated user returns 401.
