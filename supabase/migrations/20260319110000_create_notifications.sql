-- In-app notification center
-- Stores notifications for doctors and patients, streamed via Supabase Realtime

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,            -- Clerk user_id of recipient
  type text not null,               -- 'new_message' | 'follow_up_reminder' | 'abnormal_lab' | 'appointment_confirmed' | 'prescription_issued' | 'medication_reminder'
  title text not null,
  body text not null,
  link text,                        -- client-side route to navigate on click e.g. '/chat'
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, is_read) where not is_read;

alter table public.notifications enable row level security;

create policy "Users can read their own notifications"
  on public.notifications for select
  using (true);

create policy "Anyone authenticated can insert notifications"
  on public.notifications for insert
  with check (true);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (true);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (true);

-- Enable realtime so the NotificationBell hook can stream new rows
alter publication supabase_realtime add table public.notifications;
