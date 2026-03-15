import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { AppError } from "../shared/errors/AppError";

const TEST_JWT_SECRET = "test-secret-that-is-at-least-32-chars-long!!";

// ---------------------------------------------------------------------------
// Mock env before anything else loads — factory must use inline values
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
  },
}));

// Mock Redis so it doesn't try to connect
vi.mock("../config/redis", () => ({
  redisClient: {
    connect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

// Mock the db instance
vi.mock("../config/db.config", () => ({
  db: {},
}));

// Mock the service layer — all business logic is mocked
vi.mock("../modules/services/service.service");

import app from "../app";
import * as serviceService from "../modules/services/service.service";

const mockService = vi.mocked(serviceService);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signToken(role: "citizen" | "admin" | "super_admin"): string {
  return jwt.sign(
    { sub: "user-123", role, departmentId: null, jti: "jti-1" },
    TEST_JWT_SECRET,
    { expiresIn: "15m" },
  );
}

const adminToken = signToken("admin");
const citizenToken = signToken("citizen");

const sampleService = {
  id: "svc-1",
  categoryId: "cat-1",
  departmentId: "dept-1",
  name: "Birth Certificate",
  slug: "birth-certificate",
  description: "Apply for a birth certificate",
  instructions: null,
  isActive: true,
  minResponseDays: 2,
  maxResponseDays: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const paginatedResult = {
  services: [sampleService],
  pagination: { page: 1, limit: 10, total: 1 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Services API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---- Public list ----
  describe("GET /api/v1/services", () => {
    it("returns paginated active services", async () => {
      mockService.listServices.mockResolvedValue(paginatedResult);

      const res = await request(app).get("/api/v1/services");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
      });
      expect(mockService.listServices).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        includeInactive: false,
      });
    });

    it("respects page and limit query params", async () => {
      mockService.listServices.mockResolvedValue({
        services: [],
        pagination: { page: 2, limit: 5, total: 0 },
      });

      await request(app).get("/api/v1/services?page=2&limit=5");

      expect(mockService.listServices).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        includeInactive: false,
      });
    });
  });

  // ---- Single service ----
  describe("GET /api/v1/services/:id", () => {
    it("returns a service by ID", async () => {
      mockService.getServiceById.mockResolvedValue(sampleService);

      const res = await request(app).get("/api/v1/services/svc-1");

      expect(res.status).toBe(200);
      expect(res.body.data.service.id).toBe("svc-1");
    });

    it("returns 404 for unknown ID", async () => {
      mockService.getServiceById.mockRejectedValue(
        new AppError(404, "Service not found."),
      );

      const res = await request(app).get("/api/v1/services/unknown-id");

      expect(res.status).toBe(404);
    });
  });

  // ---- Search ----
  describe("GET /api/v1/services/search", () => {
    it("returns results for a matching term", async () => {
      mockService.searchServices.mockResolvedValue(paginatedResult);

      const res = await request(app).get(
        "/api/v1/services/search?q=certificate",
      );

      expect(res.status).toBe(200);
      expect(res.body.data.services).toHaveLength(1);
    });

    it("returns 400 for a blank query string", async () => {
      const res = await request(app).get("/api/v1/services/search?q=");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when q param is missing", async () => {
      const res = await request(app).get("/api/v1/services/search");

      expect(res.status).toBe(400);
    });
  });

  // ---- Filter by category ----
  describe("GET /api/v1/services/category/:categoryId", () => {
    it("returns services for a valid category", async () => {
      mockService.listByCategory.mockResolvedValue(paginatedResult);

      const res = await request(app).get("/api/v1/services/category/cat-1");

      expect(res.status).toBe(200);
      expect(res.body.data.services).toHaveLength(1);
    });

    it("returns 404 when category not found", async () => {
      mockService.listByCategory.mockRejectedValue(
        new AppError(404, "Category not found."),
      );

      const res = await request(app).get(
        "/api/v1/services/category/unknown-cat",
      );

      expect(res.status).toBe(404);
    });
  });

  // ---- Filter by department ----
  describe("GET /api/v1/services/department/:departmentId", () => {
    it("returns services for a valid department", async () => {
      mockService.listByDepartment.mockResolvedValue(paginatedResult);

      const res = await request(app).get("/api/v1/services/department/dept-1");

      expect(res.status).toBe(200);
    });

    it("returns 404 when department not found", async () => {
      mockService.listByDepartment.mockRejectedValue(
        new AppError(404, "Department not found."),
      );

      const res = await request(app).get(
        "/api/v1/services/department/unknown-dept",
      );

      expect(res.status).toBe(404);
    });
  });

  // ---- Grouped by category ----
  describe("GET /api/v1/services/grouped/category", () => {
    it("returns expected grouped structure", async () => {
      mockService.getGroupedByCategory.mockResolvedValue([
        {
          category: {
            id: "cat-1",
            name: "Certificates",
            description: "description",
          },
          services: [sampleService],
        },
      ]);

      const res = await request(app).get("/api/v1/services/grouped/category");

      expect(res.status).toBe(200);
      expect(res.body.data.groups).toHaveLength(1);
      expect(res.body.data.groups[0].category.name).toBe("Certificates");
      expect(res.body.data.groups[0].total).toBe(1);
    });
  });

  // ---- Grouped by department ----
  describe("GET /api/v1/services/grouped/department", () => {
    it("returns expected grouped structure", async () => {
      mockService.getGroupedByDepartment.mockResolvedValue([
        {
          department: { id: "dept-1", name: "Revenue" },
          services: [sampleService],
        },
      ]);

      const res = await request(app).get("/api/v1/services/grouped/department");

      expect(res.status).toBe(200);
      expect(res.body.data.groups).toHaveLength(1);
      expect(res.body.data.groups[0].department.name).toBe("Revenue");
    });
  });

  // ---- Admin: create ----
  describe("POST /api/v1/services (admin)", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).post("/api/v1/services").send({
        name: "Test",
        categoryId: "cat-1",
        departmentId: "dept-1",
      });

      expect(res.status).toBe(401);
    });

    it("returns 403 when caller is citizen role", async () => {
      const res = await request(app)
        .post("/api/v1/services")
        .set("Cookie", `access_token=${citizenToken}`)
        .send({
          name: "Test",
          categoryId: "cat-1",
          departmentId: "dept-1",
        });

      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid body", async () => {
      const res = await request(app)
        .post("/api/v1/services")
        .set("Cookie", `access_token=${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 201 on successful creation", async () => {
      mockService.createService.mockResolvedValue(sampleService);

      const res = await request(app)
        .post("/api/v1/services")
        .set("Cookie", `access_token=${adminToken}`)
        .send({
          name: "Birth Certificate",
          categoryId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          departmentId: "f1e2d3c4-b5a6-4f7e-8d9c-0b1a2f3e4d5c",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.service.name).toBe("Birth Certificate");
    });
  });

  // ---- Admin: delete ----
  describe("DELETE /api/v1/services/:id (admin)", () => {
    it("returns 409 when active requests exist", async () => {
      mockService.deleteService.mockRejectedValue(
        new AppError(409, "Cannot delete a service with active requests."),
      );

      const res = await request(app)
        .delete("/api/v1/services/svc-1")
        .set("Cookie", `access_token=${adminToken}`);

      expect(res.status).toBe(409);
    });

    it("returns 204 on successful deletion", async () => {
      mockService.deleteService.mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/api/v1/services/svc-1")
        .set("Cookie", `access_token=${adminToken}`);

      expect(res.status).toBe(204);
    });
  });

  // ---- Admin: activate / deactivate ----
  describe("PATCH /api/v1/services/:id/activate (admin)", () => {
    it("sets isActive to true", async () => {
      mockService.activateService.mockResolvedValue({
        ...sampleService,
        isActive: true,
      });

      const res = await request(app)
        .patch("/api/v1/services/svc-1/activate")
        .set("Cookie", `access_token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.service.isActive).toBe(true);
    });
  });

  describe("PATCH /api/v1/services/:id/deactivate (admin)", () => {
    it("sets isActive to false", async () => {
      mockService.deactivateService.mockResolvedValue({
        ...sampleService,
        isActive: false,
      });

      const res = await request(app)
        .patch("/api/v1/services/svc-1/deactivate")
        .set("Cookie", `access_token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.service.isActive).toBe(false);
    });
  });
});
