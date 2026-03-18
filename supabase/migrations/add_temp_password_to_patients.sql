-- Add temp_password column to patients table for email fallback functionality
-- This allows storing temporary passwords when email delivery fails

ALTER TABLE public.patients
ADD COLUMN temp_password TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN public.patients.temp_password IS 'Temporary password for patient login when email delivery fails';
