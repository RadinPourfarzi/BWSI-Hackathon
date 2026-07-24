-- Phase Three progression, preferences, local-day streaks, and bounded analytics.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_categories text[] not null default array['image', 'email', 'voice'],
  sound_effects boolean not null default true,
  reduced_motion text not null default 'system',
  volume integer not null default 70,
  show_keyboard_shortcuts boolean not null default true,
  confirm_abandon boolean not null default true,
  timezone_offset_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_categories check (
    cardinality(default_categories) between 1 and 3
    and default_categories <@ array['image', 'email', 'voice']::text[]
  ),
  constraint user_settings_reduced_motion check (
    reduced_motion in ('system', 'reduce', 'allow')
  ),
  constraint user_settings_volume check (volume between 0 and 100),
  constraint user_settings_timezone_offset check (
    timezone_offset_minutes between -840 and 840
  )
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.game_sessions
  add column if not exists activity_date date,
  add column if not exists timezone_offset_minutes integer;

alter table public.game_sessions
  drop constraint if exists game_sessions_timezone_offset;

alter table public.game_sessions
  add constraint game_sessions_timezone_offset check (
    timezone_offset_minutes is null
    or timezone_offset_minutes between -840 and 840
  );

update public.game_sessions
set
  activity_date = timezone('UTC', completed_at)::date,
  timezone_offset_minutes = 0
where
  status = 'completed'
  and completed_at is not null
  and activity_date is null;

create index if not exists game_sessions_user_mode_completed_idx
  on public.game_sessions (user_id, mode, completed_at desc)
  where status = 'completed';

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

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end
$$;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.user_settings enable row level security;

revoke all on table public.user_settings from anon;
grant select on table public.user_settings to authenticated;
grant insert (
  user_id,
  default_categories,
  sound_effects,
  reduced_motion,
  volume,
  show_keyboard_shortcuts,
  confirm_abandon,
  timezone_offset_minutes
) on public.user_settings to authenticated;
grant update (
  default_categories,
  sound_effects,
  reduced_motion,
  volume,
  show_keyboard_shortcuts,
  confirm_abandon,
  timezone_offset_minutes
) on public.user_settings to authenticated;

