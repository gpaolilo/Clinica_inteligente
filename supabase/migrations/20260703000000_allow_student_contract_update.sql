-- Migration: Allow students to update their own patient profile and contract
-- This enables students to sign their educational contracts during onboarding.

-- 1. Enable students to update their own patient record by user_id
DROP POLICY IF EXISTS "Students can update their own profile and contract" ON public.patients;
CREATE POLICY "Students can update their own profile and contract"
ON public.patients
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Allow students to link user_id if their email matches
DROP POLICY IF EXISTS "Students can link user_id by email" ON public.patients;
CREATE POLICY "Students can link user_id by email"
ON public.patients
FOR UPDATE
USING (
  email IS NOT NULL AND 
  (auth.jwt() ->> 'email') IS NOT NULL AND 
  lower(email) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  email IS NOT NULL AND 
  (auth.jwt() ->> 'email') IS NOT NULL AND 
  lower(email) = lower(auth.jwt() ->> 'email')
);

-- 3. Allow students to view their patient record by email or user_id
DROP POLICY IF EXISTS "Students can read their profile by email" ON public.patients;
CREATE POLICY "Students can read their profile by email"
ON public.patients
FOR SELECT
USING (
  auth.uid() = user_id OR
  (
    email IS NOT NULL AND 
    (auth.jwt() ->> 'email') IS NOT NULL AND 
    lower(email) = lower(auth.jwt() ->> 'email')
  )
);

