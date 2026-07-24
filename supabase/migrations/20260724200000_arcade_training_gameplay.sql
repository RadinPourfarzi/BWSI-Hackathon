-- Phase Two gameplay persistence.
-- A completed run, all attempts, XP, streaks, and aggregate statistics are
-- committed by one idempotent function call.

alter table public.game_sessions
  add column if not exists client_run_id uuid,
  add column if not exists end_reason text,
  add column if not exists xp_earned integer not null default 0,
  add column if not exists average_response_ms integer not null default 0,
  add column if not exists category_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists initial_lives integer,
  add column if not exists remaining_lives integer,
  add column if not exists new_high_score boolean not null default false;

alter table public.game_sessions
  drop constraint if exists game_sessions_question_counts;

alter table public.game_sessions
  add constraint game_sessions_question_counts check (
    questions_total >= 0
    and questions_completed between 0 and questions_total
    and correct_count >= 0
    and incorrect_count >= 0
    and correct_count + incorrect_count = questions_completed
  ),
  add constraint game_sessions_end_reason check (
    end_reason is null
    or end_reason in (
      'lives_depleted',
      'training_exit',
      'challenge_pool_exhausted'
    )
  ),
  add constraint game_sessions_phase_two_nonnegative check (
    xp_earned >= 0
    and average_response_ms >= 0
    and (initial_lives is null or initial_lives >= 0)
    and (remaining_lives is null or remaining_lives >= 0)
  ),
  add constraint game_sessions_category_breakdown_object check (
    jsonb_typeof(category_breakdown) = 'object'
  );

create unique index if not exists game_sessions_user_client_run_idx
  on public.game_sessions (user_id, client_run_id)
  where client_run_id is not null;

alter table public.question_attempts
  add column if not exists sequence_number integer,
  add column if not exists timed_out boolean not null default false,
  add column if not exists combo_multiplier numeric not null default 1,
  add column if not exists difficulty_step text,
  add column if not exists maximum_points integer not null default 1000,
  add column if not exists plateau_ms integer not null default 0,
  add column if not exists time_limit_ms integer not null default 30000,
  add column if not exists decay_alpha numeric not null default 0,
  add column if not exists decay_beta numeric not null default 1;

alter table public.question_attempts
  alter column selected_choice drop not null,
  drop constraint if exists question_attempts_one_per_challenge,
  drop constraint if exists question_attempts_points_range;

alter table public.question_attempts
  add constraint question_attempts_points_range check (
    obtainable_points between 0 and 10000
    and awarded_points between 0 and 40000
  ),
  add constraint question_attempts_phase_two_values check (
    (sequence_number is null or sequence_number > 0)
    and combo_multiplier between 1 and 4
    and maximum_points between 1 and 10000
    and plateau_ms between 0 and time_limit_ms
    and time_limit_ms between 1 and 120000
    and decay_alpha >= 0
    and decay_beta between 0.5 and 3
  ),
  add constraint question_attempts_timeout_choice check (
    (timed_out and selected_choice is null)
    or (not timed_out and selected_choice is not null)
  );

create unique index if not exists question_attempts_session_sequence_idx
  on public.question_attempts (session_id, sequence_number)
  where sequence_number is not null;

alter table public.user_stats
  add column if not exists longest_combo integer not null default 0;

alter table public.user_stats
  add constraint user_stats_longest_combo_nonnegative
  check (longest_combo >= 0);

