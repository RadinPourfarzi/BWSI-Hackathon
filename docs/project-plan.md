# AI Detection Game – Comprehensive Product & Technical Specification (Hackathon MVP)

---

## 1. Executive Summary & Core Philosophy

### Project Vision

The primary objective of this project is to build **"the GeoGuessr of AI detection"**—a web-based, fast-paced educational game that trains users to instinctively recognize AI-generated media, synthetic audio, and malicious scam content.

Traditional digital literacy tools fail because they rely on passive learning: static articles, long video courses, or dense explanations. This application flips that paradigm. It teaches primarily through **rapid, repetitive gameplay**, forcing players to make split-second decisions under increasing time pressure. Over time, players build intuitive pattern-recognition skills to spot deepfakes and scams across everyday digital environments.

### Hackathon MVP Scope

Education is the ultimate outcome, but **arcade engagement is the primary design goal**. The experience must feel like a modern, competitive arcade game rather than an online learning portal.

* **Build Target:** Designed for a **6–8 hour implementation window** utilizing modern AI-assisted development tools (e.g., Claude Code, Impeccable).
* **Architecture Goal:** Minimal complexity for the MVP, but built on a strict, configuration-driven foundation so future features (multiplayer, social, classroom modes) require zero architectural rewrites.

---

## 2. Core Design Principles

* **0ms Latency Gameplay:** Zero network delay between clicking an answer and seeing the result.
* **Minimal UI Clutter:** High readability, clean spacing, and zero distracting visual noise.
* **Immediate Feedback Loop:** Fast visual responses to keep the player in a state of flow.
* **Smooth Motion & Micro-Animations:** Subtle transitions and score tick-downs that feel satisfying and tactile.
* **Configuration-Driven Logic:** Mechanics, timers, multipliers, and scoring formulas must live in dedicated configuration files—never hardcoded in components or game engines.
* **No Overengineering:** Keep client-server interactions simple for the MVP while maintaining clean separation of concerns.

---

## 3. Target Audience & Platform Support

### Target Audience

* **General Public:** Accessible to non-technical users, students, and seniors wanting to protect themselves from digital scams.
* **Competitive Casual Gamers:** Players who enjoy reaction-based arcade games, high-score hunting, and daily streak mechanics.

### Platform

* **Primary Target:** Web application with a desktop-first responsive design.
* **Secondary Target:** Tablet and mobile support (touch controls for "AI" vs "Real" buttons should scale cleanly, though mobile optimization is secondary for the 6–8 hour MVP).

---

## 4. Authentication & User Management

* **Provider:** Supabase Auth (Simple Email/Password authentication).
* **Guest Mode:** Excluded for MVP to ensure all progress, streaks, analytics, and XP persist reliably from session one.
* **User Lifecycle:** Account creation immediately initializes user progression records (Level 1, 0 XP, 0 Daily Streak) and links all future game sessions and attempt metrics to the unique User ID.

---

## 5. Supported Categories & Media Mechanics

The system abstracts every piece of content as a generic **"Challenge"**, isolating rendering logic by category type so new categories can be added seamlessly without touching core gameplay code.

```
/src/categories
  ├── ImageCategory.tsx
  ├── EmailCategory.tsx
  ├── AudioCategory.tsx
  └── CategoryRegistry.ts

```

### Initial MVP Categories

1. **AI Images:** Generative photorealistic images, synthetic art, or real photography.
2. **Scam Emails:** Phishing attempts, social engineering emails, or legitimate corporate communications.
3. **AI Voice Audio:** Synthetic voice clips or authentic human voice recordings.

### Category Grace Periods

Media types requiring consumption time (like audio clips) implement a category-level **Grace Period**. For example, the `AudioCategory` configuration defines a 5-second pause on the timer and score decay, giving the player time to hear the sample before point depletion begins.

### Category Selection UI

Before launching a run, players can filter content categories:

