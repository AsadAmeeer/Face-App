
DROP POLICY IF EXISTS "event-photos organizer insert" ON storage.objects;
DROP POLICY IF EXISTS "event-photos organizer delete" ON storage.objects;

CREATE POLICY "event-photos organizer insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "event-photos organizer delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
        AND e.organizer_id = auth.uid()
    )
  );
