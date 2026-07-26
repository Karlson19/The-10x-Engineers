import { describe, expect, it } from "vitest";
import { HttpError } from "../src/lib/http-error";
import { assertOwnership } from "../src/middleware/rbac";

/**
 * The guard that Phase 3 puts in front of vehicles and service requests. The
 * full end to end version of build spec test 4, a CLIENT reading another
 * client's service request, lands with those routes.
 */
describe("assertOwnership", () => {
  const owner = { id: "11111111-1111-4111-8111-111111111111", role: "CLIENT" } as const;
  const otherClient = { id: "22222222-2222-4222-8222-222222222222", role: "CLIENT" } as const;
  const manager = { id: "33333333-3333-4333-8333-333333333333", role: "MANAGEMENT" } as const;

  it("lets an owner through", () => {
    expect(() => assertOwnership(owner, owner.id)).not.toThrow();
  });

  it("lets management through for any record", () => {
    expect(() => assertOwnership(manager, owner.id)).not.toThrow();
  });

  it("refuses another client", () => {
    expect(() => assertOwnership(otherClient, owner.id)).toThrow(HttpError);
  });

  it("answers 404 rather than 403, so it does not confirm the record exists", () => {
    try {
      assertOwnership(otherClient, owner.id);
      expect.unreachable("assertOwnership should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error instanceof HttpError ? error.status : 0).toBe(404);
      expect(error instanceof HttpError ? error.code : "").toBe("NOT_FOUND");
    }
  });
});
