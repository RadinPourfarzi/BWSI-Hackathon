insert into public.categories (
  slug,
  name,
  option_a_label,
  option_b_label,
  renderer_key,
  sort_order
)
values
  ('image', 'Image detection', 'AI', 'Real', 'image', 10),
  ('email', 'Email defense', 'Scam', 'Legitimate', 'email', 20),
  ('voice', 'Voice detection', 'AI', 'Real', 'voice', 30)
on conflict (slug)
do update set
  name = excluded.name,
  option_a_label = excluded.option_a_label,
  option_b_label = excluded.option_b_label,
  renderer_key = excluded.renderer_key,
  sort_order = excluded.sort_order,
  active = true;