revoke update on table public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "Settings are visible to their owner"
on public.user_settings;
create policy "Settings are visible to their owner"
on public.user_settings for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Settings are created by their owner"
on public.user_settings;
create policy "Settings are created by their owner"
on public.user_settings for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Settings are editable by their owner"
on public.user_settings;
create policy "Settings are editable by their owner"
on public.user_settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.finalize_game_run_v2(
  p_run_id uuid,
  p_mode public.session_mode,
  p_enabled_categories text[],
  p_attempts jsonb,
  p_summary jsonb,
  p_timezone_offset_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  result jsonb;
  completed_session_id uuid;
  session_completed_at timestamptz;
  session_xp integer;
  session_activity_date date;
  utc_activity_date date;
  attempt_count integer := 0;
  longest_streak_value integer := 0;
  current_streak_value integer := 0;
  duplicate_submission boolean;
  local_day_existed boolean := false;
  utc_day_existed boolean := false;
  daily_bonus_adjustment integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_timezone_offset_minutes is null
    or p_timezone_offset_minutes not between -840 and 840 then
    raise exception 'Timezone offset is invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':phase-three-finalize',
      0
    )
  );

  session_activity_date := (
    timezone('UTC', transaction_timestamp())
    - make_interval(mins => p_timezone_offset_minutes)
  )::date;
  utc_activity_date := timezone('UTC', transaction_timestamp())::date;

  select
    exists (
      select 1
      from public.daily_streaks
      where
        user_id = current_user_id
        and activity_date = session_activity_date
    ),
    exists (
      select 1
      from public.daily_streaks
      where
        user_id = current_user_id
        and activity_date = utc_activity_date
    )
  into local_day_existed, utc_day_existed;

  result := public.finalize_game_run(
    p_run_id,
    p_mode,
    p_enabled_categories,
    p_attempts,
    p_summary
  );
  completed_session_id := (result ->> 'sessionId')::uuid;
  duplicate_submission := coalesce((result ->> 'duplicate')::boolean, false);
  attempt_count := jsonb_array_length(p_attempts);

  select completed_at, xp_earned, activity_date
  into session_completed_at, session_xp, session_activity_date
  from public.game_sessions
  where id = completed_session_id and user_id = current_user_id;

  if not found or session_completed_at is null then
    raise exception 'Completed session could not be verified';
  end if;

  if duplicate_submission then
    select current_streak
    into current_streak_value
    from public.user_stats
    where user_id = current_user_id;

    return result || jsonb_build_object(
      'currentStreak',
      coalesce(current_streak_value, 0)
    );
  end if;

  if session_activity_date is null then
    session_activity_date := (
      timezone('UTC', session_completed_at)
      - make_interval(mins => p_timezone_offset_minutes)
    )::date;
  end if;
  utc_activity_date := timezone('UTC', session_completed_at)::date;

  if not duplicate_submission then
    update public.user_settings
    set timezone_offset_minutes = p_timezone_offset_minutes
    where user_id = current_user_id;

    if attempt_count > 0 then
      daily_bonus_adjustment :=
        case when local_day_existed then 0 else 50 end
        - case when utc_day_existed then 0 else 50 end;
    end if;

    if daily_bonus_adjustment <> 0 then
      update public.game_sessions
      set xp_earned = xp_earned + daily_bonus_adjustment
      where id = completed_session_id
      returning xp_earned into session_xp;

      update public.user_stats
      set
        total_xp = total_xp + daily_bonus_adjustment,
        level = public.level_for_xp(total_xp + daily_bonus_adjustment),
        updated_at = now()
      where user_id = current_user_id;

      update public.xp_history
      set
        amount = amount + daily_bonus_adjustment,
        balance_after = balance_after + daily_bonus_adjustment,
        metadata = jsonb_set(
          metadata,
          '{daily_bonus}',
          to_jsonb(case when local_day_existed then 0 else 50 end)
        )
      where
        user_id = current_user_id
        and session_id = completed_session_id
        and event_type = 'session_complete';

      update public.daily_streaks
      set xp_earned = greatest(0, xp_earned + daily_bonus_adjustment)
      where
        user_id = current_user_id
        and activity_date = utc_activity_date;

      result := jsonb_set(result, '{xpEarned}', to_jsonb(session_xp));
    end if;

    update public.game_sessions
    set
      activity_date = session_activity_date,
      timezone_offset_minutes = p_timezone_offset_minutes
    where id = completed_session_id;

    if attempt_count > 0
      and session_activity_date <> utc_activity_date then
      update public.daily_streaks
      set
        completed_sessions = greatest(0, completed_sessions - 1),
        xp_earned = greatest(0, xp_earned - session_xp)
      where
        user_id = current_user_id
        and activity_date = utc_activity_date;

      delete from public.daily_streaks
      where
        user_id = current_user_id
        and activity_date = utc_activity_date
        and completed_sessions = 0;

      insert into public.daily_streaks (
        user_id,
        activity_date,
        completed_sessions,
        xp_earned
      )
      values (
        current_user_id,
        session_activity_date,
        1,
        session_xp
      )
      on conflict (user_id, activity_date)
      do update set
        completed_sessions = public.daily_streaks.completed_sessions + 1,
        xp_earned = public.daily_streaks.xp_earned + excluded.xp_earned;
    end if;
  end if;

  with streak_days as (
    select
      activity_date,
      activity_date
        - (row_number() over (order by activity_date))::integer as streak_group
    from public.daily_streaks
    where user_id = current_user_id
  ),
  streak_runs as (
    select
      max(activity_date) as end_date,
      count(*)::integer as streak_length
    from streak_days
    group by streak_group
  )
  select
    coalesce(max(streak_length), 0),
    coalesce(
      max(streak_length) filter (
        where end_date = session_activity_date
      ),
      0
    )
  into longest_streak_value, current_streak_value
  from streak_runs;

  update public.user_stats
  set
    current_streak = current_streak_value,
    longest_streak = greatest(longest_streak, longest_streak_value),
    updated_at = now()
  where user_id = current_user_id;

  insert into public.analytics_snapshots (
    user_id,
    period_start,
    period_end,
    metrics
  )
  select
    current_user_id,
    session_activity_date,
    session_activity_date,
    jsonb_build_object(
      'gamesPlayed', stats.games_played,
      'totalAttempts', stats.total_attempts,
      'correctAttempts', stats.correct_attempts,
      'totalXp', stats.total_xp,
      'level', stats.level,
      'bestScore', stats.best_score,
      'currentStreak', stats.current_streak,
      'longestStreak', stats.longest_streak
    )
  from public.user_stats as stats
  where stats.user_id = current_user_id
  on conflict (user_id, period_start, period_end)
  do update set
    metrics = excluded.metrics,
    created_at = now();

  return result || jsonb_build_object(
    'currentStreak',
    current_streak_value
  );
end
$$;

