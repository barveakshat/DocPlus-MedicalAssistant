-- Chronic disease management programs

create table if not exists public.disease_programs (
  id uuid primary key default gen_random_uuid(),
  patient_user_id text not null,
  doctor_user_id text not null,
  program_type text not null,         -- 'diabetes' | 'hypertension' | 'custom'
  program_name text not null,
  target_metrics jsonb not null default '[]',  -- [{metric_type, target_min, target_max}]
  check_in_frequency text not null default 'daily',  -- 'daily' | 'weekly'
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disease_programs_patient_idx on public.disease_programs (patient_user_id);
create index if not exists disease_programs_doctor_idx on public.disease_programs (doctor_user_id);

alter table public.disease_programs enable row level security;
create policy "Anyone authenticated can manage disease_programs"
  on public.disease_programs for all using (true) with check (true);

-- Vital logs: patient self-reports vitals against a program
create table if not exists public.vital_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.disease_programs(id) on delete cascade,
  patient_user_id text not null,
  metric_type text not null,
  value numeric not null,
  unit text not null,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vital_logs_program_idx on public.vital_logs (program_id, logged_at desc);
create index if not exists vital_logs_patient_idx on public.vital_logs (patient_user_id, logged_at desc);

alter table public.vital_logs enable row level security;
create policy "Anyone authenticated can manage vital_logs"
  on public.vital_logs for all using (true) with check (true);

-- Notify doctor when vital log is out of range
create or replace function public.notify_on_vital_log()
returns trigger
language plpgsql
security definer
as $$
declare
  v_program record;
  v_target record;
begin
  select doctor_user_id, target_metrics into v_program
  from public.disease_programs
  where id = NEW.program_id
  limit 1;

  -- Check if value is out of target range for this metric
  select * into v_target
  from jsonb_to_recordset(v_program.target_metrics) as t(metric_type text, target_min numeric, target_max numeric)
  where t.metric_type = NEW.metric_type
  limit 1;

  if v_target is not null and (NEW.value < v_target.target_min or NEW.value > v_target.target_max) then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_program.doctor_user_id,
      'abnormal_lab',
      'Patient vital out of range',
      NEW.metric_type || ' reported as ' || NEW.value || ' ' || NEW.unit || ' (target: ' || v_target.target_min || '–' || v_target.target_max || ')',
      '/clinical-modules'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_vital_log on public.vital_logs;
create trigger trg_notify_on_vital_log
  after insert on public.vital_logs
  for each row
  execute function public.notify_on_vital_log();

alter publication supabase_realtime add table public.disease_programs;
alter publication supabase_realtime add table public.vital_logs;
