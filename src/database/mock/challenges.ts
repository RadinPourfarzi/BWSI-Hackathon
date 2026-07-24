import { DEFAULT_GAME_CONFIG } from '@/config/game.config';
import type { CategoryId, QuestionRecord } from '@/shared/types/game.types';

function optionsFor(categoryId: CategoryId) {
  return DEFAULT_GAME_CONFIG.categories[categoryId].answerOptions.map((option) => ({
    ...option,
  }));
}

export const MOCK_QUESTIONS: QuestionRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    categoryId: 'image',
    content: {
      kind: 'image',
      mediaPath: '/challenges/image/sample-01.svg',
      alt: 'Portrait of a person in warm light',
    },
    options: optionsFor('image'),
    correctOptionId: 'ai',
    difficulty: 'MEDIUM',
    explanation:
      'AI-generated: asymmetric earrings and warped background text are common diffusion artifacts.',
    active: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    categoryId: 'image',
    content: {
      kind: 'image',
      mediaPath: '/challenges/image/sample-02.svg',
      alt: 'Street scene with reflections after rain',
    },
    options: optionsFor('image'),
    correctOptionId: 'real',
    difficulty: 'EASY',
    explanation:
      'Authentic photo: lighting, shadows, and puddle reflections remain physically consistent.',
    active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    categoryId: 'image',
    content: {
      kind: 'image',
      mediaPath: '/challenges/image/sample-03.svg',
      alt: 'Hands holding a coffee cup',
    },
    options: optionsFor('image'),
    correctOptionId: 'ai',
    difficulty: 'HARD',
    explanation: 'AI-generated: the hand anatomy and finger count are inconsistent.',
    active: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    categoryId: 'image',
    content: {
      kind: 'image',
      mediaPath: '/challenges/image/sample-04.svg',
      alt: 'Mountain landscape at golden hour',
    },
    options: optionsFor('image'),
    correctOptionId: 'real',
    difficulty: 'MEDIUM',
    explanation:
      'Authentic photo: the haze gradient and ridgelines are physically plausible.',
    active: true,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    categoryId: 'image',
    content: {
      kind: 'image',
      mediaPath: '/challenges/image/sample-05.svg',
      alt: 'Crowded market stall with produce',
    },
    options: optionsFor('image'),
    correctOptionId: 'ai',
    difficulty: 'EXPERT',
    explanation:
      'AI-generated: signs contain pseudo-text and several objects merge together.',
    active: true,
  },
  {
    id: '61111111-1111-4111-8111-111111111111',
    categoryId: 'email',
    content: {
      kind: 'email',
      senderName: 'PayPal Support Team',
      senderAddress: 'service@paypa1-support.com',
      subject: 'Your account has been limited',
      body: 'We detected unusual activity. Verify within 24 hours or your account will be suspended.',
    },
    options: optionsFor('email'),
    correctOptionId: 'scam',
    difficulty: 'MEDIUM',
    explanation:
      'Scam: the domain uses the digit 1 in paypa1 and the message manufactures urgency.',
    active: true,
  },
  {
    id: '62222222-2222-4222-8222-222222222222',
    categoryId: 'email',
    content: {
      kind: 'email',
      senderName: 'GitHub',
      senderAddress: 'no-reply@github.com',
      subject: 'A personal access token was added to your account',
      body: 'If you did this, no action is needed. Otherwise, navigate to GitHub settings and review your tokens.',
    },
    options: optionsFor('email'),
    correctOptionId: 'legit',
    difficulty: 'MEDIUM',
    explanation:
      'Legitimate: the domain is correct, there is no pressure, and it tells you to navigate independently.',
    active: true,
  },
  {
    id: '63333333-3333-4333-8333-333333333333',
    categoryId: 'email',
    content: {
      kind: 'email',
      senderName: 'HR Department',
      senderAddress: 'hr-payroll@yourcompany-portal.net',
      subject: 'URGENT: Payroll update required',
      body: 'Re-enter your banking details within 24 hours to avoid a salary delay.',
    },
    options: optionsFor('email'),
    correctOptionId: 'scam',
    difficulty: 'HARD',
    explanation:
      'Scam: an external look-alike domain asks for bank details under deadline pressure.',
    active: true,
  },
  {
    id: '64444444-4444-4444-8444-444444444444',
    categoryId: 'email',
    content: {
      kind: 'email',
      senderName: 'Uber Receipts',
      senderAddress: 'receipts@uber.com',
      subject: 'Your Thursday afternoon trip',
      body: 'Thanks for riding. Total: $14.62 charged to Visa ending 4242.',
    },
    options: optionsFor('email'),
    correctOptionId: 'legit',
    difficulty: 'EASY',
    explanation:
      'Legitimate: a receipt from the correct domain that asks for no information.',
    active: true,
  },
  {
    id: '65555555-5555-4555-8555-555555555555',
    categoryId: 'email',
    content: {
      kind: 'email',
      senderName: 'Microsoft Account Team',
      senderAddress: 'security@microsoft-account-team.info',
      subject: 'Unusual sign-in activity - verify now',
      body: 'Verify within 12 hours or your account will be permanently closed.',
    },
    options: optionsFor('email'),
    correctOptionId: 'scam',
    difficulty: 'EASY',
    explanation:
      'Scam: the sender uses a third-party domain and threatens immediate account closure.',
    active: true,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    categoryId: 'email',
    content: {
      kind: 'email',
      senderName: 'Netflix Billing',
      senderAddress: 'billing@netflix.com',
      subject: 'Your payment method was declined',
      body: 'Update your payment information in Account > Billing the next time you sign in.',
    },
    options: optionsFor('email'),
    correctOptionId: 'legit',
    difficulty: 'EXPERT',
    explanation:
      'Legitimate: the domain is correct, no link is included, and the message recommends navigating in the app.',
    active: true,
  },
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    categoryId: 'audio',
    content: {
      kind: 'audio',
      mediaPath: '/challenges/audio/sample-01.wav',
      durationSeconds: 2,
    },
    options: optionsFor('audio'),
    correctOptionId: 'ai',
    difficulty: 'MEDIUM',
    explanation:
      'AI voice: flat prosody and evenly spaced breaths suggest speech synthesis.',
    active: true,
  },
  {
    id: 'a2222222-2222-4222-8222-222222222222',
    categoryId: 'audio',
    content: {
      kind: 'audio',
      mediaPath: '/challenges/audio/sample-02.wav',
      durationSeconds: 2,
    },
    options: optionsFor('audio'),
    correctOptionId: 'human',
    difficulty: 'MEDIUM',
    explanation:
      'Human voice: natural micro-hesitations and continuous room reverberation are present.',
    active: true,
  },
  {
    id: 'a3333333-3333-4333-8333-333333333333',
    categoryId: 'audio',
    content: {
      kind: 'audio',
      mediaPath: '/challenges/audio/sample-03.wav',
      durationSeconds: 2,
    },
    options: optionsFor('audio'),
    correctOptionId: 'ai',
    difficulty: 'EXPERT',
    explanation:
      'AI voice clone: the sibilants have a metallic edge common to cloning artifacts.',
    active: true,
  },
  {
    id: 'a4444444-4444-4444-8444-444444444444',
    categoryId: 'audio',
    content: {
      kind: 'audio',
      mediaPath: '/challenges/audio/sample-04.wav',
      durationSeconds: 2,
    },
    options: optionsFor('audio'),
    correctOptionId: 'human',
    difficulty: 'HARD',
    explanation:
      'Human voice: background noise and pitch drift vary continuously instead of looping.',
    active: true,
  },
];
