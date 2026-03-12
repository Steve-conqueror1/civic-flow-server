import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

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
// Fixtures
// ---------------------------------------------------------------------------

const sampleFeaturedCase = {
  id: "req-featured-1",
  userId: "user-100",
  serviceId: "svc-1",
  title: "Street light outage on 5th Avenue",
  description: "Multiple street lights not functioning",
  note: null,
  status: "open" as const,
  location: { address: "5th Avenue, Block C" },
  attachments: null,
  assignedTo: null,
  priority: 2,
  aiSummary: "Street light outage reported on 5th Avenue affecting visibility.",
  submittedAt: new Date(),
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Featured Case API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/v1/service-requests/featured", () => {
    it("returns 200 with a featured case when one exists", async () => {
      mockService.getFeaturedCase.mockResolvedValue(sampleFeaturedCase);

      const res = await request(app).get(
        "/api/v1/service-requests/featured",
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe("req-featured-1");
    });

    it("returns 200 with null data when no cases exist", async () => {
      mockService.getFeaturedCase.mockResolvedValue(null);

      const res = await request(app).get(
        "/api/v1/service-requests/featured",
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it("does not require authentication", async () => {
      mockService.getFeaturedCase.mockResolvedValue(sampleFeaturedCase);

      const res = await request(app).get(
        "/api/v1/service-requests/featured",
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 when the service throws", async () => {
      mockService.getFeaturedCase.mockRejectedValue(new Error("OpenAI error"));

      const res = await request(app).get(
        "/api/v1/service-requests/featured",
      );

      expect(res.status).toBe(500);
    });
  });
});
