# Spec for Service Requests API

branch: claude/api-feat/service-requests-api

## Summary

Implement a private REST API for service requests with role-based access control. Citizens can only view their own requests, while admins have full read and status-management access. A separate file upload flow allows users to upload attachments to AWS S3 before submitting a new request, receiving back public file URLs to include in the request payload.

## Functional Requirements

- All service request endpoints require authentication (no public access).
- A citizen (`citizen` role) can:
  - Submit a new service request, including an optional list of attachment URLs returned from the upload endpoint.
  - Retrieve a list of their own service requests (scoped to their user ID) with optional filtering by status
  - Retrieve a single service request by ID, only if it belongs to them.
- An admin (`admin` or `super_admin` role) can:
  - Retrieve all service requests across all users, with optional filtering by status, service, department, or user.
  - Retrieve any single service request by ID.
  - Update the status of any service request (valid statuses: `open`, `in_progress`, `under_review`, `pending_review`, `resolved`, `rejected`, `closed`).
- A separate file upload endpoint accepts one or more files, uploads them to an AWS S3 bucket, and returns their public URLs. This endpoint is available to any authenticated user.
- The upload endpoint must validate file type and file size before uploading to S3.
- Uploaded file URLs are stored as an array field on the service request record.

## Possible Edge Cases

- A citizen attempting to access another user's request must receive a `403 Forbidden`, not a `404`.
- Uploading an unsupported file type or a file that exceeds the size limit must return a clear `400` error before any S3 call is made.
- If the S3 upload fails for one or more files, the endpoint must return an error and not return partial URLs.
- Status transitions should be validated — only known enum values are accepted; unknown values return a `400`.
- A new service request referencing a non-existent `serviceId` must return a `404`.
- Admin list queries should support pagination to avoid unbounded result sets.

## Acceptance Criteria

- `POST /api/v1/service-requests/upload` — authenticated users can upload files; returns an array of S3 URLs.
- `POST /api/v1/service-requests` — authenticated citizens can create a request; `attachments` field accepts an array of URLs.
- `GET /api/v1/service-requests` — citizens receive only their own requests; admins receive all requests.
- `GET /api/v1/service-requests/:id` — citizens can only fetch their own request; admins can fetch any.
- `PATCH /api/v1/service-requests/:id/status` — admins only; updates the status field with a valid enum value.
- Unauthorized or forbidden access returns the correct HTTP status codes (`401`, `403`).
- All list endpoints support pagination (`page` and `limit` query params).
- Admin list endpoint supports optional query filters: `status`, `serviceId`, `departmentId`, `userId`.

## Open Questions

- Should citizens be allowed to cancel (close) their own requests, or is status change admin-only? Yes, they should be able to cancel and add a note
- Is there a maximum number of attachments allowed per request? 4
- Should S3 files be uploaded to a public bucket or returned as pre-signed URLs? (Spec assumes public URLs for now.) pre-signed-URLs
- Should a soft-delete pattern be used for requests, or are they permanent records? soft delete
- Are there notification requirements (email/push) when a request status changes? email notification

## Testing Guidelines

Create a test file(s) in the `./tests` folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- A citizen can create a service request and retrieve it.
- A citizen cannot retrieve another user's request (expect `403`).
- An admin can retrieve any service request.
- An admin can update the status of a request to a valid enum value.
- An invalid status value on `PATCH` returns `400`.
- The upload endpoint rejects files with disallowed MIME types.
- The upload endpoint rejects files that exceed the size limit.
- Unauthenticated requests to all endpoints return `401`.
