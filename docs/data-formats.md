# Data Formats & Templates — AI Detection Game

> Standardized shapes for content, config, storage, and client↔server payloads.
> Pairs with `database-schema.md` (persistence) and `project-plan.md` (product spec).
> Keep TypeScript interfaces here in sync with the DB schema and `/config` files —
> they are the single source of truth for data shapes across the app.

---

## 1. Core domain types (TypeScript)

Place these in `/src/types` (e.g. `models.ts`). They mirror DB rows 1:1.

```typescript
export type CategoryId = 'image' | 'email' | 'audio'; // widen as categories are added
export type DifficultyRating = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type GameMode = 'ARCADE' | 'TRAINING';

export interface Category {
  id: CategoryId;
  displayName: string;
  isActive: boolean;
  gracePeriodMs: number;
  sortOrder: number;
}

/** A single challenge as delivered to the client (includes the answer key). */
export interface Question {
  id: string;                       // uuid
  categoryId: CategoryId;
  mediaUrl: string;                 // resolved public URL or storage path
  isAi: boolean;                    // TRUE = AI/Scam/Synthetic, FALSE = Real
  difficultyRating: DifficultyRating;
  explanationText: string | null;   // shown in Training mode only
  metadata: QuestionMetadata;       // category-specific, see §2
}

export interface Profile {
  id: string;
  username: string;
  totalXp: number;
  currentLevel: number;
  dailyStreak: number;
  lastPlayedAt: string | null;      // ISO 8601
  createdAt: string;
}
```

> **Naming convention:** DB columns are `snake_case`; TypeScript is `camelCase`. Do the
> mapping in one place — a `mappers.ts` module (or the Supabase query select alias) — so
> the rest of the app never sees `snake_case`.

---

## 2. Per-category `metadata` (JSONB) shapes

`questions.metadata` is a JSONB blob whose shape is keyed by `category_id`. Model it as a
discriminated union so rendering stays type-safe. Only `image`/`email`/`audio` exist for
the MVP; future categories add new variants without schema changes.

```typescript
export type QuestionMetadata =
  | ImageMetadata
  | EmailMetadata
  | AudioMetadata;

export interface ImageMetadata {
  kind: 'image';
  altText?: string;            // accessibility
  widthPx?: number;
  heightPx?: number;
  source?: string;             // provenance note (not shown mid-run)
}

export interface EmailMetadata {
  kind: 'email';
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt?: string;         // ISO 8601, display-only
  bodyFormat: 'image' | 'html';// 'image' => media_url is a screenshot; 'html' => sanitized HTML
}

export interface AudioMetadata {
  kind: 'audio';
  durationMs: number;          // used with category grace period
  transcript?: string;         // Training mode hint / a11y
  mimeType?: string;           // e.g. 'audio/mpeg'
}
```

> The `kind` discriminant should equal the row's `category_id`. Validate on ingest.

---

## 3. Storage bucket layout (Supabase Storage)

Public bucket named `challenges`. Deterministic paths keep seeding and debugging simple:

```
challenges/
  image/  <question_uuid>.{jpg|png|webp}
  email/  <question_uuid>.{png|jpg}        # screenshot when bodyFormat = 'image'
  audio/  <question_uuid>.{mp3|wav|m4a}
```

- `questions.media_url` stores the **path relative to the bucket** (e.g.
  `image/6f1c….webp`); resolve to a public URL client-side via
  `supabase.storage.from('challenges').getPublicUrl(path)`.
- Keep filenames = question UUID to guarantee uniqueness and easy cross-referencing.

---

## 4. Seed templates

### 4.1 Categories (SQL) — see `database-schema.md` §8.

### 4.2 Questions — CSV template

Bulk-authoring format. `metadata` is a JSON string column; leave `{}` when unused.
Import via a small script (validate, upload media, then insert rows).

```csv
category_id,media_path,is_ai,difficulty_rating,explanation_text,metadata
image,image/ai_portrait_01.webp,true,MEDIUM,"Note the asymmetric earrings and warped background text.","{""kind"":""image"",""altText"":""Portrait of a person""}"
image,image/real_street_02.jpg,false,EASY,"Authentic photo; consistent lighting and reflections.","{""kind"":""image""}"
email,email/paypal_phish_01.png,true,HARD,"Sender domain is paypa1-support.com (digit 1), urgent tone, mismatched link.","{""kind"":""email"",""subject"":""Your account is limited"",""senderName"":""PayPal Support"",""senderAddress"":""service@paypa1-support.com"",""bodyFormat"":""image""}"
audio,audio/cloned_voice_01.mp3,true,EXPERT,"Flat prosody and unnatural breaths indicate synthesis.","{""kind"":""audio"",""durationMs"":8200,""transcript"":""Hi, this is your bank calling...""}"
```

### 4.3 Questions — JSON seed template