* **Default State:** Mixed Mode (All categories checked).
* **Selection Options:**
* `[x] AI Images`
* `[x] Scam Emails`
* `[x] Voice Audio`


* The game engine randomly samples questions exclusively from the enabled subset.

### Future Categories (Architecture-Ready)

Deepfake video, fake websites, social media posts, SMS text phishing (Smishing), phone call recordings, fake news articles, and QR code scams.

---

## 6. Game Modes

### 1. Arcade Mode (Primary Competitive Mode)

* **Objective:** Survive as long as possible while maximizing total score and combo multipliers.
* **Lives:** Exactly 3 lives ($\text{❤️❤️❤️}$). An incorrect answer deducts 1 life.
* **Transitions:** 0ms instantaneous load to the next question upon answering. No explanations displayed during the run.
* **End Condition:** Run ends immediately when lives reach 0.
* **Rewards:** High score updates, XP awards, streak updates, and detailed analytics persistence.

### 2. Training Mode (Educational Practice Mode)

* **Objective:** Stress-free skill improvement and media analysis.
* **Lives & Timers:** Unlimited lives, no score decay, no time-out penalties, no leaderboard pressure.
* **Feedback:** Immediate correctness visual indicator, featuring a UI placeholder panel reserved for detailed post-answer explanations and detection hints.
* **Sharing:** Uses the same question sampling engine as Arcade Mode but bypasses competitive constraints.

---

## 7. Deep-Dive Game Mechanics & Engine Logic

### The Core Gameplay Loop

```
[Start Arcade Run] 
       │
       ▼
[Prefetch Question Batch (10-20)] ──► [Render Current Question UI]
                                                 │
                                                 ▼
                                     [Start Timer & Point Decay]
                                                 │
                                                 ▼
                                     [Player Clicks: AI or Real]
                                                 │
                                                 ▼
                                     [Instant Client-Side Check]
                                                 │
                             ┌───────────────────┴───────────────────┐
                             ▼                                       ▼
                     (Correct Answer)                        (Incorrect Answer)
                             │                                       │
                ┌────────────┴────────────┐                          │
                ▼                         ▼                          ▼
       [Add Decay-Adjusted      [Increment Combo]             [Deduct 1 Life]
         Obtainable Points]               │                          │
                │                         │                          ▼
                └────────────┬────────────┘                   [Reset Combo to 0x]
                             │                                       │
                             └───────────────────┬───────────────────┘
                                                 │
                                                 ▼
                                     [Brief Visual Flash Feed]
                                                 │
                                                 ▼
                                   (Is Lives > 0?)
                                    /           \
                                  (Yes)         (No)
                                  /               \
            [Load Next Question]                   [End Run & Sync
          (Prefetch if Cache < 5)                   Final Stats to DB]

```

### Scoring Math & Configurable Decay Curve

To balance fast reflexes with human reaction times, score decay does **not** follow a linear path. Instead, it utilizes a **Plateau + Exponential Ease-In Decay Model**.

The obtainable score $S(t)$ at elapsed time $t$ (in seconds) is calculated as:

$$S(t) = \begin{cases} M & \text{if } t \le t_p \\ \max\left(0, \text{round}\left(M - \alpha \cdot (t - t_p)^\beta\right)\right) & \text{if } t > t_p \end{cases}$$

Where:

* $M$ = Maximum points available for the question (e.g., $100$).
* $t_p$ = Category/Difficulty plateau grace period in seconds (e.g., $1.5\text{s}$ for images, $5.0\text{s}$ for audio).
* $\alpha$ = Decay severity multiplier (e.g., $2.5$).
* $\beta$ = Exponential acceleration factor (e.g., $1.8$).

#### Visual Decay Progression (Example: $M = 100$)

