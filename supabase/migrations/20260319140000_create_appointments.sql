-- Appointment scheduling tables

-- Doctor availability slots (recurring weekly or one-off)
create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_user_id text not null,
  day_of_week integer,              -- 0=Sunday, 1=Monday, ... 6=Saturday (null = one-off date)
  specific_date date,               -- for one-off slots (null = recurring weekly)
  start_time time not null,         -- e.g. '09:00'
  end_time time not null,           -- e.g. '09:30'
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists doctor_availability_doctor_idx on public.doctor_availability (doctor_user_id);

alter table public.doctor_availability enable row level security;
create policy "Anyone authenticated can manage doctor_availability"
  on public.doctor_availability for all using (true) with check (true);

-- Appointments table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_user_id text not null,
  patient_user_id text not null,
  patient_id text,                  -- patients.id (for linking to patient record)
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  type text not null default 'phone',  -- 'in-person' | 'phone'
  status text not null default 'pending',  -- 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_doctor_idx on public.appointments (doctor_user_id, scheduled_at);
create index if not exists appointments_patient_idx on public.appointments (patient_user_id, scheduled_at);

alter table public.appointments enable row level security;
create policy "Anyone authenticated can manage appointments"
  on public.appointments for all using (true) with check (true);

-- Trigger: notify patient when appointment status changes
create or replace function public.notify_on_appointment_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.status <> OLD.status then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      NEW.patient_user_id,
      'appointment_confirmed',
      case NEW.status
        when 'confirmed' then 'Appointment confirmed'
        when 'cancelled' then 'Appointment cancelled'
        else 'Appointment updated'
      end,
      'Your appointment on ' || to_char(NEW.scheduled_at at time zone 'UTC', 'Mon DD, YYYY HH12:MI AM') || ' has been ' || NEW.status || '.',
      '/appointments'
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_appointment_status on public.appointments;
create trigger trg_notify_on_appointment_status
  after update on public.appointments
  for each row
  execute function public.notify_on_appointment_status();

-- Enable realtime
alter publication supabase_realtime add table public.appointments;
