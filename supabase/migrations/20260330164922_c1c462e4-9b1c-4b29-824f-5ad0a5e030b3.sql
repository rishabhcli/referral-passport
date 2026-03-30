CREATE POLICY "Authenticated update patients"
ON public.patients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);