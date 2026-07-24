import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "@/features/auth/schemas";
import { safeNextPath } from "@/lib/utils";

describe("safeNextPath", () => {
  it("preserves safe application-relative destinations", () => {
    expect(safeNextPath("/app/training?category=email")).toBe(
      "/app/training?category=email",
    );
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeNextPath("https://malicious.example")).toBe("/app");
    expect(safeNextPath("//malicious.example/path")).toBe("/app");
    expect(safeNextPath("/\\malicious.example/path")).toBe("/app");
    expect(safeNextPath("/app\nLocation: https://malicious.example")).toBe(
      "/app",
    );
    expect(safeNextPath(null)).toBe("/app");
  });
});

describe("authentication schemas", () => {
  it("does not apply the sign-up password policy to existing accounts", () => {
    expect(
      signInSchema.safeParse({
        email: " PLAYER@EXAMPLE.COM ",
        password: "short",
        next: "/app",
      }).success,
    ).toBe(true);
  });

  it("keeps the stronger password requirement for new accounts", () => {
    expect(
      signUpSchema.safeParse({
        displayName: "Player",
        email: "player@example.com",
        password: "short",
        next: "/app",
      }).success,
    ).toBe(false);
  });
});
