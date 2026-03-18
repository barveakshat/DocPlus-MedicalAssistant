-- Enable realtime for messages table without using Replication UI
-- Since Replication is a "coming soon" feature, we'll use the direct method

-- First, check if the supabase_realtime publication exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Create the publication if it doesn't exist
        CREATE PUBLICATION supabase_realtime;
        RAISE NOTICE 'Created supabase_realtime publication';
    END IF;
END $$;

-- Add the messages table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Add the doctor_patient_messages table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_patient_messages;

-- Verify the tables were added to the publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'messages'
    ) THEN
        RAISE NOTICE 'messages table is now enabled for realtime';
    ELSE
        RAISE EXCEPTION 'Failed to enable realtime for messages table';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'doctor_patient_messages'
    ) THEN
        RAISE NOTICE 'doctor_patient_messages table is now enabled for realtime';
    ELSE
        RAISE EXCEPTION 'Failed to enable realtime for doctor_patient_messages table';
    END IF;
END $$;

-- Note: This migration enables realtime without requiring the Replication UI
-- Both messages and doctor_patient_messages tables will now broadcast INSERT/UPDATE/DELETE events automatically
