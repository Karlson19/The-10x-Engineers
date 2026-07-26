import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { REFRESH_COOKIE_NAME, authResponseSchema, meResponseSchema } from "@chrysmec/shared";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  TEST_PASSWORD,
  createTestUser,
  deleteTestUsers,
  readSetCookies,
  testEmail,
} from "./helpers";
import type { SeededUser } from "./helpers";

let client: SeededUser;
let management: SeededUser;

async function signIn(user: SeededUser): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: user.email, password: user.password });

  expect(response.status).toBe(200);
  return authResponseSchema.parse(response.body).accessToken;
}

beforeAll(async () => {
  await deleteTestUsers();
  client = await createTestUser({ label: "client", role: "CLIENT" });
  management = await createTestUser({ label: "management", role: "MANAGEMENT" });
});

afterAll(async () => {
  await deleteTestUsers();
  await prisma.$disconnect();
});

/** Test 1 in the build spec: the happy path, end to end. */
describe("register, login and reach a protected route", () => {
  it("registers a client, signs them in and returns their own record", async () => {
    const email = testEmail("happy-path");

    const registered = await request(app).post("/api/v1/auth/register").send({
      fullName: "Adwoa Mensimah",
      email,
      phone: "+233 24 111 2233",
      password: TEST_PASSWORD,
    });

    expect(registered.status).toBe(201);
    const registerBody = authResponseSchema.parse(registered.body);
    expect(registerBody.user.role).toBe("CLIENT");
    expect(registerBody.user.email).toBe(email);

    const loggedIn = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: TEST_PASSWORD });

    expect(loggedIn.status).toBe(200);
    const { accessToken } = authResponseSchema.parse(loggedIn.body);

    const profile = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(profile.status).toBe(200);
    expect(meResponseSchema.parse(profile.body).user.email).toBe(email);
  });

  it("never returns the password hash", async () => {
    const accessToken = await signIn(client);
    const profile = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(JSON.stringify(profile.body)).not.toContain("passwordHash");
    expect(JSON.stringify(profile.body)).not.toContain("$argon2");
  });
});

/** Test 2 in the build spec. */
describe("a protected route rejects a missing or invalid token", () => {
  it("returns 401 when no token is sent", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for a token that is not a JWT", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
  });

  it("returns 401 when the scheme is not Bearer", async () => {
    const accessToken = await signIn(client);
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Basic ${accessToken}`);

    expect(response.status).toBe(401);
  });

  it("refuses a refresh token presented as an access token", async () => {
    const agent = request.agent(app);
    const loggedIn = await agent
      .post("/api/v1/auth/login")
      .send({ email: client.email, password: client.password });

    const refreshCookie = readSetCookies(loggedIn.headers).find((cookie) =>
      cookie.startsWith(REFRESH_COOKIE_NAME),
    );
    expect(refreshCookie).toBeDefined();

    const refreshToken = (refreshCookie ?? "").split("=")[1]?.split(";")[0] ?? "";
    expect(refreshToken.length).toBeGreaterThan(0);

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${refreshToken}`);

    expect(response.status).toBe(401);
  });
});

