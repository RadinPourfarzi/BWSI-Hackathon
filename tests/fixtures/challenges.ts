import type { CategoryId } from "@/config/categories";
import type { BinaryChoice, Challenge } from "@/features/game/types";

export function makeChallenge({
  index,
  category = "image",
  correctChoice = "option_a",
}: {
  index: number;
  category?: CategoryId;
  correctChoice?: BinaryChoice;
}): Challenge {
  const suffix = index.toString().padStart(12, "0");
  const hash = (index % 256).toString(16).padStart(2, "0").repeat(32);
  const labels =
    category === "email"
      ? { optionA: "Scam", optionB: "Legitimate" }
      : { optionA: "AI", optionB: "Real" };
  const payload =
    category === "image"
      ? {
          kind: "image" as const,
          src: `/fixtures/image-${index}.webp`,
          alt: `Fixture image ${index}`,
          width: 768,
          height: 768,
        }
      : category === "email"
        ? {
            kind: "email" as const,
            senderName: `Fixture Sender ${index}`,
            senderAddress: `sender-${index}@example.com`,
            subject: `Fixture subject ${index}`,
            body: `Fixture email body ${index}.`,
          }
        : {
            kind: "audio" as const,
            src: `/fixtures/audio-${index}.mp3`,
            durationSeconds: 4,
          };

  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    category,
    contentType:
      category === "voice" ? "audio" : category === "email" ? "email" : "image",
    payload,
    correctChoice,
    labels,
    difficulty: {
      tier: "medium",
      signals: ["fixture signal"],
    },
    explanation: `Fixture explanation ${index}.`,
    sourceDataset: "Test fixtures",
    originalSourceUrl: `https://example.com/fixtures/${index}`,
    license: "CC0-1.0",
    attribution: "Synthetic test fixture.",
    contentHash: hash,
    active: true,
    metadata: {},
  };
}

export function makeChallengeSet(
  count: number,
  categories: readonly CategoryId[] = ["image", "email", "voice"],
): Challenge[] {
  return Array.from({ length: count }, (_value, index) =>
    makeChallenge({
      index: index + 1,
      category: categories[index % categories.length] ?? "image",
      correctChoice: index % 2 === 0 ? "option_a" : "option_b",
    }),
  );
}
