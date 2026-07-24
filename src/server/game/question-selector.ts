import type { GameRepository } from '@/server/repositories/game.repository';
import type {
  ActiveGameConfig,
  CategoryId,
  QuestionRecord,
} from '@/shared/types/game.types';

export interface QuestionSelectionInput {
  categories: CategoryId[];
  excludeIds: string[];
  config: ActiveGameConfig;
}

export interface QuestionSelector {
  selectNext(input: QuestionSelectionInput): Promise<QuestionRecord | null>;
}

export class RandomQuestionSelector implements QuestionSelector {
  constructor(
    private readonly repository: GameRepository,
    private readonly random: () => number = Math.random,
  ) {}

  async selectNext(input: QuestionSelectionInput): Promise<QuestionRecord | null> {
    const candidates = await this.repository.listQuestions({
      ...input,
      limit: 100,
    });
    if (candidates.length === 0) {
      return null;
    }

    const index = Math.floor(this.random() * candidates.length);
    return candidates[index] ?? null;
  }
}
