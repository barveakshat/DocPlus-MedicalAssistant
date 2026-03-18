-- Fix RLS policies for Clerk integration
-- This migration updates the doctors table RLS policies to work with Clerk JWT tokens

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.doctors;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.doctors;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.doctors;

-- Create new policies that work with Clerk JWT tokens
-- The JWT token from Clerk contains the user ID in the 'sub' claim
CREATE POLICY "Users can view their own profile"
ON public.doctors
FOR SELECT
USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update their own profile"
ON public.doctors
FOR UPDATE
USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert their own profile"
ON public.doctors
FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);

-- Also allow viewing all profiles for doctors (for patient management)
CREATE POLICY "Doctors can view all doctor profiles"
ON public.doctors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.clerk_user_id = auth.jwt() ->> 'sub'
  )
);
