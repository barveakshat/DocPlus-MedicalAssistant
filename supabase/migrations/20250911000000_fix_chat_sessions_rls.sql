-- Fix chat sessions RLS policy for AI chats
-- This migration should run after all other chat-related migrations

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create chat sessions" ON public.chat_sessions;

-- Create simplified policy that allows users to create chat sessions
CREATE POLICY "Users can create chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (
  participant_1_id = auth.uid()::text
);
