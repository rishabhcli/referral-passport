CREATE POLICY "Authenticated insert patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (true);