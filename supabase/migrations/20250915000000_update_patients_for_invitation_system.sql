-- Update patients table for invitation system
-- Add invitation_status column and ensure temp_password exists for fallback

-- Add invitation_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'invitation_status'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN invitation_status TEXT DEFAULT 'completed';
  END IF;
END $$;

-- Add comment to document the purpose
COMMENT ON COLUMN public.patients.invitation_status IS 'Status of patient invitation: pending, completed, or expired';

-- Ensure temp_password column exists for fallback functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'temp_password'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN temp_password TEXT;
  END IF;
END $$;

-- Add comment to document the purpose
COMMENT ON COLUMN public.patients.temp_password IS 'Temporary password for patient login when invitation email fails';
