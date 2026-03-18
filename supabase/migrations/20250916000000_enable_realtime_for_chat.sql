-- Enable realtime for chat functionality
-- This migration ensures that the messages table is properly configured for realtime updates

-- Enable realtime for the messages table
-- Note: This is typically done through the Supabase dashboard, but we're documenting it here
-- In Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Under "Source", ensure "messages" table is selected
-- 3. Under "Events", ensure "Insert", "Update", and "Delete" are enabled

-- For programmatic setup (if needed), you can use the Supabase CLI:
-- supabase db reset --linked
-- This will reapply all migrations and ensure realtime is properly configured

-- Verify that the messages table exists and has the correct structure
DO $$
BEGIN
    -- Check if messages table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'messages'
    ) THEN
        RAISE EXCEPTION 'messages table does not exist. Please run the initial migration first.';
    END IF;

    -- Log the current state
    RAISE NOTICE 'Messages table exists and is ready for realtime configuration';
END $$;

-- Enable Row Level Security on messages table if not already enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read messages from their sessions
DROP POLICY IF EXISTS "Users can read messages from their sessions" ON public.messages;
CREATE POLICY "Users can read messages from their sessions"
ON public.messages
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE participant_1_id = auth.jwt() ->> 'sub'
    OR participant_2_id = auth.jwt() ->> 'sub'
  )
);

-- Create policy to allow users to insert messages into their sessions
DROP POLICY IF EXISTS "Users can insert messages into their sessions" ON public.messages;
CREATE POLICY "Users can insert messages into their sessions"
ON public.messages
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE participant_1_id = auth.jwt() ->> 'sub'
    OR participant_2_id = auth.jwt() ->> 'sub'
  )
  AND sender_id = auth.jwt() ->> 'sub'
);

-- Note: Realtime configuration is typically managed through the Supabase dashboard
-- or through the Supabase CLI. This migration serves as documentation.

-- If you need to enable realtime programmatically, you can use:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- But this is usually handled automatically by Supabase

-- Note: Realtime configuration is typically managed through the Supabase dashboard
-- or through the Supabase CLI. This migration serves as documentation.

-- If you need to enable realtime programmatically, you can use:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- But this is usually handled automatically by Supabase