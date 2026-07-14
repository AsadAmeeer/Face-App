-- Allow anonymous inserts/reads to selfies bucket
CREATE POLICY "selfies anonymous insert" ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'selfies' AND (storage.foldername(name))[1] = 'anonymous');

CREATE POLICY "selfies anonymous read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = 'anonymous');

-- Grant permissions to public (anon) role for search_sessions and matches
GRANT SELECT, INSERT ON public.search_sessions TO anon;
GRANT SELECT, INSERT ON public.matches TO anon;

-- Policies for search_sessions for anonymous users
CREATE POLICY "anonymous inserts search_sessions" ON public.search_sessions FOR INSERT TO public
  WITH CHECK (attendee_id IS NULL);

CREATE POLICY "anonymous reads search_sessions" ON public.search_sessions FOR SELECT TO public
  USING (attendee_id IS NULL OR auth.uid() = attendee_id OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));

-- Policies for matches for anonymous users
CREATE POLICY "anonymous inserts matches" ON public.matches FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.search_sessions s 
    WHERE s.id = session_id 
    AND s.attendee_id IS NULL
  ));

CREATE POLICY "anonymous matches visible via session" ON public.matches FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.search_sessions s 
    WHERE s.id = session_id 
    AND (s.attendee_id IS NULL OR s.attendee_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = s.event_id AND e.organizer_id = auth.uid()))
  ));

-- Trigger to auto-confirm email for all new registrations
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  new.email_confirmed_at := now();
  new.confirmed_at := now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists first
DROP TRIGGER IF EXISTS on_auth_user_created_before ON auth.users;

CREATE TRIGGER on_auth_user_created_before
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();
