-- Fix RLS policies for patients and doctors tables to resolve circular dependency
-- Migration: 20250911000000_fix_rls_circular_dependency

-- Fix doctors table policies first
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.doctors;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.doctors;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can view all doctor profiles" ON public.doctors;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.doctors;

-- Create permissive policies for doctors table (with existence checks)
DO $$
BEGIN
    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'doctors'
        AND policyname = 'Authenticated users can view doctors for verification'
    ) THEN
        CREATE POLICY "Authenticated users can view doctors for verification"
        ON public.doctors
        FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;

    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'doctors'
        AND policyname = 'Users can manage their own doctor profile'
    ) THEN
        CREATE POLICY "Users can manage their own doctor profile"
        ON public.doctors
        FOR ALL
        USING (auth.jwt() ->> 'sub' = clerk_user_id)
        WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);
    END IF;

    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'doctors'
        AND policyname = 'Allow doctor registration'
    ) THEN
        CREATE POLICY "Allow doctor registration"
        ON public.doctors
        FOR INSERT
        WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);
    END IF;
END $$;

-- Fix patients table policies
-- Drop existing policies
DROP POLICY IF EXISTS "Doctors can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON public.patients;
DROP POLICY IF EXISTS "Doctors can create patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can update patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can create patients and patients can create their own records" ON public.patients;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.patients;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.patients;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.patients;

-- Create new policies that don't depend on doctors table queries (with existence checks)
DO $$
BEGIN
    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'patients'
        AND policyname = 'Authenticated users can view patients'
    ) THEN
        CREATE POLICY "Authenticated users can view patients"
        ON public.patients
        FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;

    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'patients'
        AND policyname = 'Patients can view their own record'
    ) THEN
        CREATE POLICY "Patients can view their own record"
        ON public.patients
        FOR SELECT
        USING (user_id = auth.uid()::text);
    END IF;

    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'patients'
        AND policyname = 'Authenticated users can create patients'
    ) THEN
        CREATE POLICY "Authenticated users can create patients"
        ON public.patients
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- Create policy only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'patients'
        AND policyname = 'Authenticated users can update patients'
    ) THEN
        CREATE POLICY "Authenticated users can update patients"
        ON public.patients
        FOR UPDATE
        USING (auth.role() = 'authenticated');
    END IF;
END $$;