* **$0.0\text{s} - 1.5\text{s}$ (Plateau):** $100$ Points (Rewards split-second reflexes).
* **$2.0\text{s}$:** $98$ Points.
* **$3.0\text{s}$:** $89$ Points.
* **$4.0\text{s}$:** $72$ Points.
* **$5.0\text{s}$:** $46$ Points.
* **$6.0\text{s}$:** $11$ Points.
* **$6.5\text{s}+$:** $0$ Points (Time out penalty risk).

### Combo Multiplier System

* Consecutive correct answers increment the combo multiplier ($1\times \rightarrow 2\times \rightarrow 3\times \rightarrow 4\times \dots$).
* Total points awarded for a question = $\text{Obtainable Points } S(t) \times \text{Current Combo Multiplier}$.
* An incorrect answer immediately resets the multiplier to $1\times$.

### Difficulty Progression (Game Constraints Scaling)

> **Note on MVP Implementation:** Question pool sampling is randomized across enabled categories. Question content difficulty (metadata) is **not** filtered or moderated during the MVP run. Instead, difficulty progression scales purely through **evolving game mechanics and constraints**.

As the player survives consecutive questions in Arcade Mode, the game engine ramps up intensity based on thresholds set in `/config/difficulty.ts`:

| Question Range | Max Base Points ($M$) | Timer ($T_{\text{max}}$) | Plateau ($t_p$) | Decay Multiplier ($\alpha$) |
| --- | --- | --- | --- | --- |
| **Questions 1–5** | 100 pts | 15.0s | 1.5s | 1.5 (Gentle) |
| **Questions 6–15** | 150 pts | 10.0s | 1.0s | 2.5 (Moderate) |
| **Questions 16–30** | 200 pts | 7.0s | 0.5s | 4.0 (Aggressive) |
| **Questions 31+** | 300 pts | 5.0s | 0.2s | 6.0 (Extreme) |

*Extensibility Architecture:* Every question entity in the database retains a `difficulty_rating` column (`EASY`, `MEDIUM`, `HARD`, `EXPERT`). Future iterations can easily enable content-based difficulty filtering by reading this existing field.

---

## 8. User Interface & User Experience (UI/UX) Specifications

### UI Style Guide

* **Aesthetic:** Clean, dark/light modern arcade interface. High readability and stark contrast.
* **Anti-Patterns to Avoid:** Unnecessary glassmorphism, muddy gradients everywhere, bloated corporate "AI startup" graphics, and slow heavy transitions.
* **Micro-Interactions:** Snappy button presses, physical-feeling toggle states, and rapid color flashes (emerald green for correct, vibrant red for incorrect).

### Screen 1: Home Screen

Communication priority: **This is a fast arcade game, not an admin dashboard.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Logo] AI DETECT                                  [Level 12] [🔥 5 Days]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────────────────────────────────────────────────────────┐     │
│    │                     ⚡ PLAY ARCADE MODE                      │     │
│    └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│    ┌──────────────────────────────────────────────────────────────┐     │
│    │                     🎯 TRAINING MODE                         │     │
│    └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│    Category Filters:  [x] Images   [x] Emails   [x] Audio               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│    [📊 Analytics]          [👤 Profile]          [⚙️ Settings]       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

```

* **Header Nav:** Level Badge, Total XP Progress bar, Daily Streak Counter (🔥).
* **Primary Actions:** Large, high-contrast "Play Arcade" button and "Training Mode" button.
* **Quick Configuration:** Category checkboxes directly accessible on the main menu.
* **Secondary Nav:** Analytics, Profile, and Settings links.

### Screen 2: Gameplay UI Layout

Designed to eliminate layout jumping. Media containers are locked to a fixed aspect ratio or maximum dimensions with CSS `object-fit: contain`.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SCORE: 14,250   |   LIVES: ❤️❤️❤️   |   COMBO: 4x   |   EMAIL CATEGORY │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                 │   │
│   │                 [FIXED MEDIA CONTAINER BOX]                     │   │
│   │                 (Scaled safely via CSS contain)                 │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│     Time Left: [██████████████░░░░░] 6.2s    |  Points: 84 pts         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│        ┌─────────────────────────┐   ┌─────────────────────────┐        │
│        │        🤖 AI            │   │        👤 REAL          │        │
│        └─────────────────────────┘   └─────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘

```

