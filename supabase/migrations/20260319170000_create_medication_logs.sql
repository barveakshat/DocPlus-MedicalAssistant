-- Medication dose logs for adherence tracking
create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  prescription_id text not null,
  patient_user_id text not null,
  taken_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.medication_logs enable row level security;

create policy "Anyone authenticated can manage medication_logs"
  on public.medication_logs
  for all
  to authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.medication_logs;
