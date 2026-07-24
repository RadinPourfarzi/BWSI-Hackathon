import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { datasetManifestSchema } from "@/features/game/schemas";

const manifestPath = join(process.cwd(), "data", "dataset-manifest.json");
const manifest = datasetManifestSchema.parse(
  JSON.parse(readFileSync(manifestPath, "utf8")),
);

describe("dataset manifest", () => {
  it("contains balanced starter data in every category", () => {
    for (const category of ["image", "email", "voice"] as const) {
      const records = manifest.challenges.filter(
        (challenge) => challenge.category === category,
      );
      const optionA = records.filter(
        (challenge) => challenge.correctChoice === "option_a",
      );

      expect(records.length).toBeGreaterThanOrEqual(12);
      expect(optionA).toHaveLength(records.length / 2);
    }
  });

  it("references present media with matching SHA-256 hashes", () => {
    for (const challenge of manifest.challenges) {
      if (challenge.payload.kind === "email") continue;

      const path = join(
        process.cwd(),
        "public",
        challenge.payload.src.slice(1),
      );
      expect(existsSync(path), path).toBe(true);
      const hash = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      expect(hash).toBe(challenge.contentHash);
    }
  });

  it("records an access date and license for every source", () => {
    manifest.sources.forEach((source) => {
      expect(source.accessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.license.length).toBeGreaterThan(0);
    });
  });
});
