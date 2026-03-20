-- Align medication_logs RLS with Clerk-based app auth model
-- The app authenticates users with Clerk, not Supabase Auth JWTs.
-- Restricting policy to `authenticated` causes 401 for client inserts.

drop policy if exists "Anyone authenticated can manage medication_logs" on public.medication_logs;
drop policy if exists "Anyone can manage medication_logs" on public.medication_logs;

create policy "Anyone can manage medication_logs"
  on public.medication_logs
  for all
  using (true)
  with check (true);
