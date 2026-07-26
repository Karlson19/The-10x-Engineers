import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { healthResponseSchema } from "@chrysmec/shared";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it("returns a payload matching the shared health schema", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    const parsed = healthResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
  });

  it("reports the database as up", async () => {
    const response = await request(app).get("/health");

    expect(response.body.database).toBe("up");
    expect(response.body.status).toBe("ok");
  });

  it("is also mounted under the versioned base path", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.service).toBe("chrysmec-api");
  });
});

describe("unknown routes", () => {
  it("returns the standard error envelope with a NOT_FOUND code", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "No route matches GET /api/v1/does-not-exist.",
      },
    });
  });
});