/** Test 3 in the build spec. */
describe("role based access control", () => {
  it("refuses a CLIENT on a MANAGEMENT only route with 403", async () => {
    const accessToken = await signIn(client);

    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("refuses a CLIENT reading another account through the users route", async () => {
    const accessToken = await signIn(client);

    const response = await request(app)
      .get(`/api/v1/users/${management.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });

  it("allows MANAGEMENT to list users", async () => {
    const accessToken = await signIn(management);

    const response = await request(app)
      .get("/api/v1/users?limit=5")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.limit).toBe(5);
  });
});

describe("a role sent by the client is never trusted", () => {
  it("ignores a role field in the register payload", async () => {
    const email = testEmail("role-escalation");

    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "Sneaky Signup",
      email,
      phone: "+233240000001",
      password: TEST_PASSWORD,
      role: "MANAGEMENT",
      isActive: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("CLIENT");

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.role).toBe("CLIENT");
  });
});

describe("login failures", () => {
  it("rejects a wrong password with 401", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: client.email, password: "definitely-not-it-123" });

    expect(response.status).toBe(401);
  });

  it("gives the same answer for an unknown email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail("nobody"), password: TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("refuses a deactivated account", async () => {
    const suspended = await createTestUser({ label: "suspended", role: "CLIENT", isActive: false });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: suspended.email, password: suspended.password });

    expect(response.status).toBe(403);
  });

  it("stops an existing token working once the account is deactivated", async () => {
    const revoked = await createTestUser({ label: "revoked", role: "CLIENT" });
    const accessToken = await signIn(revoked);

    await prisma.user.update({ where: { id: revoked.id }, data: { isActive: false } });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
  });
});

describe("registration validation", () => {
  it("rejects a duplicate email with 409", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "Duplicate Person",
      email: client.email,
      phone: "+233240000002",
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("returns field level detail for a weak password", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "Weak Password",
      email: testEmail("weak"),
      phone: "+233240000003",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toHaveProperty("password");
  });
});

describe("refresh and logout", () => {
  it("issues a new access token from the refresh cookie and clears it on logout", async () => {
    const agent = request.agent(app);

    const loggedIn = await agent
      .post("/api/v1/auth/login")
      .send({ email: client.email, password: client.password });
    expect(loggedIn.status).toBe(200);

    const refreshed = await agent.post("/api/v1/auth/refresh");
    expect(refreshed.status).toBe(200);
    expect(typeof refreshed.body.accessToken).toBe("string");

    const profile = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${refreshed.body.accessToken}`);
    expect(profile.status).toBe(200);

    const loggedOut = await agent.post("/api/v1/auth/logout");
    expect(loggedOut.status).toBe(204);

    const afterLogout = await agent.post("/api/v1/auth/refresh");
    expect(afterLogout.status).toBe(401);
  });

  it("returns 401 when there is no refresh cookie at all", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
  });

  it("sets the refresh token as an httpOnly cookie", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: client.email, password: client.password });

    const refreshCookie = readSetCookies(response.headers).find((cookie) =>
      cookie.startsWith(REFRESH_COOKIE_NAME),
    );

    expect(refreshCookie).toContain("HttpOnly");
    // The token itself must never appear in the response body.
    expect(JSON.stringify(response.body)).not.toContain("refreshToken");
  });
});

describe("management user administration", () => {
  it("creates a staff account, rejects one without a section, and deactivates rather than deletes", async () => {
    const accessToken = await signIn(management);
    const staffEmail = testEmail("new-staff");

    const missingSection = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fullName: "Sectionless Staff",
        email: testEmail("sectionless"),
        phone: "+233240000004",
        password: TEST_PASSWORD,
        role: "STAFF",
      });

    expect(missingSection.status).toBe(400);
    expect(missingSection.body.error.code).toBe("VALIDATION_ERROR");

    const created = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fullName: "Kojo Technician",
        email: staffEmail,
        phone: "+233240000005",
        password: TEST_PASSWORD,
        role: "STAFF",
        section: "ELECTRICAL",
      });

    expect(created.status).toBe(201);
    expect(created.body.user.role).toBe("STAFF");
    expect(created.body.user.section).toBe("ELECTRICAL");

    const removed = await request(app)
      .delete(`/api/v1/users/${created.body.user.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(removed.status).toBe(200);
    expect(removed.body.user.isActive).toBe(false);

    const stillThere = await prisma.user.findUnique({ where: { email: staffEmail } });
    expect(stillThere).not.toBeNull();
  });

  it("stops management deactivating their own account", async () => {
    const accessToken = await signIn(management);

    const response = await request(app)
      .delete(`/api/v1/users/${management.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });
});
