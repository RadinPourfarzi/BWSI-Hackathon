import { GameError } from "@/server/errors/game.errors";
import type { GameRepository } from "@/server/repositories/game.repository";
import type { CategoryId, QuestionRecord } from "@/shared/types/game.types";

export interface QuestionSelectionInput {
  categories: CategoryId[];
  excludeIds: string[];
}

export interface QuestionSelector {
  selectNext(input: QuestionSelectionInput): Promise<QuestionRecord>;
}

export class RandomQuestionSelector implements QuestionSelector {
  constructor(
    private readonly repository: GameRepository,
    private readonly random: () => number = Math.random,
  ) {}

  async selectNext(input: QuestionSelectionInput): Promise<QuestionRecord> {
    const candidates = await this.repository.listQuestions(input);
    if (candidates.length === 0) {
      throw new GameError(
        "No eligible challenges remain for the selected categories.",
        "NOT_FOUND",
        404,
      );
    }

    const index = Math.floor(this.random() * candidates.length);
    const selected = candidates[index];
    if (!selected) {
      throw new Error("Question selection produced an invalid index.");
    }
    return selected;
  }
}
