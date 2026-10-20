CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (
    category IN ('booking', 'payment', 'vehicle', 'account', 'safety', 'other')
  ),
  subject text NOT NULL CHECK (length(trim(subject)) BETWEEN 3 AND 120),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_response text CHECK (admin_response IS NULL OR length(admin_response) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (admin_response IS NULL OR status = 'resolved')
);

CREATE INDEX support_requests_status_created_idx
  ON public.support_requests (status, created_at DESC);
CREATE INDEX support_requests_user_created_idx
  ON public.support_requests (user_id, created_at DESC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;

CREATE POLICY "users read own support requests"
  ON public.support_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users create own support requests"
  ON public.support_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      booking_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_id AND b.customer_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.respond_to_support_request(
  p_request_id uuid,
  p_status text,
  p_response text
)
RETURNS public.support_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.support_requests;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Only an admin can respond to support requests.';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('open', 'in_progress', 'resolved') THEN
    RAISE EXCEPTION 'Choose a valid support status.';
  END IF;
  IF length(COALESCE(p_response, '')) > 5000 THEN
    RAISE EXCEPTION 'The response must be 5000 characters or fewer.';
  END IF;
  IF p_status = 'resolved' AND length(trim(COALESCE(p_response, ''))) = 0 THEN
    RAISE EXCEPTION 'Add a response before resolving a support request.';
  END IF;

  SELECT * INTO r FROM public.support_requests WHERE id = p_request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Support request not found.'; END IF;

  UPDATE public.support_requests
  SET status = p_status,
      admin_response = CASE
        WHEN p_status = 'resolved' THEN trim(p_response)
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = r.id
  RETURNING * INTO r;

  IF p_status = 'resolved' THEN
    INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (
      r.user_id,
      'Support replied to your request',
      'Your request "' || r.subject || '" has been resolved. Sign in to view the response.',
      'support'
    );
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, detail)
  VALUES (v_uid, 'support request updated', r.id::text || ':' || p_status);
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_support_request(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_support_request(uuid, text, text) TO authenticated, service_role;
