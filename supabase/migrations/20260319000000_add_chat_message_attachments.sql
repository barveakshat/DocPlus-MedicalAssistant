-- Add attachment support to realtime doctor-patient chat messages

-- 1) Extend messages table to support file/photo attachments
ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'file')),
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_attachment_path
  ON public.messages (attachment_path)
  WHERE attachment_path IS NOT NULL;

-- 2) Create private storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage RLS policies
DROP POLICY IF EXISTS "Chat attachments upload by owner" ON storage.objects;
CREATE POLICY "Chat attachments upload by owner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
);

DROP POLICY IF EXISTS "Chat attachments update by owner" ON storage.objects;
CREATE POLICY "Chat attachments update by owner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
);

DROP POLICY IF EXISTS "Chat attachments delete by owner" ON storage.objects;
CREATE POLICY "Chat attachments delete by owner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
);

DROP POLICY IF EXISTS "Chat attachments read by session participants" ON storage.objects;
CREATE POLICY "Chat attachments read by session participants"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.chat_sessions cs ON cs.id = m.session_id
    WHERE m.attachment_path = name
      AND (
        cs.participant_1_id = auth.jwt() ->> 'sub'
        OR cs.participant_2_id = auth.jwt() ->> 'sub'
      )
  )
);