```json
[
  {
    "category_id": "image",
    "media_path": "image/ai_portrait_01.webp",
    "is_ai": true,
    "difficulty_rating": "MEDIUM",
    "explanation_text": "Asymmetric earrings; warped background text.",
    "metadata": { "kind": "image", "altText": "Portrait of a person" }
  },
  {
    "category_id": "email",
    "media_path": "email/paypal_phish_01.png",
    "is_ai": true,
    "difficulty_rating": "HARD",
    "explanation_text": "Look-alike domain and urgency cue.",
    "metadata": {
      "kind": "email",
      "subject": "Your account is limited",
      "senderName": "PayPal Support",
      "senderAddress": "service@paypa1-support.com",
      "bodyFormat": "image"
    }
  }
]
```

---

## 5. Client ↔ server payloads

### 5.1 Question batch fetch (run start / background top-up)

Request: category filter + batch size (defaults from `/config/game.ts`).

```typescript
export interface QuestionBatchRequest {
  categories: CategoryId[];  // enabled subset; empty or all => mixed mode
  limit: number;             // default 15
  excludeIds?: string[];     // ids already in the client store (avoid repeats)
}

export interface QuestionBatchResponse {
  questions: Question[];     // includes isAi answer key (accepted trade-off)
}
```

Reference sampling query (random subset from enabled, active categories):

```sql
SELECT id, category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata
FROM questions
WHERE is_active
  AND category_id = ANY ($1)          -- enabled categories
  AND ($2::uuid[] IS NULL OR id <> ALL ($2))  -- exclude already-seen
ORDER BY random()
LIMIT $3;                             -- batch size
```

### 5.2 Active config fetch (run start)

Before a run, the client fetches the authoritative, DB-configurable ruleset via the
`get_active_config()` RPC (`database-schema.md` §6.3) and keeps it in memory to drive
local timers/decay with 0ms latency. Shape matches `ActiveGameConfig` (§6.0).

```typescript
// supabase.rpc('get_active_config') -> ActiveGameConfig
```

### 5.3 Run submission (Game Over)

Single aggregated payload via the `submit_run` RPC (`database-schema.md` §6.5). The
client sends only the **raw facts** of each attempt — never points or XP. The server
recomputes points, final score, XP, level, and streak from the active config and returns
the authoritative results. `points_awarded`/`combo_at_answer` may be included for the
client's own display but are ignored/overwritten server-side.

```typescript
export interface AttemptRecord {
  questionId: string;
  categoryId: CategoryId;
  questionIndex: number;         // position in the run; selects the difficulty tier
  isCorrect: boolean;
  responseTimeMs: number;
  comboAtAnswer: number;
  pointsAwarded?: number;        // optional; client display only — server recomputes
}

/** Sent to submit_run. No score/XP fields — those are derived server-side. */
export interface RunSubmission {
  mode: GameMode;
  categoriesPlayed: CategoryId[];
  attempts: AttemptRecord[];
}

/** Authoritative result returned by submit_run. */
export interface RunResult {
  sessionId: string;
  finalScore: number;
  maxCombo: number;
  questionsAnswered: number;
  xpAwarded: number;
  totalXp: number;
  level: number;
  dailyStreak: number;
}
```