create or replace function public.get_user_analytics(
  p_session_limit integer default 120
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  bounded_limit integer := least(greatest(coalesce(p_session_limit, 120), 1), 200);
  result jsonb;
  timezone_offset integer := 0;
  local_today date;
  last_activity date;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(settings.timezone_offset_minutes, 0)
  into timezone_offset
  from public.user_settings as settings
  where settings.user_id = current_user_id;

  local_today := (
    timezone('UTC', transaction_timestamp())
    - make_interval(mins => timezone_offset)
  )::date;

  select max(activity_date)
  into last_activity
  from public.daily_streaks
  where user_id = current_user_id;

  select jsonb_build_object(
    'stats',
    coalesce(
      (
        select jsonb_build_object(
          'totalXp', stats.total_xp,
          'level', stats.level,
          'gamesPlayed', stats.games_played,
          'correctAttempts', stats.correct_attempts,
          'totalAttempts', stats.total_attempts,
          'bestScore', stats.best_score,
          'currentStreak',
            case
              when last_activity is null
                or last_activity < local_today - 1 then 0
              else stats.current_streak
            end,
          'longestStreak', stats.longest_streak,
          'longestCombo', stats.longest_combo
        )
        from public.user_stats as stats
        where stats.user_id = current_user_id
      ),
      '{}'::jsonb
    ),
    'modeSummary',
    coalesce(
      (
        select jsonb_build_object(
          'totalGames', count(*),
          'arcadeGames', count(*) filter (where mode = 'arcade'),
          'trainingGames', count(*) filter (where mode = 'training'),
          'averageArcadeScore',
            coalesce(
              round(avg(score) filter (where mode = 'arcade')),
              0
            ),
          'averageResponseMs',
            coalesce(
              round(
                avg(average_response_ms)
                  filter (where questions_completed > 0)
              ),
              0
            )
        )
        from public.game_sessions
        where
          user_id = current_user_id
          and status = 'completed'
      ),
      '{}'::jsonb
    ),
    'categories',
    coalesce(
      (
        select jsonb_object_agg(
          category_summary.slug,
          jsonb_build_object(
            'answered', category_summary.answered,
            'correct', category_summary.correct,
            'accuracy', category_summary.accuracy,
            'averageResponseMs', category_summary.average_response_ms
          )
        )
        from (
          select
            category.slug,
            count(*)::integer as answered,
            count(*) filter (where attempt.is_correct)::integer as correct,
            round(
              100.0 * count(*) filter (where attempt.is_correct)
              / nullif(count(*), 0),
              2
            ) as accuracy,
            round(avg(attempt.response_ms))::integer as average_response_ms
          from public.question_attempts as attempt
          join public.challenges as challenge
            on challenge.id = attempt.challenge_id
          join public.categories as category
            on category.id = challenge.category_id
          where attempt.user_id = current_user_id
          group by category.slug
        ) as category_summary
      ),
      '{}'::jsonb
    ),
    'sessions',
    coalesce(
      (
        select jsonb_agg(to_jsonb(recent) order by recent.completed_at)
        from (
          select
            session.id,
            session.mode,
            session.score,
            session.questions_completed,
            session.correct_count,
            session.max_combo,
            session.average_response_ms,
            session.category_breakdown,
            session.xp_earned,
            session.activity_date,
            session.completed_at
          from public.game_sessions as session
          where
            session.user_id = current_user_id
            and session.status = 'completed'
            and session.questions_completed > 0
          order by session.completed_at desc
          limit bounded_limit
        ) as recent
      ),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end
$$;

revoke all on function public.finalize_game_run(
  uuid,
  public.session_mode,
  text[],
  jsonb,
  jsonb
) from authenticated;

revoke insert on table public.game_sessions from authenticated;
drop policy if exists "Sessions are created by their owner"
on public.game_sessions;

revoke all on function public.record_attempt(
  uuid,
  uuid,
  public.binary_choice,
  integer,
  integer,
  integer,
  integer,
  integer
) from authenticated;
revoke all on function public.complete_game_session(uuid) from authenticated;

revoke all on function public.finalize_game_run_v2(
  uuid,
  public.session_mode,
  text[],
  jsonb,
  jsonb,
  integer
) from public, anon;
grant execute on function public.finalize_game_run_v2(
  uuid,
  public.session_mode,
  text[],
  jsonb,
  jsonb,
  integer
) to authenticated;

revoke all on function public.get_user_analytics(integer) from public, anon;
grant execute on function public.get_user_analytics(integer) to authenticated;

revoke all on function public.handle_new_auth_user()
from public, anon, authenticated;
revoke all on function public.set_updated_at()
from public, anon, authenticated;
