-- Fix chat tables for Clerk authentication
-- This migration updates chat_sessions and messages tables to work with Clerk JWT tokens

-- Drop ALL existing policies on chat_sessions and messages tables
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- Drop all policies on chat_sessions
    FOR policy_name IN
        SELECT p.policyname
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = 'chat_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_sessions', policy_name);
    END LOOP;

    -- Drop all policies on messages
    FOR policy_name IN
        SELECT p.policyname
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', policy_name);
    END LOOP;
END $$;

-- Drop foreign key constraints to auth.users
ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_participant_1_id_fkey;
ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_participant_2_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Convert participant and sender IDs to TEXT to support Clerk string IDs
ALTER TABLE public.chat_sessions ALTER COLUMN participant_1_id TYPE TEXT;
ALTER TABLE public.chat_sessions ALTER COLUMN participant_2_id TYPE TEXT;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE TEXT;

-- Create new RLS policies that work with Clerk JWT tokens
CREATE POLICY "Users can view their chat sessions"
ON public.chat_sessions
FOR SELECT
USING (
  auth.jwt() ->> 'sub' = participant_1_id OR
  auth.jwt() ->> 'sub' = participant_2_id
);

CREATE POLICY "Users can create chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'sub' = participant_1_id OR
  auth.jwt() ->> 'sub' = participant_2_id
);

CREATE POLICY "Users can update their chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (
  auth.jwt() ->> 'sub' = participant_1_id OR
  auth.jwt() ->> 'sub' = participant_2_id
);

CREATE POLICY "Users can view messages from their sessions"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.jwt() ->> 'sub' OR cs.participant_2_id = auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Users can send messages to their sessions"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.jwt() ->> 'sub'
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.jwt() ->> 'sub' OR cs.participant_2_id = auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Users can update message read status in their sessions"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.jwt() ->> 'sub' OR cs.participant_2_id = auth.jwt() ->> 'sub')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.jwt() ->> 'sub' OR cs.participant_2_id = auth.jwt() ->> 'sub')
  )
);
