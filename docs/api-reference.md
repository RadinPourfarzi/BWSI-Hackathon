# API reference

All game/profile/analytics routes require a verified user. Production clients
send:

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

Mock development may use `x-user-id: <uuid>` only when
`APP_DATA_PROVIDER=mock`, `ALLOW_DEV_AUTH_HEADER=true`, and
`NODE_ENV` is not `production`.

Every response containing game state sets `Cache-Control: no-store`.

## Start game

`POST /api/game/start`

```json
{
  "mode": "ARCADE",
  "categories": ["image", "email", "audio"]
}
```

`categories` is optional; omitted or empty means every active category.

The `201` response contains a public state snapshot, public challenge, and only
the current round's timer/scoring display rules. It never contains
`correctOptionId` or the explanation.

## Submit answer

`POST /api/game/answer`

```json
{
  "sessionId": "77777777-7777-4777-8777-777777777777",
  "challengeId": "11111111-1111-4111-8111-111111111111",
  "selectedOptionId": "ai"
}
```

The client sends only its chosen option. The server returns:

```json
{
  "wasCorrect": true,
  "timedOut": false,
  "correctOptionId": "ai",
  "basePoints": 100,
  "comboMultiplier": 1,
  "pointsAwarded": 100,
  "responseTimeMs": 1042,
  "explanation": null,
  "state": {},
  "events": [
    { "type": "answer-correct", "pointsAwarded": 100 },
    { "type": "combo-increased", "combo": 1 }
  ],
  "gameEnded": false,
  "nextChallenge": {},
  "nextRoundRules": {},
  "summary": null
}
```

Training responses may contain `explanation`. Arcade responses do not.

## Reconnect or recover

`GET /api/game/session/:sessionId`

For an active game, the response reissues the same public question and does not
reset its server timestamp. For an ended state awaiting persistence, this call
retries atomic completion. For an already-persisted game, it returns the stored
summary with `state: null`.

`POST /api/game/next` with `{ "sessionId": "..." }` is a compatibility alias
matching the original architecture route list.

## End game

`POST /api/game/end`

```json
{
  "sessionId": "77777777-7777-4777-8777-777777777777"
}
```

This records an abandoned run. Correct-answer and combo XP already earned in
Arcade is preserved, but the completion bonus is withheld. Repeating the
request returns the completed result rather than adding progression twice.

## Read models

- `GET /api/profile` returns permanent player progression.
- `GET /api/analytics` returns accuracy, response time, category performance,
  daily accuracy trend, Arcade scores, combo, and leaderboard placement.
- `GET /api/leaderboard?limit=20` returns 1-100 entries.
- `GET /api/health` returns provider readiness and active config version.

## Error shape

```json
{
  "error": {
    "code": "STALE_CHALLENGE",
    "message": "The submitted challenge is not the current unanswered challenge."
  }
}
```

Validation errors also include Zod `issues`. Internal database details and
service errors are replaced by an opaque public message.

Common status codes:

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| `400`  | Invalid JSON, schema, or answer option            |
| `401`  | Missing or invalid authentication                 |
| `403`  | Session belongs to another user                   |
| `404`  | Active and completed session both absent          |
| `409`  | Stale answer, ended session, or concurrent update |
| `422`  | Selected category pool has no questions           |
| `503`  | Database/session service temporarily unavailable  |
