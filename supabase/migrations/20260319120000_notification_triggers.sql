-- Trigger: create a notification for the recipient when a new chat message is inserted

create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
as $$
declare
  v_session record;
  v_recipient_id text;
begin
  -- Get session participants
  select participant_1_id, participant_2_id
  into v_session
  from public.chat_sessions
  where id = NEW.session_id
  limit 1;

  -- Determine recipient (the other participant, not the sender)
  if v_session.participant_1_id = NEW.sender_id then
    v_recipient_id := v_session.participant_2_id;
  else
    v_recipient_id := v_session.participant_1_id;
  end if;

  -- Only insert notification if there is a valid recipient
  if v_recipient_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_recipient_id,
      'new_message',
      'New message received',
      coalesce(left(NEW.content, 100), 'You received a file attachment'),
      '/chat'
    );
  end if;

  return NEW;
end;
$$;

-- Attach trigger to messages table (only for doctor-patient chats, not AI sessions)
drop trigger if exists trg_notify_on_new_message on public.messages;
create trigger trg_notify_on_new_message
  after insert on public.messages
  for each row
  when (NEW.is_ai_message is not true)
  execute function public.notify_on_new_message();
