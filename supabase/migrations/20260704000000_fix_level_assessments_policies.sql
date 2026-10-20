-- Migration: Strengthen RLS Policies for Level Assessments
-- Ensures teachers can request progress tests and students can access them reliably

-- 1. Drop existing policies to refresh
DROP POLICY IF EXISTS "Students can view their own level assessments" ON public.level_assessments;
DROP POLICY IF EXISTS "Students can update their own level assessments" ON public.level_assessments;
DROP POLICY IF EXISTS "Students can insert their own initial placement assessment" ON public.level_assessments;
DROP POLICY IF EXISTS "Teachers can view level assessments of their students" ON public.level_assessments;
DROP POLICY IF EXISTS "Teachers can create level assessments" ON public.level_assessments;
DROP POLICY IF EXISTS "Teachers can update level assessments" ON public.level_assessments;

-- 2. Students can view their own assessments (matches by user_id, patient id or email)
CREATE POLICY "Students can view their own level assessments"
ON public.level_assessments
FOR SELECT
USING (
    student_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients 
        WHERE user_id = auth.uid() 
           OR (email IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
    )
);

-- 3. Students can update their own assessments (to submit answers and complete test)
CREATE POLICY "Students can update their own level assessments"
ON public.level_assessments
FOR UPDATE
USING (
    student_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients 
        WHERE user_id = auth.uid() 
           OR (email IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
    )
);

-- 4. Students can insert initial placement test
CREATE POLICY "Students can insert their own initial placement assessment"
ON public.level_assessments
FOR INSERT
WITH CHECK (
    student_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients 
        WHERE user_id = auth.uid() 
           OR (email IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
    )
);

-- 5. Teachers can view their students' level assessments
CREATE POLICY "Teachers can view level assessments of their students"
ON public.level_assessments
FOR SELECT
USING (
    teacher_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients WHERE psychologist_id = auth.uid()
    )
);

-- 6. Teachers can create / request level assessments for their students
CREATE POLICY "Teachers can create level assessments"
ON public.level_assessments
FOR INSERT
WITH CHECK (
    teacher_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients WHERE psychologist_id = auth.uid()
    )
);

-- 7. Teachers can update level assessments
CREATE POLICY "Teachers can update level assessments"
ON public.level_assessments
FOR UPDATE
USING (
    teacher_id = auth.uid() OR
    student_id IN (
        SELECT id FROM public.patients WHERE psychologist_id = auth.uid()
    )
);