* **Top HUD Bar:**
* Left: Current Run Score
* Center: Remaining Lives ($\text{❤️❤️❤️}$) & Current Combo ($4\times$)
* Right: Category Badge (`IMAGE`, `EMAIL`, `AUDIO`)


* **Center Media Section:** Fixed viewport bounding box (`height: 420px; width: 100%`). Guarantees that switching from a tall email to a wide image never causes the bottom action buttons to shift under the player's cursor.
* **Score & Timer HUD:** Real-time decreasing numbers showing obtainable points ($S(t)$) alongside a visual progress bar.
* **Bottom Action Bar:** Two oversized, high-affordance buttons: **🤖 AI** (Left) and **👤 REAL** (Right). Keyboard shortcuts supported (`Left Arrow` / `A` for AI, `Right Arrow` / `D` for Real).

---

## 9. Progress Tracking, Analytics & Progression

### Progression & XP Formulas

XP is calculated at the end of each Arcade run via `/config/xp.ts`:

$$\text{Total XP} = (\text{Correct Answers} \times \text{Base XP}) + (\text{Max Combo} \times \text{Combo Bonus}) + \text{Run Completion Bonus}$$

Level progression follows a simple curve:

$$\text{XP Required for Level } N = 100 \times N^{1.5}$$

### Daily Streak Mechanics

* Playing at least **one complete Arcade or Training game per calendar day** increments the user's daily streak counter.
* Missed days reset the counter to zero.
* Displayed prominently on the Home Screen with a fire indicator (🔥) to encourage habit formation.

### Analytics Dashboard Specifications

The Analytics screen serves as the primary educational readout, allowing users to track their improving detection intuition over time.

#### 1. Core Summary Metrics (P0 MVP Display)

* **Overall Accuracy (%):** Total correct / Total attempted.
* **Highest Arcade Score & Longest Combo:** Personal best records.
* **Average Response Time:** Speed of decision-making in seconds.
* **Games Played:** Breakdown across Arcade vs. Training.

#### 2. Detailed Performance Matrix Table

| Category | Attempts | Accuracy (%) | Avg Speed (s) | Skill Rating |
| --- | --- | --- | --- | --- |
| **AI Images** | 142 | 84% | 1.8s | Strong |
| **Scam Emails** | 98 | 62% | 4.1s | Needs Improvement |
| **Voice Audio** | 45 | 71% | 3.2s | Moderate |

#### 3. Visual Improvement Charts

Using lightweight charting (e.g., Recharts or Chart.js):

* **Accuracy Trend Line:** Overall % accuracy plotted across daily sessions over time.
* **Response Speed Trend:** Average decision speed plotted over time, visually demonstrating faster intuition.

---

## 10. Technical Architecture & System Design

### Tech Stack

* **Frontend:** React (Next.js App Router or Vite + React).
* **Language:** TypeScript (Strict mode enabled).
* **Styling:** Tailwind CSS + Framer Motion (for buttery micro-animations).
* **State Management:** React Context + Zustand (or lightweight custom store) for game engine state.
* **Backend & Auth:** Supabase Auth + Supabase Postgres Database.
* **Storage:** Supabase Storage (Public bucket for images, audio files, and email screenshots).

### Content Delivery Strategy (Speed vs. Anti-Cheat Trade-Off)

To maintain 0ms latency and meet hackathon constraints:

1. **Batch Pre-fetching:** When a run initializes, the client queries Supabase for a randomized batch of 15 questions.
2. **Client-Side Storage:** The client store holds media URLs, metadata, and the **true answer key** in memory.
3. **Instant Validation:** When the user clicks "AI" or "Real", the response is evaluated instantly against local state—no server round-trip required.
4. **Background Buffer Sync:** When the unused question count in the local store falls below 5, the engine quietly fetches another batch of 15 questions in the background.
5. **Run Submission:** Upon Game Over, the aggregated stats (Score, Questions Answered, XP, Category Breakdown) are submitted in a single payload to update database snapshots.

