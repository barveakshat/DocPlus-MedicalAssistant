-- Prescription management table

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  doctor_user_id text not null,
  patient_user_id text not null,
  patient_id text,                  -- patients.id for direct linking
  drug_name text not null,
  dose text not null,               -- e.g. '500mg'
  frequency text not null,          -- e.g. 'Twice daily'
  duration text not null,           -- e.g. '7 days'
  instructions text,                -- additional instructions
  status text not null default 'active',  -- 'active' | 'completed' | 'discontinued'
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prescriptions_doctor_idx on public.prescriptions (doctor_user_id);
create index if not exists prescriptions_patient_idx on public.prescriptions (patient_user_id, issued_at desc);

alter table public.prescriptions enable row level security;
create policy "Anyone authenticated can manage prescriptions"
  on public.prescriptions for all using (true) with check (true);

-- Notify patient when a new prescription is issued
create or replace function public.notify_on_new_prescription()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (
    NEW.patient_user_id,
    'prescription_issued',
    'New prescription issued',
    NEW.drug_name || ' ' || NEW.dose || ' — ' || NEW.frequency || ' for ' || NEW.duration,
    '/prescriptions'
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_new_prescription on public.prescriptions;
create trigger trg_notify_on_new_prescription
  after insert on public.prescriptions
  for each row
  execute function public.notify_on_new_prescription();

-- Enable realtime
alter publication supabase_realtime add table public.prescriptions;
