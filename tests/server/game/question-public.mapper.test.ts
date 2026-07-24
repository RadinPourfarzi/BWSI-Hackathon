import { describe, expect, it } from "vitest";
import { toPublicQuestion } from "@/shared/utilities/question-public.mapper";

describe("toPublicQuestion", () => {
  it("never exposes the private isAi answer key", () => {
    const publicQuestion = toPublicQuestion({
      id: "11111111-1111-4111-8111-111111111111",
      categoryId: "image",
      mediaUrl: "image/test.webp",
      isAi: true,
      difficultyRating: "EASY",
      explanationText: "Private feedback",
      metadata: { kind: "image" },
      isActive: true,
    });

    expect(publicQuestion).not.toHaveProperty("isAi");
    expect(publicQuestion).not.toHaveProperty("explanationText");
  });
});
