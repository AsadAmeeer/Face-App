
-- event-photos: organizer of the event (folder name = event_id) can write; any authenticated user can read (signed URLs)
CREATE POLICY "event-photos read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-photos');

CREATE POLICY "event-photos organizer insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id::text = (storage.foldername(name))[1] AND e.organizer_id = auth.uid())
  );

CREATE POLICY "event-photos organizer delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id::text = (storage.foldername(name))[1] AND e.organizer_id = auth.uid())
  );

-- selfies: users can read/write only their own folder (name starts with their uid)
CREATE POLICY "selfies own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "selfies own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "selfies own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);
