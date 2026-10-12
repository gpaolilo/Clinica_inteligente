-- Migration: Student Educational Contracts
-- Supports signing, initials on all pages, and mutual access for teachers and students.

-- 1. Create table student_contracts
CREATE TABLE IF NOT EXISTS public.student_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.psychologists(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SIGNED', 'CANCELLED')) DEFAULT 'PENDING',
    
    -- Contract terms configuration
    weekly_frequency TEXT NOT NULL DEFAULT '2x na semana',
    vigency_months INTEGER NOT NULL DEFAULT 3,
    
    -- Student & Teacher snapshot data at signature time
    contract_data JSONB DEFAULT '{}'::jsonb,
    
    -- Signature and Initials (Rubricas)
    initials_data_url TEXT,
    signature_data_url TEXT,
    
    -- Legal audit metadata
    signed_at TIMESTAMPTZ,
    signer_ip TEXT,
    signer_user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_student_contracts_student ON public.student_contracts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_contracts_teacher ON public.student_contracts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_contracts_status ON public.student_contracts(status);

-- 3. Enhance patients table with contractual details
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contract_data JSONB;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contract_initials TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contract_signature TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS cep TEXT;

-- 4. Enable RLS
ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;

-- Drop policies if exists for idempotency
DROP POLICY IF EXISTS "Teachers can view contracts of their students" ON public.student_contracts;
DROP POLICY IF EXISTS "Teachers can create and manage student contracts" ON public.student_contracts;
DROP POLICY IF EXISTS "Students can view their own contracts" ON public.student_contracts;
DROP POLICY IF EXISTS "Students can update their own contracts" ON public.student_contracts;
DROP POLICY IF EXISTS "Students can insert their own contracts" ON public.student_contracts;

-- Policy: Teachers can view contracts of their students
CREATE POLICY "Teachers can view contracts of their students"
ON public.student_contracts
FOR SELECT
USING (
    teacher_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients WHERE psychologist_id = auth.uid()
    )
);

-- Policy: Teachers can create and manage student contracts
CREATE POLICY "Teachers can create and manage student contracts"
ON public.student_contracts
FOR ALL
USING (
    teacher_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients WHERE psychologist_id = auth.uid()
    )
);

-- Policy: Students can view their own contracts
CREATE POLICY "Students can view their own contracts"
ON public.student_contracts
FOR SELECT
USING (
    student_id IN (
        SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
);

-- Policy: Students can update their own contracts (sign and apply initials)
CREATE POLICY "Students can update their own contracts"
ON public.student_contracts
FOR UPDATE
USING (
    student_id IN (
        SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
);

-- Policy: Students can insert initial contract
CREATE POLICY "Students can insert their own contracts"
ON public.student_contracts
FOR INSERT
WITH CHECK (
    student_id IN (
        SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
);
