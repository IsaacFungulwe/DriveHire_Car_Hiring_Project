ALTER TABLE public.companies
  ADD COLUMN rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN review_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "own reviews manageable" ON public.reviews;

CREATE POLICY "customers read own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "completed customers can review"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviews.customer_id = auth.uid()
    AND reviews.company_rating BETWEEN 1 AND 5
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.customer_id = auth.uid()
        AND b.vehicle_id = reviews.vehicle_id
        AND b.status = 'completed'
    )
  );

CREATE POLICY "review owners can update completed trip reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      reviews.customer_id = auth.uid()
      AND reviews.company_rating BETWEEN 1 AND 5
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = reviews.booking_id
          AND b.customer_id = auth.uid()
          AND b.vehicle_id = reviews.vehicle_id
          AND b.status = 'completed'
      )
    )
  );

CREATE POLICY "review owners can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.refresh_vehicle_rating()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_company_id uuid;
  v_vehicle_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_vehicle_ids := array_append(v_vehicle_ids, OLD.vehicle_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_vehicle_ids := array_append(v_vehicle_ids, NEW.vehicle_id);
  END IF;

  FOREACH v_id IN ARRAY v_vehicle_ids LOOP
    SELECT company_id INTO v_company_id FROM public.vehicles WHERE id = v_id;
    UPDATE public.vehicles v SET
      rating = COALESCE(
        (SELECT ROUND(AVG(r.rating)::numeric, 2)
         FROM public.reviews r
         WHERE r.vehicle_id = v_id AND r.is_hidden = false),
        0
      ),
      review_count = (
        SELECT COUNT(*) FROM public.reviews r
        WHERE r.vehicle_id = v_id AND r.is_hidden = false
      )
    WHERE v.id = v_id;

    IF v_company_id IS NOT NULL THEN
      UPDATE public.companies c SET
        rating = COALESCE(
          (SELECT ROUND(AVG(r.company_rating)::numeric, 2)
           FROM public.reviews r
           JOIN public.vehicles reviewed_vehicle ON reviewed_vehicle.id = r.vehicle_id
           WHERE reviewed_vehicle.company_id = v_company_id
             AND r.is_hidden = false
             AND r.company_rating IS NOT NULL),
          0
        ),
        review_count = (
          SELECT COUNT(*)
          FROM public.reviews r
          JOIN public.vehicles reviewed_vehicle ON reviewed_vehicle.id = r.vehicle_id
          WHERE reviewed_vehicle.company_id = v_company_id
            AND r.is_hidden = false
            AND r.company_rating IS NOT NULL
        )
      WHERE c.id = v_company_id;
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

UPDATE public.vehicles v SET
  rating = COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 2)
    FROM public.reviews r
    WHERE r.vehicle_id = v.id AND r.is_hidden = false
  ), 0),
  review_count = (
    SELECT COUNT(*) FROM public.reviews r
    WHERE r.vehicle_id = v.id AND r.is_hidden = false
  );

UPDATE public.companies c SET
  rating = COALESCE((
    SELECT ROUND(AVG(r.company_rating)::numeric, 2)
    FROM public.reviews r
    JOIN public.vehicles v ON v.id = r.vehicle_id
    WHERE v.company_id = c.id AND r.is_hidden = false AND r.company_rating IS NOT NULL
  ), 0),
  review_count = (
    SELECT COUNT(*)
    FROM public.reviews r
    JOIN public.vehicles v ON v.id = r.vehicle_id
    WHERE v.company_id = c.id AND r.is_hidden = false AND r.company_rating IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.recent_vehicle_reviews(p_vehicle_ids uuid[])
RETURNS TABLE (
  vehicle_id uuid,
  rating integer,
  company_rating integer,
  comment text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (r.vehicle_id)
    r.vehicle_id,
    r.rating,
    r.company_rating,
    r.comment,
    r.created_at
  FROM public.reviews r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  WHERE v.id = ANY(COALESCE(p_vehicle_ids, '{}'::uuid[]))
    AND v.status = 'approved'
    AND r.is_hidden = false
    AND NULLIF(trim(r.comment), '') IS NOT NULL
  ORDER BY r.vehicle_id, r.created_at DESC, r.id DESC;
$$;
REVOKE ALL ON FUNCTION public.recent_vehicle_reviews(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.recent_vehicle_reviews(uuid[]) TO anon, authenticated, service_role;
