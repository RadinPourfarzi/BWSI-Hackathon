-- Bot Or Not — placeholder question seed (development).
-- Mirrors src/lib/dummyQuestions.ts. Idempotent via metadata->>'seedId'.
-- Replace with a real labeled dataset before launch; the is_ai labels here are arbitrary.

INSERT INTO questions (category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata)
SELECT category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata::jsonb
FROM (VALUES
  -- Images -----------------------------------------------------------------
  ('image', 'https://picsum.photos/seed/aidetect-img-001/800/600', true,  'MEDIUM',
   'Asymmetric earrings and warped background text hint at generation.',
   '{"kind":"image","altText":"Portrait of a person","seedId":"img-001"}'),
  ('image', 'https://picsum.photos/seed/aidetect-img-002/800/600', false, 'EASY',
   'Consistent lighting and natural reflections; authentic photo.',
   '{"kind":"image","altText":"Street scene","seedId":"img-002"}'),
  ('image', 'https://picsum.photos/seed/aidetect-img-003/800/600', true,  'HARD',
   'Look for extra fingers and inconsistent shadow directions.',
   '{"kind":"image","altText":"Group of people","seedId":"img-003"}'),
  ('image', 'https://picsum.photos/seed/aidetect-img-004/800/600', false, 'MEDIUM',
   'Fine texture detail and depth-of-field consistent with a real camera.',
   '{"kind":"image","altText":"Landscape","seedId":"img-004"}'),
  ('image', 'https://picsum.photos/seed/aidetect-img-005/800/600', true,  'EXPERT',
   'Subtle background melting and repeated patterns indicate synthesis.',
   '{"kind":"image","altText":"Indoor scene","seedId":"img-005"}'),
  ('image', 'https://picsum.photos/seed/aidetect-img-006/800/600', false, 'EASY',
   'Natural imperfections and grain; authentic photo.',
   '{"kind":"image","altText":"Animal close-up","seedId":"img-006"}'),

  -- Emails (media_url holds the sanitized HTML body) -----------------------
  ('email', '<p>Dear customer, your account has been <b>limited</b>. Verify within 24 hours at <a href="http://paypa1-support.com/verify">paypa1-support.com</a> to avoid suspension.</p>',
   true, 'HARD',
   'Look-alike domain (digit 1 in "paypa1"), urgency, and a mismatched link.',
   '{"kind":"email","subject":"Your account is limited","senderName":"PayPal Support","senderAddress":"service@paypa1-support.com","bodyFormat":"html","seedId":"eml-001"}'),
  ('email', '<p>Hi Jordan, attaching the Q3 report we discussed. Let me know if you want changes before Friday. Thanks!</p>',
   false, 'EASY',
   'Known sender, no urgency, no suspicious links; legitimate message.',
   '{"kind":"email","subject":"Q3 report draft","senderName":"Alex Rivera","senderAddress":"alex.rivera@company.com","bodyFormat":"html","seedId":"eml-002"}'),
  ('email', '<p>Congratulations! You have been selected to receive a $1,000 gift card. Click <a href="http://bit.ly/claim-now">here</a> and enter your card details to claim.</p>',
   true, 'MEDIUM',
   'Unsolicited prize, shortened link, and a request for card details.',
   '{"kind":"email","subject":"You won a $1,000 gift card!","senderName":"Rewards Center","senderAddress":"no-reply@rewards-center-intl.net","bodyFormat":"html","seedId":"eml-003"}'),
  ('email', '<p>Your package DHL-4839201 could not be delivered. Update your address and pay a $1.99 redelivery fee at <a href="http://dhl-redelivery.info">dhl-redelivery.info</a>.</p>',
   true, 'MEDIUM',
   'Small fee lure, unofficial domain, and pressure to act on a delivery.',
   '{"kind":"email","subject":"Delivery failed — action required","senderName":"DHL Express","senderAddress":"notice@dhl-redelivery.info","bodyFormat":"html","seedId":"eml-004"}'),
  ('email', '<p>Hi team, reminder that the office will be closed Monday for the holiday. Enjoy the long weekend!</p>',
   false, 'EASY',
   'Internal announcement, no links or requests; legitimate.',
   '{"kind":"email","subject":"Office closed Monday","senderName":"HR Team","senderAddress":"hr@company.com","bodyFormat":"html","seedId":"eml-005"}'),
  ('email', '<p>URGENT: I need you to purchase five $100 gift cards for a client and send the codes ASAP. I am in a meeting and cannot call. — Sent from my iPhone</p>',
   true, 'HARD',
   'Classic CEO-fraud: urgency, gift cards, and "cannot call" excuse.',
   '{"kind":"email","subject":"Quick favor","senderName":"CEO","senderAddress":"ceo.office@company-secure-mail.com","bodyFormat":"html","seedId":"eml-006"}'),

  -- Audio ------------------------------------------------------------------
  ('audio', 'https://cdn.example.com/audio/aidetect-aud-001.mp3', true,  'HARD',
   'Flat prosody and unnatural breaths suggest a synthetic voice.',
   '{"kind":"audio","durationMs":8200,"transcript":"Hi, this is your bank calling…","seedId":"aud-001"}'),
  ('audio', 'https://cdn.example.com/audio/aidetect-aud-002.mp3', false, 'EASY',
   'Natural pacing, breaths, and room tone; authentic recording.',
   '{"kind":"audio","durationMs":6400,"transcript":"Hey, just calling to check in.","seedId":"aud-002"}'),
  ('audio', 'https://cdn.example.com/audio/aidetect-aud-003.mp3', true,  'EXPERT',
   'Slight metallic artifacts on sibilants indicate voice cloning.',
   '{"kind":"audio","durationMs":9100,"transcript":"Please confirm your PIN to proceed.","seedId":"aud-003"}'),
  ('audio', 'https://cdn.example.com/audio/aidetect-aud-004.mp3', false, 'MEDIUM',
   'Consistent background ambience and natural intonation; real voice.',
   '{"kind":"audio","durationMs":7300,"transcript":"The meeting moved to three o''clock.","seedId":"aud-004"}'),
  ('audio', 'https://cdn.example.com/audio/aidetect-aud-005.mp3', true,  'MEDIUM',
   'Overly smooth cadence with no natural hesitation; likely synthetic.',
   '{"kind":"audio","durationMs":8800,"transcript":"Your account needs verification now.","seedId":"aud-005"}'),
  ('audio', 'https://cdn.example.com/audio/aidetect-aud-006.mp3', false, 'HARD',
   'Micro-variations in pitch and timing consistent with a human speaker.',
   '{"kind":"audio","durationMs":7000,"transcript":"Can you send me that file again?","seedId":"aud-006"}')
) AS v(category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM questions q WHERE q.metadata->>'seedId' = (v.metadata::jsonb)->>'seedId'
);
