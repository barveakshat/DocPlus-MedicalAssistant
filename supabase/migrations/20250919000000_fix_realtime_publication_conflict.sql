-- Fix realtime publication conflict by completely resetting the publication
-- This resolves the "mismatch between server and client bindings" error

-- First, drop all existing publications to start fresh
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Also drop any other publications that might be conflicting
DO $$
DECLARE
    pub_name TEXT;
BEGIN
    FOR pub_name IN
        SELECT pubname FROM pg_publication
        WHERE pubname LIKE '%realtime%' OR pubname LIKE '%supabase%'
    LOOP
        EXECUTE 'DROP PUBLICATION ' || pub_name;
        RAISE NOTICE 'Dropped publication: %', pub_name;
    END LOOP;
END $$;

-- Wait a moment for cleanup
SELECT pg_sleep(1);

-- Create a clean publication with only the messages table
CREATE PUBLICATION supabase_realtime FOR TABLE messages;

-- Verify the publication was created correctly
DO $$
BEGIN
    -- Check if publication exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        RAISE EXCEPTION '❌ supabase_realtime publication was not created';
    END IF;

    -- Check if messages table is in the publication
    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'messages'
    ) THEN
        RAISE NOTICE '✅ messages table is successfully enabled for realtime';
    ELSE
        RAISE EXCEPTION '❌ messages table is NOT in the realtime publication';
    END IF;

    -- Check that no other tables are in the publication (to avoid conflicts)
    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename != 'messages'
    ) THEN
        RAISE EXCEPTION '❌ Publication contains unexpected tables - this may cause conflicts';
    END IF;

    RAISE NOTICE '✅ Realtime publication setup completed successfully with only messages table';
END $$;
