-- Fix doctor-patient chat tables for Clerk authentication
-- This migration updates doctor_patient_chat_sessions and doctor_patient_messages tables to work with Clerk JWT tokens

-- Drop ALL existing policies on doctor_patient_chat_sessions and doctor_patient_messages tables
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- Drop all policies on doctor_patient_chat_sessions
    FOR policy_name IN
        SELECT p.policyname
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = 'doctor_patient_chat_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.doctor_patient_chat_sessions', policy_name);
    END LOOP;

    -- Drop all policies on doctor_patient_messages
    FOR policy_name IN
        SELECT p.policyname
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = 'doctor_patient_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.doctor_patient_messages', policy_name);
    END LOOP;
END $$;

-- Drop foreign key constraints to auth.users
ALTER TABLE public.doctor_patient_chat_sessions DROP CONSTRAINT IF EXISTS doctor_patient_chat_sessions_doctor_id_fkey;
ALTER TABLE public.doctor_patient_chat_sessions DROP CONSTRAINT IF EXISTS doctor_patient_chat_sessions_patient_id_fkey;
ALTER TABLE public.doctor_patient_messages DROP CONSTRAINT IF EXISTS doctor_patient_messages_sender_id_fkey;

-- Convert doctor, patient, and sender IDs to TEXT to support Clerk string IDs
ALTER TABLE public.doctor_patient_chat_sessions ALTER COLUMN doctor_id TYPE TEXT;
ALTER TABLE public.doctor_patient_chat_sessions ALTER COLUMN patient_id TYPE TEXT;
ALTER TABLE public.doctor_patient_messages ALTER COLUMN sender_id TYPE TEXT;

-- Create new RLS policies that work with Clerk JWT tokens
CREATE POLICY "Doctors and patients can view their chat sessions"
ON public.doctor_patient_chat_sessions
FOR SELECT
USING (
  auth.jwt() ->> 'sub' = doctor_id OR
  auth.jwt() ->> 'sub' = patient_id
);

CREATE POLICY "Doctors and patients can create chat sessions"
ON public.doctor_patient_chat_sessions
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'sub' = doctor_id OR
  auth.jwt() ->> 'sub' = patient_id
);

CREATE POLICY "Doctors and patients can update their chat sessions"
ON public.doctor_patient_chat_sessions
FOR UPDATE
USING (
  auth.jwt() ->> 'sub' = doctor_id OR
  auth.jwt() ->> 'sub' = patient_id
);

CREATE POLICY "Doctors and patients can view messages in their sessions"
ON public.doctor_patient_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.doctor_id = auth.jwt() ->> 'sub' OR cs.patient_id = auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Doctors and patients can send messages"
ON public.doctor_patient_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.jwt() ->> 'sub'
  AND EXISTS (
    SELECT 1 FROM public.doctor_patient_chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.doctor_id = auth.jwt() ->> 'sub' OR cs.patient_id = auth.jwt() ->> 'sub')
  )
);

CREATE POLICY "Doctors and patients can update messages"
ON public.doctor_patient_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.doctor_id = auth.jwt() ->> 'sub' OR cs.patient_id = auth.jwt() ->> 'sub')
  )
);
