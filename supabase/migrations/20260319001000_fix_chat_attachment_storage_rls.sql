-- Fix chat attachment storage RLS to use session-based authorization
-- This avoids brittle dependency on folder[1] matching auth.jwt()->>'sub'

DROP POLICY IF EXISTS "Chat attachments upload by owner" ON storage.objects;
CREATE POLICY "Chat attachments upload by session participants"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
      AND (
        cs.participant_1_id = auth.jwt() ->> 'sub'
        OR cs.participant_2_id = auth.jwt() ->> 'sub'
      )
  )
);

DROP POLICY IF EXISTS "Chat attachments update by owner" ON storage.objects;
CREATE POLICY "Chat attachments update by session participants"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
      AND (
        cs.participant_1_id = auth.jwt() ->> 'sub'
        OR cs.participant_2_id = auth.jwt() ->> 'sub'
      )
  )
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
      AND (
        cs.participant_1_id = auth.jwt() ->> 'sub'
        OR cs.participant_2_id = auth.jwt() ->> 'sub'
      )
  )
);

DROP POLICY IF EXISTS "Chat attachments delete by owner" ON storage.objects;
CREATE POLICY "Chat attachments delete by session participants"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
      AND (
        cs.participant_1_id = auth.jwt() ->> 'sub'
        OR cs.participant_2_id = auth.jwt() ->> 'sub'
      )
  )
);
