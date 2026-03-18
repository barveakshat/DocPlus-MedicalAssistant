-- Alter user_id columns to text to support Clerk user IDs

-- First, drop ALL policies on doctors and patients tables
DO $$
DECLARE
    pol record;
BEGIN
    -- Drop all policies on doctors table
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctors'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.doctors';
    END LOOP;

    -- Drop all policies on patients table
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'patients'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.patients';
    END LOOP;
END $$;

-- Change doctors.user_id to text
ALTER TABLE public.doctors ALTER COLUMN user_id TYPE text;

-- Change patients.user_id to text
ALTER TABLE public.patients ALTER COLUMN user_id TYPE text;

-- Change patients.assigned_doctor_id to text
ALTER TABLE public.patients ALTER COLUMN assigned_doctor_id TYPE text;

-- Update foreign key constraint
ALTER TABLE public.patients DROP CONSTRAINT patients_assigned_doctor_id_fkey;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_assigned_doctor_id_fkey
  FOREIGN KEY (assigned_doctor_id)
  REFERENCES public.doctors(user_id)
  ON DELETE SET NULL;

-- Recreate policies with proper casting for auth.uid()
CREATE POLICY "Users can view all profiles"
ON public.doctors
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.doctors
FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.doctors
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Patients policies
CREATE POLICY "Users can view all profiles"
ON public.patients
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.patients
FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.patients
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);
