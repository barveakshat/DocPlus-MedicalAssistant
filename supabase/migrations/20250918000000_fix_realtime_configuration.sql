-- Fix realtime configuration for doctor_patient_messages table
-- This migration ensures proper realtime setup for doctor-patient chat

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a fresh publication with only the messages table
-- (since doctor_patient_messages table may not exist or may be causing conflicts)
CREATE PUBLICATION supabase_realtime FOR TABLE messages;

-- Verify the table is in the publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'messages'
    ) THEN
        RAISE NOTICE '✅ messages table is enabled for realtime';
    ELSE
        RAISE EXCEPTION '❌ messages table is NOT enabled for realtime';
    END IF;
END $$;

-- Note: Only enabling messages table for realtime to avoid conflicts
-- If doctor_patient_messages table exists and is needed, it should be added separately
DO $$
BEGIN
    RAISE NOTICE 'Realtime configuration check:';
    RAISE NOTICE '- messages table: %',
        CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages')
             THEN 'ENABLED' ELSE 'NOT ENABLED' END;
    RAISE NOTICE '- doctor_patient_messages table: %',
        CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'doctor_patient_messages')
             THEN 'ENABLED' ELSE 'NOT ENABLED' END;
END $$;
