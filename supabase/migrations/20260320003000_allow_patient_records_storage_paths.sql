-- Allow patient records uploads/list/read/delete under:
-- chat-attachments/patient-records/<patient_id>/<filename>
--
-- Existing chat attachment policies are session-based and only allow paths
-- like <chat_session_id>/<filename>. Patient records use a different prefix,
-- so uploads were failing with 400 due to storage RLS policy mismatch.

drop policy if exists "Patient records upload" on storage.objects;
drop policy if exists "Patient records read" on storage.objects;
drop policy if exists "Patient records update" on storage.objects;
drop policy if exists "Patient records delete" on storage.objects;

create policy "Patient records upload"
on storage.objects
for insert
to public
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'patient-records'
);

create policy "Patient records read"
on storage.objects
for select
to public
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'patient-records'
);

create policy "Patient records update"
on storage.objects
for update
to public
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'patient-records'
)
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'patient-records'
);

create policy "Patient records delete"
on storage.objects
for delete
to public
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'patient-records'
);
