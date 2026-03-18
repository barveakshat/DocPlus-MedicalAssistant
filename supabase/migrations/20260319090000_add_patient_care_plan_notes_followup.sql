alter table public.patients
  add column if not exists doctor_quick_notes text,
  add column if not exists care_plan text,
  add column if not exists follow_up_date date;
