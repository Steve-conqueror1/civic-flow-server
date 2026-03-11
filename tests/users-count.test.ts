import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/modules/users/users.service", () => ({
  getActiveCitizenCount: vi.fn(),
}));

// Mock Redis so app.ts doesn't try to connect
vi.mock("../src/config/redis", () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    connect: vi.fn(),
    on: vi.fn(),
  },
}));

// Mock DB so app.ts doesn't try to connect
vi.mock("../src/config/db.config", () => ({
  db: {},
}));

import app from "../src/app";
import * as usersService from "../src/modules/users/users.service";

const mockedGetCount = vi.mocked(usersService.getActiveCitizenCount);

describe("GET /api/v1/users/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with a numeric count field", async () => {
    mockedGetCount.mockResolvedValue(42);

    const res = await request(app).get("/api/v1/users/count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, count: 42 });
  });

  it("returns count: 0 when no users exist", async () => {
    mockedGetCount.mockResolvedValue(0);

    const res = await request(app).get("/api/v1/users/count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, count: 0 });
  });

  it("is accessible without authentication", async () => {
    mockedGetCount.mockResolvedValue(10);

    const res = await request(app)
      .get("/api/v1/users/count")
      .set("Cookie", "")
      .unset("Authorization");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("does not expose any user PII", async () => {
    mockedGetCount.mockResolvedValue(5);

    const res = await request(app).get("/api/v1/users/count");

    const body = res.body;
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("firstName");
    expect(body).not.toHaveProperty("lastName");
    expect(body).not.toHaveProperty("data");
    expect(Object.keys(body)).toEqual(["success", "count"]);
  });
});