create or replace function public.finalize_game_run(
  p_run_id uuid,
  p_mode public.session_mode,
  p_enabled_categories text[],
  p_attempts jsonb,
  p_summary jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_session public.game_sessions%rowtype;
  new_session_id uuid;
  stats_row public.user_stats%rowtype;
  attempt_record record;
  challenge_record record;
  enabled_category_ids uuid[];
  enabled_category_count integer;
  attempt_count integer;
  attempt_sequence integer;
  attempt_challenge_id uuid;
  selected_choice public.binary_choice;
  selected_choice_text text;
  timed_out boolean;
  response_ms integer;
  submitted_obtainable integer;
  submitted_awarded integer;
  submitted_combo_before integer;
  submitted_combo_after integer;
  submitted_combo_multiplier numeric;
  submitted_maximum_points integer;
  submitted_plateau_ms integer;
  submitted_time_limit_ms integer;
  submitted_decay_alpha numeric;
  submitted_decay_beta numeric;
  submitted_step text;
  expected_combo_before integer := 0;
  expected_combo_after integer;
  expected_combo_multiplier integer;
  expected_maximum_points integer;
  expected_plateau_ms integer;
  expected_time_limit_ms integer;
  expected_obtainable integer;
  expected_awarded integer;
  expected_step text;
  base_plateau_ms integer;
  base_time_limit_ms integer;
  time_multiplier numeric;
  plateau_multiplier numeric;
  maximum_points_multiplier numeric;
  expected_decay_alpha double precision;
  expected_decay_beta double precision;
  correct boolean;
  score_total integer := 0;
  correct_total integer := 0;
  incorrect_total integer := 0;
  timeout_total integer := 0;
  response_total bigint := 0;
  average_response integer := 0;
  longest_combo_value integer := 0;
  remaining_lives_value integer;
  end_reason_value text;
  category_breakdown_value jsonb := '{}'::jsonb;
  category_accuracy_value jsonb := '{}'::jsonb;
  answer_xp integer;
  completion_xp integer;
  perfect_xp integer := 0;
  daily_xp integer := 0;
  total_xp_gain integer;
  new_xp integer;
  today_exists boolean := false;
  previous_activity_date date;
  new_current_streak integer;
  new_longest_streak integer;
  is_new_high_score boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_run_id is null then
    raise exception 'Run identifier is required';
  end if;

  if p_mode is null then
    raise exception 'Run mode is required';
  end if;

  if p_enabled_categories is null
    or cardinality(p_enabled_categories) not between 1 and 3 then
    raise exception 'Select between one and three categories';
  end if;

  if p_attempts is null
    or p_summary is null
    or jsonb_typeof(p_attempts) <> 'array'
    or jsonb_typeof(p_summary) <> 'object' then
    raise exception 'Run payload is invalid';
  end if;

  attempt_count := jsonb_array_length(p_attempts);
  if attempt_count > 500 then
    raise exception 'Run contains too many attempts';
  end if;

  if p_mode = 'arcade' and attempt_count = 0 then
    raise exception 'An arcade run must contain an attempt';
  end if;

  end_reason_value := p_summary ->> 'endReason';
  if end_reason_value is null
    or end_reason_value not in (
    'lives_depleted',
    'training_exit',
    'challenge_pool_exhausted'
  ) then
    raise exception 'Run end reason is invalid';
  end if;

  if (p_mode = 'arcade' and end_reason_value = 'training_exit')
    or (p_mode = 'training' and end_reason_value = 'lives_depleted') then
    raise exception 'Run end reason does not match its mode';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':' || p_run_id::text,
      0
    )
  );

  select *
  into existing_session
  from public.game_sessions
  where user_id = current_user_id and client_run_id = p_run_id;

  if found then
    select current_streak
    into new_current_streak
    from public.user_stats
    where user_id = current_user_id;

    return jsonb_build_object(
      'sessionId', existing_session.id,
      'score', existing_session.score,
      'xpEarned', existing_session.xp_earned,
      'currentStreak', coalesce(new_current_streak, 0),
      'isNewHighScore', existing_session.new_high_score,
      'duplicate', true
    );
  end if;

  select
    array_agg(category.id order by category.sort_order),
    count(distinct category.slug)
  into enabled_category_ids, enabled_category_count
  from public.categories as category
  where category.active and category.slug = any(p_enabled_categories);

  if enabled_category_count <> cardinality(p_enabled_categories) then
    raise exception 'One or more categories are unavailable';
  end if;

  insert into public.user_stats (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select *
  into stats_row
  from public.user_stats
  where user_id = current_user_id
  for update;

  insert into public.game_sessions (
    user_id,
    mode,
    status,
    questions_total,
    enabled_category_ids,
    client_run_id,
    end_reason,
    initial_lives,
    remaining_lives
  )
  values (
    current_user_id,
    p_mode,
    'active',
    attempt_count,
    enabled_category_ids,
    p_run_id,
    end_reason_value,
    case when p_mode = 'arcade' then 3 else null end,
    case when p_mode = 'arcade' then 3 else null end
  )
  returning id into new_session_id;

  for attempt_record in
    select value as payload, ordinality::integer as sequence
    from jsonb_array_elements(p_attempts) with ordinality
  loop
    if jsonb_typeof(attempt_record.payload) <> 'object' then
      raise exception 'Attempt payload is invalid';
    end if;

    attempt_sequence := attempt_record.sequence;
    if coalesce(
      (attempt_record.payload ->> 'sequence')::integer,
      attempt_sequence
    ) <> attempt_sequence then
      raise exception 'Attempt sequence is invalid';
    end if;

    if p_mode = 'arcade' and incorrect_total >= 3 then
      raise exception 'Arcade attempts continued after lives were depleted';
    end if;

    attempt_challenge_id :=
      (attempt_record.payload ->> 'challengeId')::uuid;
    selected_choice_text := attempt_record.payload ->> 'selectedChoice';
    timed_out := coalesce(
      (attempt_record.payload ->> 'timedOut')::boolean,
      false
    );
    response_ms := (attempt_record.payload ->> 'responseMs')::integer;
    submitted_obtainable :=
      (attempt_record.payload ->> 'obtainablePoints')::integer;
    submitted_awarded :=
      (attempt_record.payload ->> 'awardedPoints')::integer;
    submitted_combo_before :=
      (attempt_record.payload ->> 'comboBefore')::integer;
    submitted_combo_after :=
      (attempt_record.payload ->> 'comboAfter')::integer;
    submitted_combo_multiplier :=
      (attempt_record.payload ->> 'comboMultiplier')::numeric;
    submitted_step := attempt_record.payload ->> 'difficultyStepId';
    submitted_maximum_points :=
      (attempt_record.payload ->> 'maximumPoints')::integer;
    submitted_plateau_ms :=
      (attempt_record.payload ->> 'plateauMs')::integer;
    submitted_time_limit_ms :=
      (attempt_record.payload ->> 'timeLimitMs')::integer;
    submitted_decay_alpha :=
      (attempt_record.payload ->> 'decayAlpha')::numeric;
    submitted_decay_beta :=
      (attempt_record.payload ->> 'decayBeta')::numeric;

    if not (attempt_record.payload ? 'timedOut')
      or response_ms is null
      or submitted_obtainable is null
      or submitted_awarded is null
      or submitted_combo_before is null
      or submitted_combo_after is null
      or submitted_combo_multiplier is null
      or submitted_maximum_points is null
      or submitted_plateau_ms is null
      or submitted_time_limit_ms is null
      or submitted_decay_alpha is null
      or submitted_decay_beta is null
      or submitted_step is null then
      raise exception 'Attempt fields are incomplete';
    end if;

    if timed_out then
      if selected_choice_text is not null then
        raise exception 'Timed-out attempts cannot include a choice';
      end if;
      selected_choice := null;
    else
      if selected_choice_text is null
        or selected_choice_text not in ('option_a', 'option_b') then
        raise exception 'Selected choice is invalid';
      end if;
      selected_choice := selected_choice_text::public.binary_choice;
    end if;

    select
      challenge.*,
      category.slug as category_slug
    into challenge_record
    from public.challenges as challenge
    join public.categories as category on category.id = challenge.category_id
    where challenge.id = attempt_challenge_id
      and challenge.active
      and challenge.category_id = any(enabled_category_ids);

    if not found then
      raise exception 'Challenge is unavailable for this run';
    end if;

    if (attempt_record.payload ->> 'category')
      is distinct from challenge_record.category_slug then
      raise exception 'Challenge category does not match';
    end if;

    if attempt_sequence >= 21 then
      expected_step := 'expert';
      time_multiplier := 0.7;
      plateau_multiplier := 0.85;
      maximum_points_multiplier := 1.5;
    elsif attempt_sequence >= 13 then
      expected_step := 'specialist';
      time_multiplier := 0.8;
      plateau_multiplier := 0.9;
      maximum_points_multiplier := 1.3;
    elsif attempt_sequence >= 6 then
      expected_step := 'analyst';
      time_multiplier := 0.9;
      plateau_multiplier := 0.95;
      maximum_points_multiplier := 1.15;
    else
      expected_step := 'rookie';
      time_multiplier := 1;
      plateau_multiplier := 1;
      maximum_points_multiplier := 1;
    end if;

    if challenge_record.category_slug = 'image' then
      base_plateau_ms := 2250;
      base_time_limit_ms := 12000;
      expected_decay_beta := 1.3;
    elsif challenge_record.category_slug = 'email' then
      base_plateau_ms := 3000;
      base_time_limit_ms := 15000;
      expected_decay_beta := 1.25;
    elsif challenge_record.category_slug = 'voice' then
      base_plateau_ms := 5000;
      base_time_limit_ms := 18000;
      expected_decay_beta := 1.35;
    else
      raise exception 'Challenge category is unsupported';
    end if;

    expected_maximum_points :=
      round(1000 * maximum_points_multiplier)::integer;
    expected_time_limit_ms :=
      round(base_time_limit_ms * time_multiplier)::integer;
    expected_plateau_ms := least(
      expected_time_limit_ms - 1,
      round(base_plateau_ms * plateau_multiplier)::integer
    );
    expected_decay_alpha :=
      expected_maximum_points::double precision /
      pg_catalog.power(
        (expected_time_limit_ms - expected_plateau_ms)::double precision,
        expected_decay_beta
      );

    if response_ms not between 0 and expected_time_limit_ms then
      raise exception 'Response time is out of range';
    end if;

    if (timed_out and response_ms <> expected_time_limit_ms)
      or (not timed_out and response_ms >= expected_time_limit_ms) then
      raise exception 'Timeout state does not match response time';
    end if;

    if submitted_step <> expected_step
      or submitted_maximum_points <> expected_maximum_points
      or submitted_plateau_ms <> expected_plateau_ms
      or submitted_time_limit_ms <> expected_time_limit_ms
      or abs(submitted_decay_beta - expected_decay_beta::numeric) > 0.0001
      or abs(
        submitted_decay_alpha - expected_decay_alpha::numeric
      ) > 0.000001 then
      raise exception 'Question timing configuration is invalid';
    end if;

    if response_ms <= expected_plateau_ms then
      expected_obtainable := expected_maximum_points;
    else
      expected_obtainable := greatest(
        0,
        round(
          expected_maximum_points::double precision -
          expected_decay_alpha *
          pg_catalog.power(
            (response_ms - expected_plateau_ms)::double precision,
            expected_decay_beta
          )
        )::integer
      );
    end if;

    if abs(submitted_obtainable - expected_obtainable) > 1 then
      raise exception 'Obtainable score is invalid';
    end if;

    correct :=
      not timed_out and selected_choice = challenge_record.correct_choice;
    expected_combo_after :=
      case when correct then expected_combo_before + 1 else 0 end;
    expected_combo_multiplier :=
      case
        when expected_combo_after >= 10 then 4
        when expected_combo_after >= 6 then 3
        when expected_combo_after >= 3 then 2
        else 1
      end;
    expected_awarded :=
      case
        when correct
          then expected_obtainable * expected_combo_multiplier
        else 0
      end;

    if submitted_combo_before <> expected_combo_before
      or submitted_combo_after <> expected_combo_after
      or submitted_combo_multiplier <> expected_combo_multiplier
      or abs(submitted_awarded - expected_awarded) > 4 then
      raise exception 'Combo or awarded score is invalid';
    end if;

    insert into public.question_attempts (
      session_id,
      challenge_id,
      user_id,
      selected_choice,
      is_correct,
      sequence_number,
      timed_out,
      response_ms,
      obtainable_points,
      awarded_points,
      combo_before,
      combo_after,
      combo_multiplier,
      difficulty_snapshot,
      difficulty_step,
      maximum_points,
      plateau_ms,
      time_limit_ms,
      decay_alpha,
      decay_beta
    )
    values (
      new_session_id,
      attempt_challenge_id,
      current_user_id,
      selected_choice,
      correct,
      attempt_sequence,
      timed_out,
      response_ms,
      expected_obtainable,
      expected_awarded,
      expected_combo_before,
      expected_combo_after,
      expected_combo_multiplier,
      challenge_record.difficulty,
      expected_step,
      expected_maximum_points,
      expected_plateau_ms,
      expected_time_limit_ms,
      expected_decay_alpha,
      expected_decay_beta
    );

    score_total := score_total + expected_awarded;
    correct_total := correct_total + case when correct then 1 else 0 end;
    incorrect_total := incorrect_total + case when correct then 0 else 1 end;
    timeout_total := timeout_total + case when timed_out then 1 else 0 end;
    response_total := response_total + response_ms;
    longest_combo_value := greatest(
      longest_combo_value,
      expected_combo_after
    );
    expected_combo_before := expected_combo_after;
  end loop;

  if end_reason_value = 'lives_depleted' and incorrect_total <> 3 then
    raise exception 'Arcade run did not deplete all lives';
  end if;

  if coalesce((p_summary ->> 'clientScore')::integer, score_total)
    <> score_total then
    raise exception 'Run score does not match its attempts';
  end if;

  average_response :=
    case
      when attempt_count = 0 then 0
      else round(response_total::numeric / attempt_count)::integer
    end;
  remaining_lives_value :=
    case
      when p_mode = 'arcade' then greatest(0, 3 - incorrect_total)
      else null
    end;

  select coalesce(
    jsonb_object_agg(category_result.slug, category_result.performance),
    '{}'::jsonb
  )
  into category_breakdown_value
  from (
    select
      category.slug,
      jsonb_build_object(
        'answered', count(*),
        'correct', count(*) filter (where attempt.is_correct),
        'incorrect', count(*) filter (where not attempt.is_correct),
        'timedOut', count(*) filter (where attempt.timed_out),
        'score', coalesce(sum(attempt.awarded_points), 0),
        'averageResponseMs', round(avg(attempt.response_ms))::integer
      ) as performance
    from public.question_attempts as attempt
    join public.challenges as challenge on challenge.id = attempt.challenge_id
    join public.categories as category on category.id = challenge.category_id
    where attempt.session_id = new_session_id
    group by category.slug
  ) as category_result;

  select coalesce(
    jsonb_object_agg(category_result.slug, category_result.accuracy),
    '{}'::jsonb
  )
  into category_accuracy_value
  from (
    select
      category.slug,
      round(
        100.0 * count(*) filter (where attempt.is_correct) /
        nullif(count(*), 0),
        2
      ) as accuracy
    from public.question_attempts as attempt
    join public.challenges as challenge on challenge.id = attempt.challenge_id
    join public.categories as category on category.id = challenge.category_id
    where attempt.user_id = current_user_id
    group by category.slug
  ) as category_result;

  answer_xp := correct_total * 20 + incorrect_total * 4;
  completion_xp :=
    case
      when attempt_count = 0 then 0
      when p_mode = 'arcade' then 80
      else 40
    end;
  if p_mode = 'arcade'
    and attempt_count > 0
    and correct_total = attempt_count then
    perfect_xp := 120;
  end if;

  if attempt_count > 0 then
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
  else
    new_current_streak := stats_row.current_streak;
  end if;

  new_longest_streak := greatest(
    stats_row.longest_streak,
    new_current_streak
  );
  total_xp_gain := answer_xp + completion_xp + perfect_xp + daily_xp;
  new_xp := stats_row.total_xp + total_xp_gain;
  is_new_high_score :=
    p_mode = 'arcade' and score_total > stats_row.best_score;

  update public.game_sessions
  set
    status = 'completed',
    score = score_total,
    questions_completed = attempt_count,
    correct_count = correct_total,
    incorrect_count = incorrect_total,
    max_combo = longest_combo_value,
    end_reason = end_reason_value,
    xp_earned = total_xp_gain,
    average_response_ms = average_response,
    category_breakdown = category_breakdown_value,
    remaining_lives = remaining_lives_value,
    new_high_score = is_new_high_score,
    completed_at = now()
  where id = new_session_id;

  if attempt_count > 0 then
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
      total_xp_gain
    )
    on conflict (user_id, activity_date)
    do update set
      completed_sessions = public.daily_streaks.completed_sessions + 1,
      xp_earned = public.daily_streaks.xp_earned + excluded.xp_earned;
  end if;

  update public.user_stats
  set
    total_xp = new_xp,
    level = public.level_for_xp(new_xp),
    games_played = games_played + 1,
    correct_attempts = correct_attempts + correct_total,
    total_attempts = total_attempts + attempt_count,
    best_score = case
      when p_mode = 'arcade' then greatest(best_score, score_total)
      else best_score
    end,
    current_streak = new_current_streak,
    longest_streak = new_longest_streak,
    longest_combo = greatest(longest_combo, longest_combo_value),
    category_accuracy = category_accuracy_value,
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
    new_session_id,
    'session_complete',
    total_xp_gain,
    new_xp,
    jsonb_build_object(
      'answer_xp', answer_xp,
      'completion_xp', completion_xp,
      'perfect_bonus', perfect_xp,
      'daily_bonus', daily_xp,
      'timed_out', timeout_total
    )
  );

  return jsonb_build_object(
    'sessionId', new_session_id,
    'score', score_total,
    'xpEarned', total_xp_gain,
    'currentStreak', new_current_streak,
    'isNewHighScore', is_new_high_score,
    'duplicate', false
  );
end
$$;

revoke all on function public.finalize_game_run(
  uuid,
  public.session_mode,
  text[],
  jsonb,
  jsonb
) from public, anon;

grant execute on function public.finalize_game_run(
  uuid,
  public.session_mode,
  text[],
  jsonb,
  jsonb
) to authenticated;
