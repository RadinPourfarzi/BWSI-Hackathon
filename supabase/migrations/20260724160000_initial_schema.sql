create extension if not exists pgcrypto;

do $$
begin
  create type public.binary_choice as enum ('option_a', 'option_b');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.content_type as enum ('image', 'email', 'audio');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.difficulty_tier as enum ('easy', 'medium', 'hard');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.session_mode as enum ('arcade', 'training');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.session_status as enum ('active', 'completed', 'abandoned');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.xp_event_type as enum (
    'answer',
    'session_complete',
    'perfect_bonus',
    'daily_bonus',
    'admin_adjustment'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[A-Za-z0-9_]{3,24}$'
  ),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 2 and 40
  )
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  option_a_label text not null,
  option_b_label text not null,
  renderer_key text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z][a-z0-9_-]{1,31}$'),
  constraint categories_distinct_labels check (option_a_label <> option_b_label)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  content_type public.content_type not null,
  payload jsonb not null,
  correct_choice public.binary_choice not null,
  option_a_label text not null,
  option_b_label text not null,
  difficulty public.difficulty_tier not null,
  difficulty_metadata jsonb not null default '{}'::jsonb,
  explanation text not null,
  source_dataset text not null,
  original_source_url text not null,
  license text not null,
  attribution text not null,
  content_hash text not null unique,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint challenges_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint challenges_difficulty_metadata_object check (
    jsonb_typeof(difficulty_metadata) = 'object'
  ),
  constraint challenges_hash_sha256 check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint challenges_distinct_labels check (option_a_label <> option_b_label)
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode public.session_mode not null,
  status public.session_status not null default 'active',
  score integer not null default 0,
  questions_total integer not null,
  questions_completed integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  max_combo integer not null default 0,
  enabled_category_ids uuid[] not null default '{}'::uuid[],
  multiplayer_room_id uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sessions_score_nonnegative check (score >= 0),
  constraint game_sessions_question_counts check (
    questions_total > 0
    and questions_completed between 0 and questions_total
    and correct_count >= 0
    and incorrect_count >= 0
    and correct_count + incorrect_count = questions_completed
  ),
  constraint game_sessions_combo_nonnegative check (max_combo >= 0),
  constraint game_sessions_completion_time check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  )
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  selected_choice public.binary_choice not null,
  is_correct boolean not null,
  response_ms integer not null,
  obtainable_points integer not null,
  awarded_points integer not null,
  combo_before integer not null,
  combo_after integer not null,
  difficulty_snapshot public.difficulty_tier not null,
  created_at timestamptz not null default now(),
  constraint question_attempts_one_per_challenge unique (session_id, challenge_id),
  constraint question_attempts_response_range check (
    response_ms between 0 and 300000
  ),
  constraint question_attempts_points_range check (
    obtainable_points between 0 and 5000
    and awarded_points between 0 and obtainable_points
  ),
  constraint question_attempts_combo_range check (
    combo_before between 0 and 1000
    and combo_after between 0 and 1000
  )
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0,
  level integer not null default 1,
  games_played integer not null default 0,
  correct_attempts integer not null default 0,
  total_attempts integer not null default 0,
  best_score integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  category_accuracy jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_stats_nonnegative check (
    total_xp >= 0
    and level >= 1
    and games_played >= 0
    and correct_attempts >= 0
    and total_attempts >= correct_attempts
    and best_score >= 0
    and current_streak >= 0
    and longest_streak >= current_streak
  ),
  constraint user_stats_accuracy_object check (
    jsonb_typeof(category_accuracy) = 'object'
  )
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  created_at timestamptz not null default now(),
  constraint analytics_snapshots_period check (period_end >= period_start),
  constraint analytics_snapshots_metrics_object check (
    jsonb_typeof(metrics) = 'object'
  ),
  constraint analytics_snapshots_unique_period unique (
    user_id,
    period_start,
    period_end
  )
);

