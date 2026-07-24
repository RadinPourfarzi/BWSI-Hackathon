-- Bot Or Not — placeholder question seed (development).
-- Mirrors src/lib/dummyQuestions.ts. Idempotent via metadata->>'seedId'.
-- Replace with a real labeled dataset before launch; the is_ai labels here are arbitrary.

INSERT INTO questions (category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata)
SELECT category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata::jsonb
FROM (VALUES
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
    mediaUrl: 'http://localhost:3000/dataset/images/Real/real.jpg',
    isAi: false,
    difficultyRating: 'MEDIUM',
    explanationText: 'Asymmetric earrings and warped background text hint at generation.',
    metadata: { kind: 'image', altText: 'Portrait of a person' },
  },
  {
    id: 'img-002',
    categoryId: 'image',
    mediaUrl: 'http://localhost:3000/dataset/images/Ai/ai.jpg',
    isAi: true,
    difficultyRating: 'EASY',
    explanationText: 'Consistent lighting and natural reflections; authentic photo.',
    metadata: { kind: 'image', altText: 'Street scene' },
  },
  {
    id: 'img-003',
    categoryId: 'image',
    mediaUrl: 'http://localhost:3000/dataset/images/Real/real1.jpg',
    isAi: false,
    difficultyRating: 'HARD',
    explanationText: 'Look for extra fingers and inconsistent shadow directions.',
    metadata: { kind: 'image', altText: 'Group of people' },
  },
  {
    id: 'img-004',
    categoryId: 'image',
    mediaUrl: 'http://localhost:3000/dataset/images/Real/real2.jpg',
    isAi: false,
    difficultyRating: 'MEDIUM',
    explanationText: 'Fine texture detail and depth-of-field consistent with a real camera.',
    metadata: { kind: 'image', altText: 'Landscape' },
  },
  {
    id: 'img-005',
    categoryId: 'image',
    mediaUrl: 'http://localhost:3000/dataset/images/Ai/ai1.jpg',
    isAi: true,
    difficultyRating: 'EXPERT',
    explanationText: 'Subtle background melting and repeated patterns indicate synthesis.',
    metadata: { kind: 'image', altText: 'Indoor scene' },
  },
  {
    id: 'img-006',
    categoryId: 'image',
    mediaUrl: 'http://localhost:3000/dataset/images/Ai/ai3.jpg',
    isAi: true,
    difficultyRating: 'EASY',
    explanationText: 'Natural imperfections and grain; authentic photo.',
    metadata: { kind: 'image', altText: 'Animal close-up' },
  },

  // --- Emails -------------------------------------------------------------
  {
    id: 'eml-001',
    categoryId: 'email',
    mediaUrl:
      '<p>Hello,</p>' +
      '<p>We noticed an unusual sign-in attempt on your PayPal account from a new device.</p>' +
      '<p>As a precaution, some account features have been temporarily restricted. Please review the activity and confirm that it was you.</p>' +
      '<p><a href="https://paypal-account-review.example/secure">Review recent activity</a></p>' +
      '<p>If you do not confirm your account within 24 hours, your ability to send and receive payments may remain limited.</p>' +
      '<p>Thank you,<br>PayPal Account Security</p>',
    isAi: true,
    difficultyRating: 'HARD',
    explanationText:
      'This is a phishing email. The sender address and linked website do not use the official paypal.com domain. The message also pressures the recipient to act within 24 hours.',
    metadata: {
      kind: 'email',
      subject: 'Please review recent activity on your account',
      senderName: 'PayPal Account Security',
      senderAddress: 'security@paypal-account-review.example',
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
    explanationText:
      'Known sender, no urgency, and no suspicious links; this is a legitimate message.',
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
      '<p>Hi Jordan,</p>' +
      '<p>Your Microsoft 365 password is scheduled to expire today. To avoid interruptions to Outlook and Teams, confirm your current sign-in before the end of the day.</p>' +
      '<p><a href="https://microsoft-security-check.example/session">Confirm account access</a></p>' +
      '<p>If you recently updated your password, no further action is required.</p>' +
      '<p>Microsoft 365 Support</p>',
    isAi: true,
    difficultyRating: 'HARD',
    explanationText:
      'This is phishing. The message imitates a routine password-expiration notice, but the link and sender do not use an official microsoft.com domain. The same-day deadline adds pressure.',
    metadata: {
      kind: 'email',
      subject: 'Action required: Password expiration notice',
      senderName: 'Microsoft 365 Support',
      senderAddress: 'account-notice@microsoft365-security.example',
      bodyFormat: 'html',
    },
  },

  {
    id: 'eml-007',
    categoryId: 'email',
    mediaUrl:
      '<p>Hi Ethan,</p>' +
      '<p>This is a reminder that your appointment with Dr. Patel is scheduled for Monday, July 27 at 2:30 PM.</p>' +
      '<p>Please arrive 15 minutes early and bring your insurance card and photo ID.</p>' +
      '<p>To reschedule, call the number listed on the clinic website.</p>' +
      '<p>Best,<br>Bayview Medical Group</p>',
    isAi: false,
    difficultyRating: 'HARD',
    explanationText:
      'This is legitimate. It provides appointment information but does not ask the recipient to click a link, send credentials, or make a payment. It directs the recipient to independently contact the clinic.',
    metadata: {
      kind: 'email',
      subject: 'Appointment reminder for July 27',
      senderName: 'Bayview Medical Group',
      senderAddress: 'appointments@bayviewmedical.org',
      bodyFormat: 'html',
    },
  },

  {
    id: 'eml-008',
    categoryId: 'email',
    mediaUrl:
      '<p>Hi team,</p>' +
      '<p>I moved tomorrow&apos;s design review from 10:00 AM to 10:30 AM so that Priya can attend.</p>' +
      '<p>The meeting location and video link in the calendar invitation have not changed.</p>' +
      '<p>Please add comments to the existing design document before the meeting.</p>' +
      '<p>Thanks,<br>Marcus</p>',
    isAi: false,
    difficultyRating: 'HARD',
    explanationText:
      'This is legitimate. It refers to an existing calendar event and document without supplying a new login link, attachment, payment request, or urgent account warning.',
    metadata: {
      kind: 'email',
      subject: 'Design review moved to 10:30 AM',
      senderName: 'Marcus Lee',
      senderAddress: 'marcus.lee@northwindlabs.com',
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
    explanationText:
      'Classic CEO fraud: urgency, gift cards, and the claim that the sender cannot call.',
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

WHERE NOT EXISTS (
  SELECT 1 FROM questions q WHERE q.metadata->>'seedId' = (v.metadata::jsonb)->>'seedId'
);
