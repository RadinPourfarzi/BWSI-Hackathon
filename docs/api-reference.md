# API reference

Supabase mode requires:

```http
Authorization: Bearer SUPABASE_ACCESS_TOKEN
```

Mock mode uses `x-user-id` only when explicitly enabled.

## Error shape

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Human-readable explanation"
  }
}
```

Important status codes:

| Status | Meaning                                       |
| ------ | --------------------------------------------- |
| 400    | Invalid JSON or request fields                |
| 401    | Missing/invalid identity                      |
| 403    | Session belongs to another user               |
| 404    | Session or eligible challenge not found       |
| 409    | Stale, duplicate, ended, or concurrent action |
| 503    | Database/session provider unavailable         |

## `GET /api/health`

Checks that the server can load active game configuration.

## `POST /api/game/start`

Request:

```json
{
  "mode": "ARCADE",
  "categories": ["image", "email", "audio"]
}
```

Response contains:

- new session ID,
- public state,
- configuration snapshot,
- first public challenge.

## `GET /api/game/session/:sessionId`

Resumes an active session after a refresh or network interruption. Returns the
current public state/config/challenge without revealing the answer.

## `POST /api/game/answer`

Request:

```json
{
  "sessionId": "uuid",
  "challengeId": "uuid",
  "selectedAnswer": "AI"
}
```

The response contains:

- authoritative correctness,
- correct answer after submission,
- Training explanation when applicable,
- awarded points,
- server response time,
- updated score/combo/lives,
- semantic UI events,
- next challenge, or final summary.

The request intentionally contains no score, correctness, combo, lives, time,
or XP fields.

## `POST /api/game/end`

Marks an active run abandoned and persists it without the run-completion XP
bonus.

```json
{
  "sessionId": "uuid"
}
```

## `GET /api/profile`

Returns the authenticated user's profile, XP, level, and streak.

## `GET /api/analytics`

Returns:

- overall attempts and accuracy,
- average response time,
- average and best Arcade scores,
- leaderboard rank,
- strongest/weakest category,
- per-category performance.

## `GET /api/leaderboard?limit=20`

Returns each player's best completed Arcade score. The limit is clamped to
1–100.
