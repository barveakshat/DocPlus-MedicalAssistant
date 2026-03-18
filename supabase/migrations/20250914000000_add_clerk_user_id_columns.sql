-- Add clerk_user_id column to doctors and patients tables for Clerk authentication

-- Add clerk_user_id column to doctors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'doctors'
    AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN clerk_user_id TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_doctors_clerk_user_id ON public.doctors(clerk_user_id);
  END IF;
END $$;

-- Add clerk_user_id column to patients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN clerk_user_id TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_patients_clerk_user_id ON public.patients(clerk_user_id);
  END IF;
END $$;

-- Add email column to doctors table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'doctors'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN email TEXT;
    CREATE INDEX IF NOT EXISTS idx_doctors_email ON public.doctors(email);
  END IF;
END $$;

-- Create indexes for patients email if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN email TEXT;
    CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
  END IF;
END $$;