JSON example sent to `submit_run` (snake_case keys to match the RPC's `jsonb` reader):

```json
{
  "p_mode": "ARCADE",
  "p_categories": ["image", "email", "audio"],
  "p_attempts": [
    { "question_id": "6f1c…", "category_id": "image", "question_index": 1, "is_correct": true,  "response_time_ms": 1180, "combo_at_answer": 1 },
    { "question_id": "9a2d…", "category_id": "email", "question_index": 2, "is_correct": false, "response_time_ms": 4300, "combo_at_answer": 0 }
  ]
}
```

---

## 6. Configuration (`/config` templates ↔ `game_config` DB row)

Gameplay tunables that affect **scoring, timers, grace/plateau periods, difficulty, and
XP/progression are server-authoritative**: the runtime source of truth is the active
`game_config` row (`database-schema.md` §3.6). The `/config/*.ts` files below are:

1. the **TypeScript shape contract** for that JSON, and
2. the **default seed values** used to populate `game_config` version 1.

The client fetches the active config once at run start (`get_active_config`, §5.2) and
runs its timers/decay locally for 0ms latency; `submit_run` recomputes scores/XP from the
same row. **To rebalance, update the DB row — no client redeploy.** Purely client-side
concerns (animation durations, colors, media box) stay in `/config/ui.ts` and are not
part of the server config. No magic numbers anywhere else.

> **Future-proofing:** because the client already reads config from one RPC and never
> trusts its own scores, tightening anti-cheat later (e.g. server-issued signed batches,
> or moving answer validation server-side) is localized to the fetch/submit boundary and
> does not touch gameplay components.

### 6.0 `ActiveGameConfig` (shape returned by `get_active_config`)

```typescript
export interface DifficultyTier {
  minQuestion: number;   // tier applies when questionIndex >= this
  maxPoints: number;     // M
  timerMs: number;       // hard cap; answering later scores 0
  plateauMs: number;     // base full-points window (category grace is added on top)
  alpha: number;         // α decay severity for this tier
}

export interface ActiveGameConfig {
  game: { arcadeLives: number; batchSize: number; prefetchThreshold: number };
  scoring: { decayExponentBeta: number; comboMultipliers: number[] };
  difficultyTiers: DifficultyTier[];
  xp: {
    baseXpPerCorrect: number;
    comboBonusPerMaxCombo: number;
    runCompletionBonus: number;
    xpCurveBase: number;
    xpCurveExp: number;
  };
  // Merged in by the RPC from the categories table:
  categories: Record<CategoryId, {
    displayName: string; gracePeriodMs: number; isActive: boolean; sortOrder: number;
  }>;
}
```

### 6.1 `/config/game.ts` (seeds `config.game`)

```typescript
export const GAME_CONFIG = {
  arcadeLives: 3,
  batchSize: 15,
  prefetchThreshold: 5,        // refetch when unused questions < this
  defaultMode: 'ARCADE' as const,
  defaultCategories: ['image', 'email', 'audio'] as const, // mixed mode default
} as const;
```

### 6.2 `/config/scoring.ts` (seeds `config.scoring`)

```typescript
export const SCORING_CONFIG = {
  decayExponentBeta: 1.8,      // β
  comboMultipliers: [1, 1.5, 2, 2.5, 3, 4, 5], // index by combo count (clamped)
} as const;
```

Score model (implemented in `useScoringTimer` client-side and `score_attempt` server-side
— both read the same config), from `project-plan.md` §7. Note the **effective plateau** is
the tier's `plateauMs` **plus** the category's `gracePeriodMs`:

```
t_p  = tier.plateauMs + category.gracePeriodMs   (effective plateau)
M    = tier.maxPoints
α    = tier.alpha ,  β = scoring.decayExponentBeta
S(t) = M                                    if t <= t_p
S(t) = max(0, round(M - α * (t - t_p)^β))   if t >  t_p    (t in seconds past t_p)
S(t) = 0                                    if t >  tier.timerMs   (timed out)
awarded = round(S(t) * comboMultiplier)
```

### 6.3 `/config/difficulty.ts` (seeds `config.difficultyTiers`)

```typescript
export const DIFFICULTY_TIERS = [
  { minQuestion: 1,  maxPoints: 100, timerMs: 15000, plateauMs: 1500, alpha: 1.5 },
  { minQuestion: 6,  maxPoints: 150, timerMs: 10000, plateauMs: 1000, alpha: 2.5 },
  { minQuestion: 16, maxPoints: 200, timerMs:  7000, plateauMs:  500, alpha: 4.0 },
  { minQuestion: 31, maxPoints: 300, timerMs:  5000, plateauMs:  200, alpha: 6.0 },
] as const;
```

### 6.4 `/config/xp.ts` (seeds `config.xp`)

```typescript
export const XP_CONFIG = {
  baseXpPerCorrect: 10,
  comboBonusPerMaxCombo: 5,
  runCompletionBonus: 50,
  // Level curve: XP required for level N = xpCurveBase * N^xpCurveExp
  xpCurveBase: 100,
  xpCurveExp: 1.5,
} as const;
// Total XP = correct*baseXpPerCorrect + maxCombo*comboBonusPerMaxCombo + runCompletionBonus
```

### 6.5 `/config/categories.ts`
### 6.5 `/config/categories.ts` (default seed for the `categories` table)

These values seed the `categories` table (the runtime source for grace periods, merged
into the active config by `get_active_config`).

```typescript
export const CATEGORY_CONFIG = {
  image: { displayName: 'AI Images',   gracePeriodMs: 1500 },
  email: { displayName: 'Scam Emails', gracePeriodMs: 2000 },
  audio: { displayName: 'Voice Audio', gracePeriodMs: 5000 },
} as const;
```

### 6.6 `/config/ui.ts` (client-only; not part of server config)

```typescript
export const UI_CONFIG = {
  correctFlashMs: 180,
  incorrectFlashMs: 220,
  transitionMs: 120,           // question-to-question motion
  mediaBox: { heightPx: 420, widthPct: 100 }, // fixed container, object-fit: contain
  colors: { correct: 'emerald', incorrect: 'red' },
} as const;
```

---

## 7. Client game-engine state (in-memory)

Held in the Zustand/custom store; never persisted mid-run. Persistence happens only at
Game Over via §5.3.

```typescript
export interface GameEngineState {
  mode: GameMode;
  config: ActiveGameConfig;    // fetched once at run start; drives local timers/decay
  enabledCategories: CategoryId[];
  queue: Question[];           // prefetched, unshown
  current: Question | null;
  questionIndex: number;       // drives difficulty tier
  score: number;
  lives: number;               // Arcade only
  combo: number;
  maxCombo: number;
  attempts: AttemptRecord[];   // accumulates for final submission
  status: 'idle' | 'running' | 'gameover';
}
```

---

## 8. Validation checklist for new content

- [ ] `category_id` is one of the seeded categories.
- [ ] `is_ai` is set correctly (TRUE for AI/scam/synthetic).
- [ ] Media uploaded to `challenges/<category>/<uuid>.<ext>`; `media_url` matches.
- [ ] `metadata.kind` equals `category_id` and required per-category fields are present.
- [ ] `difficulty_rating` ∈ {EASY, MEDIUM, HARD, EXPERT}.
- [ ] `explanation_text` present (needed for Training mode value).
