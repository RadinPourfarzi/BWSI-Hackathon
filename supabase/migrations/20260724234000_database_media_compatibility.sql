-- Make the playable catalog readable by both guests and signed-in players.
-- The project has used two catalog schemas. This migration intentionally
-- supports either `challenges` (current) or `questions` (legacy) without
-- changing write access to gameplay or profile data.

grant usage on schema public to anon, authenticated;

do $migration$
begin
  if to_regclass('public.categories') is not null then
    execute 'alter table public.categories enable row level security';
    execute 'grant select on table public.categories to anon, authenticated';
    execute 'drop policy if exists "Playable categories are publicly readable" on public.categories';

    if exists (
      select 1
      from information_schema.columns
      where
        table_schema = 'public'
        and table_name = 'categories'
        and column_name = 'active'
    ) then
      execute 'create policy "Playable categories are publicly readable"
        on public.categories for select
        to anon, authenticated
        using (active)';
    elsif exists (
      select 1
      from information_schema.columns
      where
        table_schema = 'public'
        and table_name = 'categories'
        and column_name = 'is_active'
    ) then
      execute 'create policy "Playable categories are publicly readable"
        on public.categories for select
        to anon, authenticated
        using (is_active)';
    end if;
  end if;

  if to_regclass('public.challenges') is not null then
    execute 'alter table public.challenges enable row level security';
    execute 'grant select on table public.challenges to anon, authenticated';
    execute 'drop policy if exists "Playable challenges are publicly readable" on public.challenges';
    execute 'create policy "Playable challenges are publicly readable"
      on public.challenges for select
      to anon, authenticated
      using (active)';
  end if;

  if to_regclass('public.questions') is not null then
    execute 'alter table public.questions enable row level security';
    execute 'grant select on table public.questions to anon, authenticated';
    execute 'drop policy if exists "Playable questions are publicly readable" on public.questions';
    execute 'create policy "Playable questions are publicly readable"
      on public.questions for select
      to anon, authenticated
      using (is_active)';
  end if;
end
$migration$;

grant usage on schema storage to anon, authenticated;
grant select on table storage.objects to anon, authenticated;

drop policy if exists "Challenge media is publicly readable"
on storage.objects;
create policy "Challenge media is publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('challenges', 'challenge-media'));
