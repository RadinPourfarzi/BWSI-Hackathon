import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { categoryConfig } from "../src/config/categories";
import { datasetManifestSchema } from "../src/features/game/schemas";
import type { Challenge, DatasetManifest } from "../src/features/game/types";
import { getServiceSupabaseConfig } from "../src/lib/env";
import type { Database, Json } from "../src/types/database";

const projectRoot = join(import.meta.dirname, "..");
const manifestPath = join(projectRoot, "data", "dataset-manifest.json");
const flags = new Set(process.argv.slice(2));
const shouldSeed = flags.has("--seed");
const shouldUpload = flags.has("--upload");
const dryRun = flags.has("--dry-run") || (!shouldSeed && !shouldUpload);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function localAssetPath(challenge: Challenge): string | null {
  if (challenge.payload.kind === "email") return null;
  if (!challenge.payload.src.startsWith("/")) return null;

  return join(projectRoot, "public", challenge.payload.src.slice(1));
}

function contentTypeForPath(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".ogg") return "audio/ogg";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function loadAndValidateManifest(): DatasetManifest {
  if (!existsSync(manifestPath)) {
    throw new Error(
      "Dataset manifest is missing. Run `npm run data:manifest` first.",
    );
  }

  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  const parsed = datasetManifestSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Dataset manifest validation failed:\n${issues}`);
  }

  const assetErrors: string[] = [];

  for (const challenge of parsed.data.challenges) {
    const path = localAssetPath(challenge);

    if (path) {
      if (!existsSync(path)) {
        assetErrors.push(`${challenge.id}: missing ${path}`);
        continue;
      }

      const actualHash = sha256(readFileSync(path));
      if (actualHash !== challenge.contentHash) {
        assetErrors.push(
          `${challenge.id}: hash mismatch; expected ${challenge.contentHash}, received ${actualHash}`,
        );
      }
    } else if (challenge.payload.kind === "email") {
      const actualHash = sha256(JSON.stringify(challenge.payload));
      if (actualHash !== challenge.contentHash) {
        assetErrors.push(`${challenge.id}: sanitized email hash mismatch`);
      }
    }
  }

  if (assetErrors.length > 0) {
    throw new Error(`Asset validation failed:\n${assetErrors.join("\n")}`);
  }

  return parsed.data;
}

async function uploadMedia(
  client: ReturnType<typeof createClient<Database>>,
  challenge: Challenge,
  bucket: string,
): Promise<string | null> {
  const path = localAssetPath(challenge);
  if (!path) return null;

  const storagePath = `${challenge.category}/${challenge.contentHash}${extname(path)}`;
  const { error } = await client.storage
    .from(bucket)
    .upload(storagePath, readFileSync(path), {
      cacheControl: "31536000",
      contentType: contentTypeForPath(path),
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed for ${path}: ${error.message}`);
  }

  return storagePath;
}

async function seedManifest(manifest: DatasetManifest): Promise<void> {
  const config = getServiceSupabaseConfig();
  if (!config) {
    throw new Error(
      "Seeding requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY. Validation does not require credentials.",
    );
  }

  const client = createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const categoryRows = Object.values(categoryConfig).map((category, index) => ({
    slug: category.id,
    name: category.name,
    option_a_label: category.optionA,
    option_b_label: category.optionB,
    renderer_key: category.rendererKey,
    active: true,
    sort_order: (index + 1) * 10,
  }));
  const { data: categories, error: categoryError } = await client
    .from("categories")
    .upsert(categoryRows, { onConflict: "slug" })
    .select("id, slug");

  if (categoryError || !categories) {
    throw new Error(
      `Category upsert failed: ${categoryError?.message ?? "No rows returned"}`,
    );
  }

  const categoryIds = new Map(
    categories.map((category) => [category.slug, category.id]),
  );
  const challengeRows = [];

  for (const challenge of manifest.challenges) {
    const categoryId = categoryIds.get(challenge.category);
    if (!categoryId) {
      throw new Error(`No database category for ${challenge.category}`);
    }

    const storagePath = shouldUpload
      ? await uploadMedia(client, challenge, config.mediaBucket)
      : null;
    const metadata = {
      ...challenge.metadata,
      ...(storagePath ? { storagePath } : {}),
    } as Json;

    challengeRows.push({
      id: challenge.id,
      category_id: categoryId,
      content_type: challenge.contentType,
      payload: challenge.payload as Json,
      correct_choice: challenge.correctChoice,
      option_a_label: challenge.labels.optionA,
      option_b_label: challenge.labels.optionB,
      difficulty: challenge.difficulty.tier,
      difficulty_metadata: {
        signals: challenge.difficulty.signals,
      } as Json,
      explanation: challenge.explanation,
      source_dataset: challenge.sourceDataset,
      original_source_url: challenge.originalSourceUrl,
      license: challenge.license,
      attribution: challenge.attribution,
      content_hash: challenge.contentHash,
      active: challenge.active,
      metadata,
    });
  }

  for (let index = 0; index < challengeRows.length; index += 100) {
    const batch = challengeRows.slice(index, index + 100);
    const { error } = await client
      .from("challenges")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      throw new Error(
        `Challenge batch ${Math.floor(index / 100) + 1} failed: ${error.message}`,
      );
    }
  }

  console.log(
    `Seeded ${challengeRows.length} challenges${shouldUpload ? ` and uploaded media to ${config.mediaBucket}` : ""}.`,
  );
}

async function main(): Promise<void> {
  const manifest = loadAndValidateManifest();
  const counts = Object.fromEntries(
    ["image", "email", "voice"].map((category) => [
      category,
      manifest.challenges.filter((challenge) => challenge.category === category)
        .length,
    ]),
  );

  console.log(
    `Validated manifest v${manifest.version}: ${JSON.stringify(counts)}.`,
  );
  console.log(
    `All ${manifest.challenges.length} records have unique IDs, unique hashes, balanced labels, valid schemas, and verified local assets.`,
  );

  if (dryRun) {
    console.log(
      "Dry run complete. No network, Storage, or database writes were attempted.",
    );
    return;
  }

  await seedManifest(manifest);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
