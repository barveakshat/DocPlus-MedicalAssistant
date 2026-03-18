-- Align chat attachment storage policies with current Clerk/public-chat model
-- Current chat_sessions/messages policies are public, and app does not establish Supabase auth sessions.
-- Therefore storage policies that require authenticated + auth.jwt() fail for uploads.

DROP POLICY IF EXISTS "Chat attachments upload by session participants" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments update by session participants" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments delete by session participants" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments read by session participants" ON storage.objects;

-- Allow uploads to chat-attachments when path is under a valid chat session folder:
-- path format expected: <session_id>/<filename>
CREATE POLICY "Chat attachments upload by valid session"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Chat attachments update by valid session"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Chat attachments delete by valid session"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[1]
  )
);

-- Allow reads only for files that are referenced by chat messages
CREATE POLICY "Chat attachments read if referenced by message"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.attachment_path = name
  )
);
