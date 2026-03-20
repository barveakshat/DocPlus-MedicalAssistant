-- Doctor quick-reply templates (configurable per doctor)

create table if not exists public.doctor_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_user_id text not null,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists doctor_templates_doctor_idx on public.doctor_templates (doctor_user_id, sort_order);

alter table public.doctor_templates enable row level security;

create policy "Anyone authenticated can read doctor_templates"
  on public.doctor_templates for select using (true);

create policy "Anyone authenticated can insert doctor_templates"
  on public.doctor_templates for insert with check (true);

create policy "Anyone authenticated can update doctor_templates"
  on public.doctor_templates for update using (true);

create policy "Anyone authenticated can delete doctor_templates"
  on public.doctor_templates for delete using (true);

-- Seed default templates that will appear for all new doctors via application logic
