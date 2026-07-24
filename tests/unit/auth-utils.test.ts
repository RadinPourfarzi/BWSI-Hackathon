import { describe, expect, it } from "vitest";

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
    expect(safeNextPath(null)).toBe("/app");
  });
});
