CREATE INDEX bookings_vehicle_status_dates_idx
  ON public.bookings (vehicle_id, status, pickup_at, return_at);

CREATE OR REPLACE FUNCTION public.search_available_vehicles(
  p_city text DEFAULT NULL,
  p_pickup_at timestamptz DEFAULT NULL,
  p_return_at timestamptz DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL,
  p_transmission text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_seats integer DEFAULT NULL,
  p_fuel_type text DEFAULT NULL,
  p_air_conditioning boolean DEFAULT false,
  p_query text DEFAULT NULL,
  p_sort text DEFAULT NULL,
  p_limit integer DEFAULT 12,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (vehicle_id uuid, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (p_pickup_at IS NULL) <> (p_return_at IS NULL) THEN
    RAISE EXCEPTION 'Choose both pickup and return dates.';
  END IF;
  IF p_pickup_at IS NOT NULL AND p_return_at <= p_pickup_at THEN
    RAISE EXCEPTION 'Return must be after pickup.';
  END IF;

  RETURN QUERY
  SELECT v.id, COUNT(*) OVER ()
  FROM public.vehicles v
  WHERE v.status = 'approved'
    AND v.is_available
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v.company_id AND c.is_suspended = false
    )
    AND (NULLIF(trim(p_city), '') IS NULL OR v.city ILIKE '%' || trim(p_city) || '%')
    AND (NULLIF(p_vehicle_type, '') IS NULL OR v.vehicle_type = p_vehicle_type)
    AND (NULLIF(p_transmission, '') IS NULL OR v.transmission = p_transmission)
    AND (p_max_price IS NULL OR v.price_per_day <= p_max_price)
    AND (p_min_seats IS NULL OR v.seats >= p_min_seats)
    AND (NULLIF(p_fuel_type, '') IS NULL OR v.fuel_type = p_fuel_type)
    AND (
      NOT COALESCE(p_air_conditioning, false)
      OR EXISTS (
        SELECT 1 FROM unnest(v.features) AS f(feature)
        WHERE lower(f.feature) = 'air conditioning'
      )
    )
    AND (
      NULLIF(trim(p_query), '') IS NULL
      OR v.brand ILIKE '%' || trim(p_query) || '%'
      OR v.model ILIKE '%' || trim(p_query) || '%'
    )
    AND (
      p_pickup_at IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.vehicle_id = v.id
          AND b.status IN ('pending', 'confirmed', 'ready', 'active')
          AND tstzrange(b.pickup_at, b.return_at, '[)')
              && tstzrange(p_pickup_at, p_return_at, '[)')
      )
    )
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN v.price_per_day END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN v.price_per_day END DESC NULLS LAST,
    CASE WHEN p_sort IS NULL OR p_sort NOT IN ('price_asc', 'price_desc')
         THEN v.rating END DESC NULLS LAST,
    v.id
  LIMIT greatest(1, least(COALESCE(p_limit, 12), 48))
  OFFSET greatest(COALESCE(p_offset, 0), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.search_available_vehicles(text, timestamptz, timestamptz, text, text, numeric, integer, text, boolean, text, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.search_available_vehicles(text, timestamptz, timestamptz, text, text, numeric, integer, text, boolean, text, text, integer, integer) TO anon, authenticated, service_role;

CREATE TABLE public.booking_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('cancellation', 'modification')),
  message text NOT NULL,
  requested_pickup_at timestamptz,
  requested_return_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (request_type = 'modification' AND requested_pickup_at IS NOT NULL AND requested_return_at > requested_pickup_at)
    OR (request_type = 'cancellation' AND requested_pickup_at IS NULL AND requested_return_at IS NULL)
  )
);
CREATE UNIQUE INDEX booking_change_requests_one_pending_idx
  ON public.booking_change_requests (booking_id)
  WHERE status = 'pending';
GRANT SELECT ON public.booking_change_requests TO authenticated;
ALTER TABLE public.booking_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking change requests readable by parties"
  ON public.booking_change_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.customer_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = b.company_id AND c.owner_id = auth.uid()
      )
    )
  ));

