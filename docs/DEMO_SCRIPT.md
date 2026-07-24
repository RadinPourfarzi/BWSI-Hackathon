# Bot or Not demo script

Target length: 3–5 minutes.

## 1. Authentication — 30 seconds

“Bot or Not is a game that teaches practical AI and scam detection. Every
player signs in so XP, accuracy, streaks, and settings have a secure owner.”

Sign in with the prepared demo account. Mention that confirmation, password
recovery, safe callback redirects, server route protection, and secure sign-out
are built in.

## 2. Home and progression — 30 seconds

Show the prominent **Start Arcade** button, Training, Analytics, Profile, and
Settings. Point out the level, XP progress bar, daily streak, and high score.

“A completed game awards answer XP and completion bonuses. The database uses
the run ID as an idempotency key, so retrying a save cannot award XP twice.”

## 3. Arcade and category selection — 75 seconds

Open Arcade and select Images, Email, and Voice.

“Every category uses the same binary engine, but labels and renderers are
configuration-driven. Image and voice use AI versus Real; email uses Scam
versus Legitimate.”

Answer one of each challenge type:

- Image: show fixed media dimensions, loading/error behavior, and attribution.
- Email: explain that the message is sanitized plain text, never executable
  HTML, links, forms, scripts, or trackers.
- Audio: show native controls, replay, buffering state, and cleanup.

Point out the countdown, obtainable-score decay, lives, and combo multiplier.
Use A/D, arrow keys, or 1/2 once to demonstrate keyboard access.

## 4. Game over, XP, and analytics — 60 seconds

Reach game over or use the prepared completed run. Show score, accuracy,
response time, longest combo, category breakdown, XP earned, high-score status,
and save confirmation.

Open Analytics.

“These metrics use real completed sessions. The server returns complete summary
aggregates plus only the latest 120 sessions for trends. Charts show dates,
sample sizes, empty states, and screen-reader tables.”

Show overall/category accuracy, mode totals, strongest and most difficult
categories, response-time trend, and rolling Arcade score.

## 5. Training, settings, and extensibility — 45 seconds

Open Training, answer one challenge, read the explanation and signal tags, then
finish the run.

Open Settings and change one preference. Mention account-backed defaults,
local caching, reduced motion, sound volume, keyboard hints, and confirmation
before abandoning a live run.

Close with:

“New challenge types plug into the payload schema and renderer registry while
scoring, XP, sessions, analytics, RLS, and retry behavior remain shared. That
makes Bot or Not a complete hackathon MVP and a clean foundation for ranked
play, multiplayer, classrooms, and more media types.”
