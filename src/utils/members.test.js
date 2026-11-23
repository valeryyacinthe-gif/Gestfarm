import { describe, expect, it } from "vitest";
import { permissionsForRole, resolveMemberStatus } from "./members";

describe("permissionsForRole", () => {
  it("allows managers to manage tasks but keeps deletion reserved", () => {
    expect(permissionsForRole("manager").equipe).toEqual({
      read: true, create: true, update: true, delete: false
    });
    expect(permissionsForRole("promoter").equipe.delete).toBe(true);
    expect(permissionsForRole("viewer").equipe.create).toBeUndefined();
  });

  it("returns an independent permission object", () => {
    const first = permissionsForRole("technician");
    first.suivi.create = false;
    expect(permissionsForRole("technician").suivi.create).toBe(true);
  });
});

describe("resolveMemberStatus", () => {
  it("keeps a disabled member inactive", () => {
    expect(resolveMemberStatus({ isActive: false, currentStatus: "active", userId: "u1" })).toBe("inactive");
  });

  it("reactivates an existing linked account", () => {
    expect(resolveMemberStatus({ isActive: true, currentStatus: "inactive", userId: "u1" })).toBe("active");
  });

  it("returns an unlinked reactivated member to pending invitation", () => {
    expect(resolveMemberStatus({ isActive: true, currentStatus: "inactive", userId: null })).toBe("pending");
  });

  it("preserves pending invitations and active members", () => {
    expect(resolveMemberStatus({ isActive: true, currentStatus: "pending" })).toBe("pending");
    expect(resolveMemberStatus({ isActive: true, currentStatus: "active", userId: "u1" })).toBe("active");
  });
});
