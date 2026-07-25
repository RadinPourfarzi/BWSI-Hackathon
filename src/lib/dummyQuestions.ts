import type { Question } from '@/types/models';

/**
 * Offline placeholder question set for engine + UI development (Phases 2–3), before the
 * Supabase `questions` table is wired in (Phase 5). Shapes match the `Question` contract
 * incl. the `isAi` answer key. Media URLs are illustrative placeholders.
 *
 * For `email` items with `bodyFormat: 'html'`, `mediaUrl` holds the sanitized HTML body.
 */
export const DUMMY_QUESTIONS: Question[] = [
  // --- Images -------------------------------------------------------------
  {
    id: 'img-001',
    categoryId: 'image',
    mediaUrl: 'https://picsum.photos/seed/aidetect-img-001/800/600',
    isAi: true,
    difficultyRating: 'MEDIUM',
    explanationText: 'Asymmetric earrings and warped background text hint at generation.',
    metadata: { kind: 'image', altText: 'Portrait of a person' },
  },
  {
    id: 'img-002',
    categoryId: 'image',
    mediaUrl: 'https://picsum.photos/seed/aidetect-img-002/800/600',
    isAi: false,
    difficultyRating: 'EASY',
    explanationText: 'Consistent lighting and natural reflections; authentic photo.',
    metadata: { kind: 'image', altText: 'Street scene' },
  },
  {
    id: 'img-003',
    categoryId: 'image',
    mediaUrl: 'https://picsum.photos/seed/aidetect-img-003/800/600',
    isAi: true,
    difficultyRating: 'HARD',
    explanationText: 'Look for extra fingers and inconsistent shadow directions.',
    metadata: { kind: 'image', altText: 'Group of people' },
  },
  {
    id: 'img-004',
    categoryId: 'image',
    mediaUrl: 'https://picsum.photos/seed/aidetect-img-004/800/600',
    isAi: false,
    difficultyRating: 'MEDIUM',
    explanationText: 'Fine texture detail and depth-of-field consistent with a real camera.',
    metadata: { kind: 'image', altText: 'Landscape' },
  },
  {
    id: 'img-005',
    categoryId: 'image',
    mediaUrl: 'https://picsum.photos/seed/aidetect-img-005/800/600',
    isAi: true,
    difficultyRating: 'EXPERT',
    explanationText: 'Subtle background melting and repeated patterns indicate synthesis.',
    metadata: { kind: 'image', altText: 'Indoor scene' },
  },
  {
    id: 'img-006',
    categoryId: 'image',
    mediaUrl: 'https://picsum.photos/seed/aidetect-img-006/800/600',
    isAi: false,
    difficultyRating: 'EASY',
    explanationText: 'Natural imperfections and grain; authentic photo.',
    metadata: { kind: 'image', altText: 'Animal close-up' },
  },

  // --- Emails -------------------------------------------------------------
  {
    id: 'eml-001',
    categoryId: 'email',
    mediaUrl:
      '<p>Dear customer, your account has been <b>limited</b>. Verify within 24 hours at ' +
      '<a href="http://paypa1-support.com/verify">paypa1-support.com</a> to avoid suspension.</p>',
    isAi: true,
    difficultyRating: 'HARD',
    explanationText: 'Look-alike domain (digit 1 in "paypa1"), urgency, and a mismatched link.',
    metadata: {
      kind: 'email',
      subject: 'Your account is limited',
      senderName: 'PayPal Support',
      senderAddress: 'service@paypa1-support.com',
      bodyFormat: 'html',
    },
  },
  {
    id: 'eml-002',
    categoryId: 'email',
    mediaUrl:
      '<p>Hi Jordan, attaching the Q3 report we discussed. Let me know if you want changes ' +
      'before Friday. Thanks!</p>',
    isAi: false,
    difficultyRating: 'EASY',
    explanationText: 'Known sender, no urgency, no suspicious links; legitimate message.',
    metadata: {
      kind: 'email',
      subject: 'Q3 report draft',
      senderName: 'Alex Rivera',
      senderAddress: 'alex.rivera@company.com',
      bodyFormat: 'html',
    },
  },
  {
    id: 'eml-003',
    categoryId: 'email',
    mediaUrl:
      '<p>Congratulations! You have been selected to receive a $1,000 gift card. ' +
      'Click <a href="http://bit.ly/claim-now">here</a> and enter your card details to claim.</p>',
    isAi: true,
    difficultyRating: 'MEDIUM',
    explanationText: 'Unsolicited prize, shortened link, and a request for card details.',
    metadata: {
      kind: 'email',
      subject: 'You won a $1,000 gift card!',
      senderName: 'Rewards Center',
      senderAddress: 'no-reply@rewards-center-intl.net',
      bodyFormat: 'html',
    },
  },
  {
    id: 'eml-004',
    categoryId: 'email',
    mediaUrl:
      '<p>Your package DHL-4839201 could not be delivered. Update your address and pay a ' +
      '$1.99 redelivery fee at <a href="http://dhl-redelivery.info">dhl-redelivery.info</a>.</p>',
    isAi: true,
    difficultyRating: 'MEDIUM',
    explanationText: 'Small fee lure, unofficial domain, and pressure to act on a delivery.',
    metadata: {
      kind: 'email',
      subject: 'Delivery failed — action required',
      senderName: 'DHL Express',
      senderAddress: 'notice@dhl-redelivery.info',
      bodyFormat: 'html',
    },
  },
  {
    id: 'eml-005',
    categoryId: 'email',
    mediaUrl:
      '<p>Hi team, reminder that the office will be closed Monday for the holiday. ' +
      'Enjoy the long weekend!</p>',
    isAi: false,
    difficultyRating: 'EASY',
    explanationText: 'Internal announcement, no links or requests; legitimate.',
    metadata: {
      kind: 'email',
      subject: 'Office closed Monday',
      senderName: 'HR Team',
      senderAddress: 'hr@company.com',
      bodyFormat: 'html',
    },
  },
  {
    id: 'eml-006',
    categoryId: 'email',
    mediaUrl:
      '<p>URGENT: I need you to purchase five $100 gift cards for a client and send the codes ' +
      'ASAP. I am in a meeting and cannot call. — Sent from my iPhone</p>',
    isAi: true,
    difficultyRating: 'HARD',
    explanationText: 'Classic CEO-fraud: urgency, gift cards, and "cannot call" excuse.',
    metadata: {
      kind: 'email',
      subject: 'Quick favor',
      senderName: 'CEO',
      senderAddress: 'ceo.office@company-secure-mail.com',
      bodyFormat: 'html',
    },
  },

  // --- Audio --------------------------------------------------------------
  {
    id: 'aud-001',
    categoryId: 'audio',
    mediaUrl: 'https://cdn.example.com/audio/aidetect-aud-001.mp3',
    isAi: true,
    difficultyRating: 'HARD',
    explanationText: 'Flat prosody and unnatural breaths suggest a synthetic voice.',
    metadata: { kind: 'audio', durationMs: 8200, transcript: 'Hi, this is your bank calling…' },
  },
  {
    id: 'aud-002',
    categoryId: 'audio',
    mediaUrl: 'https://cdn.example.com/audio/aidetect-aud-002.mp3',
    isAi: false,
    difficultyRating: 'EASY',
    explanationText: 'Natural pacing, breaths, and room tone; authentic recording.',
    metadata: { kind: 'audio', durationMs: 6400, transcript: 'Hey, just calling to check in.' },
  },
  {
    id: 'aud-003',
    categoryId: 'audio',
    mediaUrl: 'https://cdn.example.com/audio/aidetect-aud-003.mp3',
    isAi: true,
    difficultyRating: 'EXPERT',
    explanationText: 'Slight metallic artifacts on sibilants indicate voice cloning.',
    metadata: {
      kind: 'audio',
      durationMs: 9100,
      transcript: 'Please confirm your PIN to proceed.',
    },
  },
  {
    id: 'aud-004',
    categoryId: 'audio',
    mediaUrl: 'https://cdn.example.com/audio/aidetect-aud-004.mp3',
    isAi: false,
    difficultyRating: 'MEDIUM',
    explanationText: 'Consistent background ambience and natural intonation; real voice.',
    metadata: {
      kind: 'audio',
      durationMs: 7300,
      transcript: 'The meeting moved to three o’clock.',
    },
  },
  {
    id: 'aud-005',
    categoryId: 'audio',
    mediaUrl: 'https://cdn.example.com/audio/aidetect-aud-005.mp3',
    isAi: true,
    difficultyRating: 'MEDIUM',
    explanationText: 'Overly smooth cadence with no natural hesitation; likely synthetic.',
    metadata: {
      kind: 'audio',
      durationMs: 8800,
      transcript: 'Your account needs verification now.',
    },
  },
  {
    id: 'aud-006',
    categoryId: 'audio',
    mediaUrl: 'https://cdn.example.com/audio/aidetect-aud-006.mp3',
    isAi: false,
    difficultyRating: 'HARD',
    explanationText: 'Micro-variations in pitch and timing consistent with a human speaker.',
    metadata: { kind: 'audio', durationMs: 7000, transcript: 'Can you send me that file again?' },
  },
];