CREATE OR REPLACE FUNCTION public.request_booking_change(
  p_booking_id uuid,
  p_request_type text,
  p_message text,
  p_pickup_at timestamptz,
  p_return_at timestamptz
)
RETURNS public.booking_change_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b public.bookings;
  v_request public.booking_change_requests;
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF p_request_type NOT IN ('cancellation', 'modification') THEN
    RAISE EXCEPTION 'Choose a valid request type.';
  END IF;
  IF length(trim(COALESCE(p_message, ''))) = 0 OR length(p_message) > 1000 THEN
    RAISE EXCEPTION 'Add a message of 1 to 1000 characters.';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF b.id IS NULL OR b.customer_id <> v_uid THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;
  IF b.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Requests are only available for pending or confirmed bookings.';
  END IF;
  IF p_request_type = 'modification' THEN
    IF p_pickup_at IS NULL OR p_return_at IS NULL OR p_return_at <= p_pickup_at THEN
      RAISE EXCEPTION 'Choose valid pickup and return dates.';
    END IF;
    IF p_pickup_at < now() THEN RAISE EXCEPTION 'Pickup cannot be in the past.'; END IF;
  ELSIF p_pickup_at IS NOT NULL OR p_return_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cancellation requests cannot include new dates.';
  END IF;

  INSERT INTO public.booking_change_requests (
    booking_id, request_type, message, requested_pickup_at, requested_return_at
  ) VALUES (
    b.id, p_request_type, trim(p_message), p_pickup_at, p_return_at
  ) RETURNING * INTO v_request;

  INSERT INTO public.booking_events (booking_id, label, note)
  VALUES (
    b.id,
    CASE p_request_type WHEN 'cancellation' THEN 'Cancellation requested' ELSE 'Date change requested' END,
    trim(p_message)
  );

  SELECT c.owner_id INTO v_owner FROM public.companies c WHERE c.id = b.company_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (
      v_owner,
      'Booking change request',
      'Customer requested ' || p_request_type || ' for booking ' || b.reference || '.',
      'booking'
    );
  END IF;
  RETURN v_request;
