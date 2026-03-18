-- Temporarily disable RLS for testing
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Insert a test message to verify realtime
INSERT INTO messages (content, session_id, sender_id, is_read, created_at)
VALUES ('Test message from SQL', 'test-session', 'test-user', false, NOW());

-- Re-enable RLS after testing
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
