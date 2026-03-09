import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { AppError } from "../shared/errors/AppError";

const TEST_JWT_SECRET = "test-secret-that-is-at-least-32-chars-long!!";

// ---------------------------------------------------------------------------
// Mock env before anything else loads
// ---------------------------------------------------------------------------
vi.mock("../config/env", () => ({
  env: {
    PORT: "5002",
    NODE_ENV: "test",
    CLIENT_URL: "http://localhost:5173",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    JWT_SECRET: "test-secret-that-is-at-least-32-chars-long!!",
    JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars!!",
    SMTP_HOST: "smtp.test.com",
    SMTP_PORT: "465",
    SMTP_USER: "test",
    SMTP_PASS: "test",
    EMAIL_FROM: "test@test.com",
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS_KEY: "test-secret",
    AWS_S3_BUCKET: "test-bucket",
  },
}));

vi.mock("../config/redis", () => ({
  redisClient: {
    connect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock("../config/db.config", () => ({
  db: {},
}));

vi.mock("../config/s3.config", () => ({
  s3Client: {},
}));

vi.mock("../modules/serviceRequests/requests.service");

import app from "../app";
import * as requestService from "../modules/serviceRequests/requests.service";

const mockService = vi.mocked(requestService);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signToken(
  role: "citizen" | "admin" | "super_admin",
  userId = "user-123",
): string {
  return jwt.sign(
    { sub: userId, role, departmentId: null, jti: "jti-1" },
    TEST_JWT_SECRET,
    { expiresIn: "15m" },
  );
}

const citizenToken = signToken("citizen");
const adminToken = signToken("admin");
const otherCitizenToken = signToken("citizen", "user-456");

const sampleRequest = {
  id: "req-1",
  userId: "user-123",
  serviceId: "svc-1",
  title: "Pothole on Main Street",
  description: "Large pothole causing damage",
  note: null,
  status: "open" as const,
  location: null,
  attachments: null,
  assignedTo: null,
  priority: 0,
  aiSummary: null,
  submittedAt: new Date(),
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const paginatedResult = {
  requests: [sampleRequest],
  pagination: { page: 1, limit: 10, total: 1 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Service Requests API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---- Upload ----
  describe("POST /api/v1/service-requests/upload", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post("/api/v1/service-requests/upload")
        .attach("files", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(401);
    });

    it("returns 400 when no files sent", async () => {
      const res = await request(app)
        .post("/api/v1/service-requests/upload")
        .set("Cookie", `access_token=${citizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 200 with S3 keys on success", async () => {
      mockService.uploadFilesToS3.mockResolvedValue([
        "service-requests/abc123.jpg",
      ]);

      const res = await request(app)
        .post("/api/v1/service-requests/upload")
        .set("Cookie", `access_token=${citizenToken}`)
        .attach("files", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.urls).toHaveLength(1);
    });
  });

  // ---- Create ----
  describe("POST /api/v1/service-requests", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post("/api/v1/service-requests")
        .send({ title: "Test" });

      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid body", async () => {
      const res = await request(app)
        .post("/api/v1/service-requests")
        .set("Cookie", `access_token=${citizenToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 201 on successful creation", async () => {
      mockService.createRequest.mockResolvedValue(sampleRequest);

      const res = await request(app)
        .post("/api/v1/service-requests")
        .set("Cookie", `access_token=${citizenToken}`)
        .send({
          serviceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          title: "Pothole on Main Street",
          description: "Large pothole causing damage",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.request.title).toBe("Pothole on Main Street");
    });
  });

  // ---- List ----
  describe("GET /api/v1/service-requests", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/v1/service-requests");

      expect(res.status).toBe(401);
    });

    it("returns citizen's own requests", async () => {
      mockService.listRequestsForUser.mockResolvedValue(paginatedResult);

      const res = await request(app)
        .get("/api/v1/service-requests")
        .set("Cookie", `access_token=${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.requests).toHaveLength(1);
      expect(mockService.listRequestsForUser).toHaveBeenCalled();
    });

    it("returns all requests for admin", async () => {
      mockService.listAllRequests.mockResolvedValue(paginatedResult);

      const res = await request(app)
        .get("/api/v1/service-requests")
        .set("Cookie", `access_token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.requests).toHaveLength(1);
      expect(mockService.listAllRequests).toHaveBeenCalled();
    });
  });

  // ---- Get by ID ----
  describe("GET /api/v1/service-requests/:id", () => {
    it("returns 200 when owner accesses their request", async () => {
      mockService.getRequestById.mockResolvedValue(sampleRequest);

      const res = await request(app)
        .get("/api/v1/service-requests/req-1")
        .set("Cookie", `access_token=${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.request.id).toBe("req-1");
    });

    it("returns 403 when citizen accesses another user's request", async () => {
      mockService.getRequestById.mockRejectedValue(
        new AppError(403, "Access denied."),
      );

      const res = await request(app)
        .get("/api/v1/service-requests/req-1")
        .set("Cookie", `access_token=${otherCitizenToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent request", async () => {
      mockService.getRequestById.mockRejectedValue(
        new AppError(404, "Request not found."),
      );

      const res = await request(app)
        .get("/api/v1/service-requests/unknown")
        .set("Cookie", `access_token=${citizenToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ---- Cancel ----
  describe("PATCH /api/v1/service-requests/:id/cancel", () => {
    it("returns 200 when citizen cancels own request", async () => {
      mockService.cancelRequest.mockResolvedValue({
        ...sampleRequest,
        status: "closed",
      });

      const res = await request(app)
        .patch("/api/v1/service-requests/req-1/cancel")
        .set("Cookie", `access_token=${citizenToken}`)
        .send({ note: "Changed my mind" });

      expect(res.status).toBe(200);
      expect(res.body.data.request.status).toBe("closed");
    });

    it("returns 409 when request is already closed", async () => {
      mockService.cancelRequest.mockRejectedValue(
        new AppError(409, "Request cannot be cancelled in its current status."),
      );

      const res = await request(app)
        .patch("/api/v1/service-requests/req-1/cancel")
        .set("Cookie", `access_token=${citizenToken}`)
        .send({});

      expect(res.status).toBe(409);
    });
  });

  // ---- Update status (admin) ----
  describe("PATCH /api/v1/service-requests/:id/status", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .patch("/api/v1/service-requests/req-1/status")
        .send({ status: "in_progress" });

      expect(res.status).toBe(401);
    });

    it("returns 403 when citizen tries to update status", async () => {
      const res = await request(app)
        .patch("/api/v1/service-requests/req-1/status")
        .set("Cookie", `access_token=${citizenToken}`)
        .send({ status: "in_progress" });

      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid status value", async () => {
      const res = await request(app)
        .patch("/api/v1/service-requests/req-1/status")
        .set("Cookie", `access_token=${adminToken}`)
        .send({ status: "invalid_status" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 200 when admin updates status", async () => {
      mockService.updateRequestStatus.mockResolvedValue({
        ...sampleRequest,
        status: "in_progress",
      });

      const res = await request(app)
        .patch("/api/v1/service-requests/req-1/status")
        .set("Cookie", `access_token=${adminToken}`)
        .send({ status: "in_progress" });

      expect(res.status).toBe(200);
      expect(res.body.data.request.status).toBe("in_progress");
    });
  });
});