END;
$$;
REVOKE ALL ON FUNCTION public.request_booking_change(uuid, text, text, timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_booking_change(uuid, text, text, timestamptz, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decide_booking_change(
  p_request_id uuid,
  p_decision text,
  p_note text
)
RETURNS public.booking_change_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.booking_change_requests;
  b public.bookings;
  v public.vehicles;
  v_uid uuid := auth.uid();
  v_days integer;
  v_rental numeric(10,2);
  v_insurance numeric(10,2);
  v_extras numeric(10,2);
  v_delivery numeric(10,2);
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_dates_note text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF p_decision NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'Choose approve or decline.';
  END IF;
  IF length(COALESCE(p_note, '')) > 1000 THEN RAISE EXCEPTION 'The note is too long.'; END IF;

  SELECT * INTO r FROM public.booking_change_requests WHERE id = p_request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found.'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = r.booking_id FOR UPDATE;
  IF b.id IS NULL OR NOT (
    public.has_role(v_uid, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = v_uid
    )
  ) THEN
    RAISE EXCEPTION 'You are not allowed to handle this request.';
  END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been handled.'; END IF;

  IF p_decision = 'approved' THEN
    IF r.request_type = 'cancellation' THEN
      IF b.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'This booking can no longer be cancelled.';
      END IF;
      UPDATE public.bookings
      SET status = 'cancelled',
          payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END
      WHERE id = b.id;
      INSERT INTO public.booking_events (booking_id, label, note)
      VALUES (b.id, 'Status: cancelled', NULLIF(trim(p_note), ''));
    ELSE
      IF b.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'This booking can no longer be modified.';
      END IF;
      IF r.requested_pickup_at < now() THEN RAISE EXCEPTION 'The requested pickup time has passed.'; END IF;
      SELECT * INTO v FROM public.vehicles WHERE id = b.vehicle_id FOR UPDATE;
      IF v.id IS NULL OR v.is_available = false THEN
        RAISE EXCEPTION 'This vehicle is no longer available.';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.bookings other
        WHERE other.vehicle_id = b.vehicle_id
          AND other.id <> b.id
          AND other.status IN ('pending', 'confirmed', 'ready', 'active')
          AND tstzrange(other.pickup_at, other.return_at, '[)')
              && tstzrange(r.requested_pickup_at, r.requested_return_at, '[)')
      ) THEN
        RAISE EXCEPTION 'Those dates are no longer available.';
      END IF;

      v_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.requested_return_at - r.requested_pickup_at)) / 86400.0)::int);
      v_rental := ROUND(v.price_per_day * v_days, 2);
      v_insurance := ROUND(15 * v_days, 2);
      v_extras := 0;
      IF 'child_seat' = ANY(b.extras) THEN v_extras := v_extras + 5 * v_days; END IF;
      IF 'gps' = ANY(b.extras) THEN v_extras := v_extras + 4 * v_days; END IF;
      IF 'additional_driver' = ANY(b.extras) THEN v_extras := v_extras + 7 * v_days; END IF;
      v_delivery := CASE WHEN 'delivery' = ANY(b.extras) THEN 25 ELSE 0 END;
      v_tax := ROUND((v_rental + v_insurance + v_extras + v_delivery) * 0.08, 2);
      v_total := v_rental + v_insurance + v_extras + v_delivery + v_tax;
      v_dates_note := 'Pickup ' || to_char(b.pickup_at, 'YYYY-MM-DD HH24:MI TZ')
        || ' → ' || to_char(r.requested_pickup_at, 'YYYY-MM-DD HH24:MI TZ')
        || '; return ' || to_char(b.return_at, 'YYYY-MM-DD HH24:MI TZ')
        || ' → ' || to_char(r.requested_return_at, 'YYYY-MM-DD HH24:MI TZ')
        || '. Updated total: ' || v_total;

      UPDATE public.bookings
      SET pickup_at = r.requested_pickup_at,
          return_at = r.requested_return_at,
          days = v_days,
          rental_total = v_rental,
          insurance_total = v_insurance,
          extras_total = v_extras,
          delivery_fee = v_delivery,
          tax = v_tax,
          total = v_total
      WHERE id = b.id;
      INSERT INTO public.booking_events (booking_id, label, note)
      VALUES (b.id, 'Booking dates updated', COALESCE(NULLIF(trim(p_note), '') || ' ', '') || v_dates_note);
    END IF;
  ELSE
    INSERT INTO public.booking_events (booking_id, label, note)
    VALUES (
      b.id,
      CASE r.request_type WHEN 'cancellation' THEN 'Cancellation request declined' ELSE 'Date change request declined' END,
      NULLIF(trim(p_note), '')
    );
  END IF;

  UPDATE public.booking_change_requests
  SET status = p_decision, decision_note = NULLIF(trim(p_note), ''), updated_at = now()
  WHERE id = r.id RETURNING * INTO r;

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (
    b.customer_id,
    CASE
      WHEN p_decision = 'approved' AND r.request_type = 'cancellation' THEN 'Cancellation approved'
      WHEN p_decision = 'approved' THEN 'Booking dates updated'
      ELSE 'Booking change request declined'
    END,
    CASE
      WHEN p_decision = 'approved' AND r.request_type = 'cancellation'
        THEN 'Your booking ' || b.reference || ' has been cancelled.'
      WHEN p_decision = 'approved'
        THEN 'Your requested dates for booking ' || b.reference || ' were approved. The updated total is ' || v_total || '.'
      ELSE 'Your request for booking ' || b.reference || ' was declined.'
    END || CASE WHEN NULLIF(trim(p_note), '') IS NOT NULL THEN ' ' || trim(p_note) ELSE '' END,
    'booking'
  );
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_booking_change(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking_change(uuid, text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "bookings updatable by parties" ON public.bookings;
CREATE POLICY "bookings updatable by company or admin"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_booking_status(p_booking_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings;
  v_uid uuid := auth.uid();
  is_owner boolean;
  is_admin boolean;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  is_admin := public.has_role(v_uid, 'admin');
  is_owner := EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = v_uid
  );
  IF p_status NOT IN ('confirmed', 'rejected', 'ready', 'active', 'completed', 'cancelled')
      OR NOT (is_owner OR is_admin) THEN
    RAISE EXCEPTION 'You are not allowed to make this change.';
  END IF;
  UPDATE public.bookings SET status = p_status,
    payment_status = CASE WHEN p_status IN ('rejected', 'cancelled') AND payment_status = 'paid' THEN 'refunded'
                          WHEN p_status = 'confirmed' THEN 'paid' ELSE payment_status END
  WHERE id = p_booking_id RETURNING * INTO b;
  INSERT INTO public.booking_events (booking_id, label, note)
  VALUES (b.id, 'Status: ' || p_status, p_note);
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (b.customer_id, 'Booking ' || b.reference || ' ' || p_status, COALESCE(p_note, 'Your booking status changed.'), 'booking');
  RETURN b;
END;
$function$;
