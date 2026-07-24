-- Local/demo content. Replace it with curated and reviewed media before launch.
INSERT INTO questions (
  id,
  category_id,
  media_url,
  is_ai,
  difficulty_rating,
  explanation_text,
  metadata
)
VALUES
  (
    '61111111-1111-4111-8111-111111111111',
    'email',
    'email/placeholder.png',
    TRUE,
    'MEDIUM',
    'The domain uses the digit 1 in paypa1 and the message manufactures urgency.',
    '{
      "kind": "email",
      "subject": "Your account has been limited",
      "senderName": "PayPal Support Team",
      "senderAddress": "service@paypa1-support.com",
      "bodyFormat": "text",
      "bodyText": "We detected unusual activity. Verify within 24 hours or your account will be suspended."
    }'::JSONB
  ),
  (
    '64444444-4444-4444-8444-444444444444',
    'email',
    'email/placeholder.png',
    FALSE,
    'EASY',
    'A receipt from the correct domain that asks for no information.',
    '{
      "kind": "email",
      "subject": "Your Thursday afternoon trip",
      "senderName": "Uber Receipts",
      "senderAddress": "receipts@uber.com",
      "bodyFormat": "text",
      "bodyText": "Thanks for riding. Total: $14.62 charged to Visa ending 4242."
    }'::JSONB
  )
ON CONFLICT (id) DO NOTHING;
