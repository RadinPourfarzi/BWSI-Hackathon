
# Bot Or Not

Bot Or Not is an educational web game that challenges players to identify real and fake digital content.

Players review images, emails, and audio clips, then decide whether each example is authentic, AI-generated, or malicious.

## Features

- Real vs. AI-generated image challenges
- Legitimate vs. phishing email challenges
- Human vs. synthetic voice challenges
- Arcade mode with scores, lives, timers, and combos
- Training mode with explanations after each answer
- Multiple difficulty levels
- Selectable challenge categories

## Built With

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Framer Motion

## Project Structure

```text
BWSI-Hackathon/
├── public/
│   └── dataset/
│       ├── images/
│       │   ├── Real/
│       │   └── Ai/
│       └── audio/
│           ├── real/
│           └── ai/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   └── play/
│   ├── categories/
│   ├── components/
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   │   └── dummyQuestions.ts
│   ├── store/
│   └── types/
├── package.json
└── README.md
