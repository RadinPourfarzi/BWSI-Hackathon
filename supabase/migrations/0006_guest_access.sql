-- Guest (anon) access for gameplay.
-- Guests play without an account: they need the active config and question sampling, but
-- must not persist runs. Grant execute on the read RPCs to anon (submit_run stays
-- authenticated-only) and let anon read the non-sensitive game_config balance rows.

grant execute on function public.get_active_config() to anon;
grant execute on function public.sample_questions(text[], integer, uuid[]) to anon;

create policy "game_config_read_anon"
  on public.game_config
  for select
  to anon
  using (true);