create table if not exists public.xp_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.game_sessions (id) on delete set null,
  event_type public.xp_event_type not null,
  amount integer not null,
  balance_after integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint xp_history_balance_nonnegative check (balance_after >= 0),
  constraint xp_history_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.daily_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  completed_sessions integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_streaks_unique_day unique (user_id, activity_date),
  constraint daily_streaks_nonnegative check (
    completed_sessions >= 0 and xp_earned >= 0
  )
);

create index if not exists challenges_active_category_difficulty_idx
  on public.challenges (category_id, difficulty)
  where active;
create index if not exists game_sessions_user_started_idx
  on public.game_sessions (user_id, started_at desc);
create index if not exists game_sessions_leaderboard_idx
  on public.game_sessions (score desc, completed_at asc)
  where status = 'completed';
create index if not exists game_sessions_multiplayer_room_idx
  on public.game_sessions (multiplayer_room_id)
  where multiplayer_room_id is not null;
create index if not exists question_attempts_user_created_idx
  on public.question_attempts (user_id, created_at desc);
create index if not exists question_attempts_challenge_idx
  on public.question_attempts (challenge_id);
create index if not exists xp_history_user_created_idx
  on public.xp_history (user_id, created_at desc);
create index if not exists daily_streaks_user_date_idx
  on public.daily_streaks (user_id, activity_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists challenges_set_updated_at on public.challenges;
create trigger challenges_set_updated_at
before update on public.challenges
for each row execute function public.set_updated_at();

drop trigger if exists game_sessions_set_updated_at on public.game_sessions;
create trigger game_sessions_set_updated_at
before update on public.game_sessions
for each row execute function public.set_updated_at();

drop trigger if exists daily_streaks_set_updated_at on public.daily_streaks;
create trigger daily_streaks_set_updated_at
before update on public.daily_streaks
for each row execute function public.set_updated_at();

create or replace function public.level_for_xp(total_xp integer)
returns integer
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  calculated_level integer := 1;
  next_threshold integer;
begin
  loop
    next_threshold := round(
      400 * (power(1.22, calculated_level) - 1) / 0.22
    )::integer;
    exit when total_xp < next_threshold;
    calculated_level := calculated_level + 1;
  end loop;

  return calculated_level;
end
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.record_attempt(
  p_session_id uuid,
  p_challenge_id uuid,
  p_selected_choice public.binary_choice,
  p_response_ms integer,
  p_obtainable_points integer,
  p_awarded_points integer,
  p_combo_before integer,
  p_combo_after integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_attempt public.question_attempts%rowtype;
  session_row public.game_sessions%rowtype;
  challenge_row public.challenges%rowtype;
  category_accuracy_value jsonb;
  correct boolean;
  safe_obtainable integer;
  safe_awarded integer;
  xp_gain integer;
  new_xp integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = p_session_id
  for update;

  if not found
    or session_row.user_id <> current_user_id
    or session_row.status <> 'active' then
    raise exception 'Session is not available';
  end if;

  select *
  into existing_attempt
  from public.question_attempts
  where session_id = p_session_id and challenge_id = p_challenge_id;

  if found then
    return jsonb_build_object(
      'attempt_id', existing_attempt.id,
      'duplicate', true,
      'is_correct', existing_attempt.is_correct,
      'awarded_points', existing_attempt.awarded_points
    );
  end if;

  select *
  into challenge_row
  from public.challenges
  where id = p_challenge_id and active;

  if not found then
    raise exception 'Challenge is not available';
  end if;

  if not (
    challenge_row.category_id = any(session_row.enabled_category_ids)
  ) then
    raise exception 'Challenge category is not enabled for this session';
  end if;

  correct := p_selected_choice = challenge_row.correct_choice;
  safe_obtainable := least(greatest(p_obtainable_points, 0), 5000);
  safe_awarded := case
    when correct then least(greatest(p_awarded_points, 0), safe_obtainable)
    else 0
  end;

  insert into public.question_attempts (
    session_id,
    challenge_id,
    user_id,
    selected_choice,
    is_correct,
    response_ms,
    obtainable_points,
    awarded_points,
    combo_before,
    combo_after,
    difficulty_snapshot
  )
  values (
    p_session_id,
    p_challenge_id,
    current_user_id,
    p_selected_choice,
    correct,
    least(greatest(p_response_ms, 0), 300000),
    safe_obtainable,
    safe_awarded,
    least(greatest(p_combo_before, 0), 1000),
    least(greatest(case when correct then p_combo_after else 0 end, 0), 1000),
    challenge_row.difficulty
  );

  update public.game_sessions
  set
    score = score + safe_awarded,
    questions_completed = questions_completed + 1,
    correct_count = correct_count + case when correct then 1 else 0 end,
    incorrect_count = incorrect_count + case when correct then 0 else 1 end,
    max_combo = greatest(max_combo, case when correct then p_combo_after else 0 end)
  where id = p_session_id;

  select coalesce(jsonb_object_agg(category_stats.slug, category_stats.accuracy), '{}'::jsonb)
  into category_accuracy_value
  from (
    select
      category.slug,
      round(
        100.0 * count(*) filter (where attempt.is_correct) / nullif(count(*), 0),
        2
      ) as accuracy
    from public.question_attempts as attempt
    join public.challenges as item on item.id = attempt.challenge_id
    join public.categories as category on category.id = item.category_id
    where attempt.user_id = current_user_id
    group by category.slug
  ) as category_stats;

  xp_gain := case when correct then 20 else 4 end;

  update public.user_stats
  set
    total_xp = total_xp + xp_gain,
    level = public.level_for_xp(total_xp + xp_gain),
    correct_attempts = correct_attempts + case when correct then 1 else 0 end,
    total_attempts = total_attempts + 1,
    category_accuracy = category_accuracy_value,
    updated_at = now()
  where user_id = current_user_id
  returning total_xp into new_xp;

  insert into public.xp_history (
    user_id,
    session_id,
    event_type,
    amount,
    balance_after,
    metadata
  )
  values (
    current_user_id,
    p_session_id,
    'answer',
    xp_gain,
    new_xp,
    jsonb_build_object(
      'challenge_id', p_challenge_id,
      'correct', correct
    )
  );

  return jsonb_build_object(
    'duplicate', false,
    'is_correct', correct,
    'awarded_points', safe_awarded,
    'xp_gain', xp_gain,
    'xp_balance', new_xp
  );
end
$$;

create or replace function public.complete_game_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  session_row public.game_sessions%rowtype;
  stats_row public.user_stats%rowtype;
  today_exists boolean;
  previous_activity_date date;
  session_xp integer := 80;
  perfect_xp integer := 0;
  daily_xp integer := 0;
  total_gain integer;
  new_xp integer;
  new_current_streak integer;
  new_longest_streak integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = p_session_id
  for update;

  if not found or session_row.user_id <> current_user_id then
    raise exception 'Session is not available';
  end if;

  if session_row.status = 'completed' then
    return jsonb_build_object(
      'duplicate', true,
      'score', session_row.score
    );
  end if;

  if session_row.questions_completed <> session_row.questions_total then
    raise exception 'Session still has unanswered questions';
  end if;

  select *
  into stats_row
  from public.user_stats
  where user_id = current_user_id
  for update;

  if session_row.correct_count = session_row.questions_total then
    perfect_xp := 120;
  end if;

  select exists (
    select 1
    from public.daily_streaks
    where user_id = current_user_id and activity_date = current_date
  )
  into today_exists;

  if not today_exists then
    daily_xp := 50;
  end if;

  select max(activity_date)
  into previous_activity_date
  from public.daily_streaks
  where user_id = current_user_id and activity_date < current_date;

  if today_exists then
    new_current_streak := stats_row.current_streak;
  elsif previous_activity_date = current_date - 1 then
    new_current_streak := stats_row.current_streak + 1;
  else
    new_current_streak := 1;
  end if;

  new_longest_streak := greatest(
    stats_row.longest_streak,
    new_current_streak
  );
  total_gain := session_xp + perfect_xp + daily_xp;
  new_xp := stats_row.total_xp + total_gain;

  update public.game_sessions
  set
    status = 'completed',
    completed_at = now()
  where id = p_session_id;

  insert into public.daily_streaks (
    user_id,
    activity_date,
    completed_sessions,
    xp_earned
  )
  values (
    current_user_id,
    current_date,
    1,
    total_gain
  )
  on conflict (user_id, activity_date)
  do update set
    completed_sessions = public.daily_streaks.completed_sessions + 1,
    xp_earned = public.daily_streaks.xp_earned + excluded.xp_earned;

  update public.user_stats
  set
    total_xp = new_xp,
    level = public.level_for_xp(new_xp),
    games_played = games_played + 1,
    best_score = greatest(best_score, session_row.score),
    current_streak = new_current_streak,
    longest_streak = new_longest_streak,
    updated_at = now()
  where user_id = current_user_id;

  insert into public.xp_history (
    user_id,
    session_id,
    event_type,
    amount,
    balance_after,
    metadata
  )
  values (
    current_user_id,
    p_session_id,
    'session_complete',
    total_gain,
    new_xp,
    jsonb_build_object(
      'session_xp', session_xp,
      'perfect_bonus', perfect_xp,
      'daily_bonus', daily_xp
    )
  );

  return jsonb_build_object(
    'duplicate', false,
    'score', session_row.score,
    'xp_gain', total_gain,
    'xp_balance', new_xp,
    'current_streak', new_current_streak
  );
end
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.challenges enable row level security;
alter table public.game_sessions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.user_stats enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.xp_history enable row level security;
alter table public.daily_streaks enable row level security;

revoke all on table
  public.profiles,
  public.categories,
  public.challenges,
  public.game_sessions,
  public.question_attempts,
  public.user_stats,
  public.analytics_snapshots,
  public.xp_history,
  public.daily_streaks
from anon;

grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.categories, public.challenges to authenticated;
grant select, insert on table public.game_sessions to authenticated;
grant select on table
  public.question_attempts,
  public.user_stats,
  public.analytics_snapshots,
  public.xp_history,
  public.daily_streaks
to authenticated;

drop policy if exists "Profiles are visible to their owner" on public.profiles;
create policy "Profiles are visible to their owner"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Profiles are editable by their owner" on public.profiles;
create policy "Profiles are editable by their owner"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Active categories are readable" on public.categories;
create policy "Active categories are readable"
on public.categories for select
to authenticated
using (active);

drop policy if exists "Active challenges are readable" on public.challenges;
create policy "Active challenges are readable"
on public.challenges for select
to authenticated
using (active);

drop policy if exists "Sessions are visible to their owner" on public.game_sessions;
create policy "Sessions are visible to their owner"
on public.game_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Sessions are created by their owner" on public.game_sessions;
create policy "Sessions are created by their owner"
on public.game_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Attempts are visible to their owner" on public.question_attempts;
create policy "Attempts are visible to their owner"
on public.question_attempts for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Stats are visible to their owner" on public.user_stats;
create policy "Stats are visible to their owner"
on public.user_stats for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Analytics are visible to their owner" on public.analytics_snapshots;
create policy "Analytics are visible to their owner"
on public.analytics_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "XP history is visible to its owner" on public.xp_history;
create policy "XP history is visible to its owner"
on public.xp_history for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Streaks are visible to their owner" on public.daily_streaks;
create policy "Streaks are visible to their owner"
on public.daily_streaks for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.record_attempt(
  uuid,
  uuid,
  public.binary_choice,
  integer,
  integer,
  integer,
  integer,
  integer
) from public, anon;
grant execute on function public.record_attempt(
  uuid,
  uuid,
  public.binary_choice,
  integer,
  integer,
  integer,
  integer,
  integer
) to authenticated;

revoke all on function public.complete_game_session(uuid) from public, anon;
grant execute on function public.complete_game_session(uuid) to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user()
from public, anon, authenticated;
revoke all on function public.level_for_xp(integer)
from public, anon, authenticated;

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

insert into storage.buckets (id, name, public, file_size_limit)
values ('challenge-media', 'challenge-media', false, 10485760)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Authenticated users can read challenge media" on storage.objects;
create policy "Authenticated users can read challenge media"
on storage.objects for select
to authenticated
using (bucket_id = 'challenge-media');
