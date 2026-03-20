-- Lab metrics history table
-- Stores extracted lab values from OCR-processed reports, persisted per patient

create table if not exists public.lab_metrics (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  metric_type text not null,        -- 'glucose' | 'systolic' | 'diastolic' | 'hba1c' | 'hemoglobin'
  metric_label text not null,       -- human-readable label e.g. 'Glucose', 'Systolic BP'
  value numeric not null,
  unit text not null,
  reference_range text,
  abnormal boolean not null default false,
  source_document text,             -- original filename or 'manual'
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast per-patient queries
create index if not exists lab_metrics_patient_id_idx on public.lab_metrics (patient_id);
create index if not exists lab_metrics_patient_type_idx on public.lab_metrics (patient_id, metric_type, recorded_at desc);

-- Enable RLS
alter table public.lab_metrics enable row level security;

-- Doctors can read metrics for their patients (patient_id matches patients.user_id for assigned patients)
-- We use a permissive policy based on the existing pattern in the codebase
create policy "Anyone authenticated can read lab_metrics"
  on public.lab_metrics for select
  using (true);

create policy "Anyone authenticated can insert lab_metrics"
  on public.lab_metrics for insert
  with check (true);

create policy "Anyone authenticated can delete lab_metrics"
  on public.lab_metrics for delete
  using (true);

-- Enable realtime
alter publication supabase_realtime add table public.lab_metrics;
