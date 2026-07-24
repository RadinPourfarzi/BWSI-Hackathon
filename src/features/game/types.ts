import type { z } from "zod";

import type {
  binaryChoiceSchema,
  challengeSchema,
  datasetManifestSchema,
} from "@/features/game/schemas";

export type BinaryChoice = z.infer<typeof binaryChoiceSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type DatasetManifest = z.infer<typeof datasetManifestSchema>;

export type AttemptResolution = {
  challengeId: string;
  selectedChoice: BinaryChoice;
  correctChoice: BinaryChoice;
  isCorrect: boolean;
  responseMs: number;
  obtainablePoints: number;
  awardedPoints: number;
  comboBefore: number;
  comboAfter: number;
};

export type GameStatus = "idle" | "playing" | "answered" | "complete";