### Database Schema Design (Supabase Postgres)

```sql
-- 1. USERS PROFILE TABLE
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  daily_streak INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
  id TEXT PRIMARY KEY, -- 'image', 'email', 'audio'
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  grace_period_ms INTEGER DEFAULT 1500
);

-- 3. QUESTIONS / CHALLENGES TABLE
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT REFERENCES categories(id),
  media_url TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL, -- TRUE if AI/Scam, FALSE if Real
  difficulty_rating TEXT DEFAULT 'MEDIUM', -- 'EASY', 'MEDIUM', 'HARD', 'EXPERT'
  explanation_text TEXT, -- Used for Training mode / Future updates
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GAME SESSIONS TABLE
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  mode TEXT NOT NULL, -- 'ARCADE' or 'TRAINING'
  final_score INTEGER DEFAULT 0,
  max_combo INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QUESTION ATTEMPTS TABLE (For Granular Analytics)
CREATE TABLE question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id),
  user_id UUID REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

```

### Configuration-Driven Architecture Directory

Nothing gameplay-critical is hardcoded. Balance changes are made strictly by editing `/config` files.

```
/config
  ├── game.ts          # Lives count, batch size, default mode toggles
  ├── scoring.ts       # Plateau durations, decay multipliers, base points
  ├── difficulty.ts    # Escalation steps (time limits, decay acceleration)
  ├── xp.ts            # XP payout rates, level curves, streak bonuses
  ├── categories.ts    # Media type constants, grace periods
  └── ui.ts            # Animation durations, visual thresholds

```

#### Example Configuration File (`/config/scoring.ts`)

```typescript
export const SCORING_CONFIG = {
  baseMaxPoints: 100,
  plateauDurationMs: {
    image: 1500,
    email: 2000,
    audio: 5000, // Includes listening grace period
  },
  decaySeverityAlpha: 2.5,
  decayExponentBeta: 1.8,
  comboMultipliers: [1, 1.5, 2, 2.5, 3, 4, 5],
};

```

---

## 11. Code Quality & Engineering Guidelines

* **Modular Architecture:** Small, single-purpose components (`TimerBar.tsx`, `MediaContainer.tsx`, `ComboBadge.tsx`).
* **Strong Typing:** Strict TypeScript interfaces for all game states, database models, and config files. No implicit `any`.
* **Clean State Separation:** Game engine business logic (timers, score calculation, life deductions) is completely decoupled from UI rendering components via custom React hooks (`useGameEngine`, `useScoringTimer`).
* **No Magic Numbers:** Every constant (animation speed, timer length, point threshold) must be imported from the `/config` directory.

---

## 12. Long-Term Roadmap & Extensibility Matrix

The architecture established in this MVP natively supports the following post-hackathon expansions without requiring core rewrites:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            MVP FOUNDATION                                │
│  (Supabase Auth, Config-Driven Engine, Batch Prefetching, Schema Basis)  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ MULTIPLAYER &    │   │ ADVANCED MEDIA   │   │ EDUCATIONAL &    │
│ SOCIAL           │   │ & AI HINTS       │   │ ENTERPRISE       │
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ • 1v1 Battles    │   │ • Deepfake Video │   │ • Detailed AI    │
│ • Global Leader- │   │ • Fake Websites  │   │   Explanations   │
│   boards         │   │ • AI Hint        │   │ • Classroom Mode │
│ • Friends List   │   │   Generators     │   │ • Corporate Scam │
│ • Tournaments    │   │ • Custom Datasets│   │   Training Mode  │
└──────────────────┘   └──────────────────┘   └──────────────────┘

```