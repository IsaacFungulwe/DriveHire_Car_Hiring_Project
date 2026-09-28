-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('customer', 'owner', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  is_verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  notify_bookings boolean NOT NULL DEFAULT true,
  notify_promos boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile updatable" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insertable" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile deletable" ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer'))
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  phone text,
  email text,
  city text NOT NULL DEFAULT '',
  address text,
  is_verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active companies public" ON public.companies FOR SELECT TO anon, authenticated
  USING (is_suspended = false);
CREATE POLICY "own company manageable" ON public.companies FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  year int NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'Sedan',
  transmission text NOT NULL DEFAULT 'Automatic',
  fuel_type text NOT NULL DEFAULT 'Petrol',
  seats int NOT NULL DEFAULT 5,
  doors int NOT NULL DEFAULT 4,
  price_per_day numeric(10,2) NOT NULL,
  city text NOT NULL DEFAULT '',
  pickup_address text,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  image_key text,
  image_path text,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  mileage int NOT NULL DEFAULT 0,
  last_maintenance date,
  next_maintenance date,
  inspection_status text NOT NULL DEFAULT 'Passed',
  condition_note text,
  mileage_policy text NOT NULL DEFAULT 'Unlimited mileage',
  cancellation_policy text NOT NULL DEFAULT 'Free cancellation up to 48 hours before pickup.',
  deposit numeric(10,2) NOT NULL DEFAULT 200,
  status text NOT NULL DEFAULT 'pending',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved vehicles public" ON public.vehicles FOR SELECT TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.is_suspended = false)
  );
CREATE POLICY "own vehicles readable" ON public.vehicles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "own vehicles writable" ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "own vehicles updatable" ON public.vehicles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "own vehicles deletable" ON public.vehicles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

-- ============ BOOKINGS ============
CREATE SEQUENCE public.booking_ref_seq START 4582;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_location text NOT NULL,
  return_location text NOT NULL,
  pickup_at timestamptz NOT NULL,
  return_at timestamptz NOT NULL,
  days int NOT NULL,
  extras text[] NOT NULL DEFAULT '{}',
  rental_total numeric(10,2) NOT NULL,
  insurance_total numeric(10,2) NOT NULL DEFAULT 0,
  extras_total numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  deposit numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  terms_accepted boolean NOT NULL DEFAULT false,
  verify_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_dates CHECK (return_at > pickup_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings readable by parties" ON public.bookings FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "bookings updatable by parties" ON public.bookings FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

CREATE TABLE public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  label text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking events readable" ON public.booking_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.customer_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = auth.uid())
    )
  ));
CREATE POLICY "booking events insertable" ON public.booking_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.customer_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = auth.uid())
    )
  ));

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  company_rating int CHECK (company_rating BETWEEN 1 AND 5),
  comment text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visible reviews public" ON public.reviews FOR SELECT TO anon, authenticated
  USING (is_hidden = false);
CREATE POLICY "own reviews manageable" ON public.reviews FOR ALL TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    (customer_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
    ))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.refresh_vehicle_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  v_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  UPDATE public.vehicles v SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews r WHERE r.vehicle_id = v_id AND r.is_hidden = false), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews r WHERE r.vehicle_id = v_id AND r.is_hidden = false)
  WHERE v.id = v_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER reviews_refresh_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_vehicle_rating();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'booking',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking messages readable" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.customer_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = auth.uid())
    )
  ));
CREATE POLICY "booking messages insertable" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.customer_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = auth.uid())
    )
  ));

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());

-- ============ AVAILABILITY + BOOKING CREATION ============
CREATE OR REPLACE FUNCTION public.vehicle_is_free(_vehicle_id uuid, _from timestamptz, _to timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.vehicle_id = _vehicle_id
      AND b.status IN ('pending','confirmed','ready','active')
      AND tstzrange(b.pickup_at, b.return_at, '[)') && tstzrange(_from, _to, '[)')
  )
$$;

CREATE OR REPLACE FUNCTION public.create_booking(
  p_vehicle_id uuid,
  p_pickup_at timestamptz,
  p_return_at timestamptz,
  p_pickup_location text,
  p_return_location text,
  p_extras text[],
  p_terms_accepted boolean
) RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.vehicles;
  v_days int;
  v_rental numeric(10,2);
  v_insurance numeric(10,2);
  v_extras numeric(10,2) := 0;
  v_delivery numeric(10,2) := 0;
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_ref text;
  v_booking public.bookings;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'You must be signed in to book.'; END IF;
  IF NOT p_terms_accepted THEN RAISE EXCEPTION 'The rental agreement must be accepted.'; END IF;
  IF p_return_at <= p_pickup_at THEN RAISE EXCEPTION 'Return must be after pickup.'; END IF;
  IF p_pickup_at < now() - interval '1 hour' THEN RAISE EXCEPTION 'Pickup cannot be in the past.'; END IF;

  SELECT * INTO v FROM public.vehicles WHERE id = p_vehicle_id FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Vehicle not found.'; END IF;
  IF v.status <> 'approved' OR v.is_available = false THEN RAISE EXCEPTION 'This vehicle is not available for hire.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.vehicle_id = p_vehicle_id
      AND b.status IN ('pending','confirmed','ready','active')
      AND tstzrange(b.pickup_at, b.return_at, '[)') && tstzrange(p_pickup_at, p_return_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Those dates have just been taken. Please choose different dates.';
  END IF;

  v_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_return_at - p_pickup_at)) / 86400.0)::int);
  v_rental := ROUND(v.price_per_day * v_days, 2);
  v_insurance := ROUND(15 * v_days, 2);

  IF 'child_seat' = ANY(p_extras) THEN v_extras := v_extras + 5 * v_days; END IF;
  IF 'gps' = ANY(p_extras) THEN v_extras := v_extras + 4 * v_days; END IF;
  IF 'additional_driver' = ANY(p_extras) THEN v_extras := v_extras + 7 * v_days; END IF;
  IF 'delivery' = ANY(p_extras) THEN v_delivery := 25; END IF;

  v_tax := ROUND((v_rental + v_insurance + v_extras + v_delivery) * 0.08, 2);
  v_total := v_rental + v_insurance + v_extras + v_delivery + v_tax;
  v_ref := 'DH-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.booking_ref_seq')::text, 6, '0');

  INSERT INTO public.bookings (
    reference, vehicle_id, company_id, customer_id, pickup_location, return_location,
    pickup_at, return_at, days, extras, rental_total, insurance_total, extras_total,
    delivery_fee, tax, deposit, total, status, payment_status, terms_accepted
  ) VALUES (
    v_ref, v.id, v.company_id, v_uid, p_pickup_location, p_return_location,
    p_pickup_at, p_return_at, v_days, COALESCE(p_extras, '{}'), v_rental, v_insurance, v_extras,
    v_delivery, v_tax, v.deposit, v_total, 'pending', 'pending', true
  ) RETURNING * INTO v_booking;

  INSERT INTO public.booking_events (booking_id, label, note)
  VALUES (v_booking.id, 'Booking created', 'Reference ' || v_ref);

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (v_uid, 'Booking created', 'Your booking ' || v_ref || ' is awaiting confirmation.', 'booking');

  IF v.company_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category)
    SELECT c.owner_id, 'New booking request', 'Booking ' || v_ref || ' for ' || v.brand || ' ' || v.model, 'booking'
    FROM public.companies c WHERE c.id = v.company_id AND c.owner_id IS NOT NULL;
  END IF;

  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, timestamptz, timestamptz, text, text, text[], boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, timestamptz, timestamptz, text, text, text[], boolean) TO authenticated, service_role;

-- ============ STORAGE POLICIES ============
CREATE POLICY "vehicle photos readable by signed in" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicles');
CREATE POLICY "owners upload vehicle photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicles' AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "owners delete vehicle photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicles' AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')));

-- ============ DEMO DATA ============
INSERT INTO public.companies (id, name, description, phone, email, city, address, is_verified)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lusaka Prime Rentals', 'Family-run rental fleet serving Lusaka since 2014.', '+260 970 000 111', 'hello@lusakaprime.example', 'Lusaka', 'Plot 45, Great East Road, Lusaka', true),
  ('22222222-2222-2222-2222-222222222222', 'Copperbelt Drive Co.', 'Executive and 4x4 hire across the Copperbelt.', '+260 970 000 222', 'bookings@copperbeltdrive.example', 'Ndola', '12 Buteko Avenue, Ndola', true);

INSERT INTO public.vehicles (company_id, brand, model, year, vehicle_type, transmission, fuel_type, seats, doors, price_per_day, city, pickup_address, description, features, image_key, mileage, last_maintenance, next_maintenance, inspection_status, condition_note, deposit, status, rating, review_count)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Toyota', 'Corolla', 2022, 'Sedan', 'Automatic', 'Petrol', 5, 4, 55, 'Lusaka', 'Plot 45, Great East Road, Lusaka', 'Economical, comfortable sedan that suits city driving and longer trips alike.', ARRAY['Air conditioning','Bluetooth','USB','Reverse camera'], 'corolla', 48200, '2026-08-02', '2026-11-02', 'Passed', 'Excellent — no visible damage', 200, 'approved', 4.7, 24),
  ('11111111-1111-1111-1111-111111111111', 'Toyota', 'Yaris', 2021, 'Hatchback', 'Manual', 'Petrol', 5, 4, 38, 'Lusaka', 'Plot 45, Great East Road, Lusaka', 'Compact and easy to park — our most popular city runabout.', ARRAY['Air conditioning','Bluetooth','USB'], 'hatch', 61400, '2026-07-18', '2026-10-18', 'Passed', 'Good — minor cosmetic marks', 150, 'approved', 4.4, 17),
  ('11111111-1111-1111-1111-111111111111', 'Toyota', 'Land Cruiser Prado', 2023, 'SUV', 'Automatic', 'Diesel', 7, 5, 130, 'Lusaka', 'Plot 45, Great East Road, Lusaka', 'Seven-seat 4x4 built for game parks, gravel roads and family trips.', ARRAY['Air conditioning','GPS','Bluetooth','4x4','Roof rack','Reverse camera'], 'suv', 32100, '2026-08-20', '2026-11-20', 'Passed', 'Excellent — recently serviced', 400, 'approved', 4.9, 31),
  ('11111111-1111-1111-1111-111111111111', 'Mercedes-Benz', 'E-Class', 2022, 'Executive', 'Automatic', 'Petrol', 5, 4, 175, 'Lusaka', 'Plot 45, Great East Road, Lusaka', 'Chauffeur-grade executive saloon for business travel and events.', ARRAY['Air conditioning','Leather seats','GPS','Bluetooth','Cruise control'], 'exec', 21800, '2026-09-01', '2026-12-01', 'Passed', 'Excellent', 500, 'approved', 4.8, 12),
  ('22222222-2222-2222-2222-222222222222', 'Toyota', 'Corolla Quest', 2021, 'Sedan', 'Manual', 'Petrol', 5, 4, 48, 'Ndola', '12 Buteko Avenue, Ndola', 'Reliable workhorse sedan, ideal for long Copperbelt drives.', ARRAY['Air conditioning','USB','Bluetooth'], 'corolla', 73500, '2026-06-30', '2026-09-30', 'Passed', 'Good', 180, 'approved', 4.3, 9),
  ('22222222-2222-2222-2222-222222222222', 'Toyota', 'Prado TX', 2020, 'SUV', 'Automatic', 'Diesel', 7, 5, 115, 'Ndola', '12 Buteko Avenue, Ndola', 'Proven 4x4 for mine site visits and rural routes.', ARRAY['Air conditioning','4x4','GPS','Tow bar'], 'suv', 96700, '2026-07-05', '2026-10-05', 'Passed', 'Good — service history complete', 350, 'approved', 4.5, 15),
  ('22222222-2222-2222-2222-222222222222', 'Mercedes-Benz', 'E 220d', 2021, 'Executive', 'Automatic', 'Diesel', 5, 4, 160, 'Ndola', '12 Buteko Avenue, Ndola', 'Quiet, efficient executive saloon with full leather interior.', ARRAY['Air conditioning','Leather seats','GPS','Bluetooth'], 'exec', 40200, '2026-08-11', '2026-11-11', 'Passed', 'Excellent', 450, 'approved', 4.6, 8),
  ('22222222-2222-2222-2222-222222222222', 'Toyota', 'Vitz', 2019, 'Hatchback', 'Automatic', 'Petrol', 5, 4, 34, 'Ndola', '12 Buteko Avenue, Ndola', 'Budget-friendly automatic hatchback for short town trips.', ARRAY['Air conditioning','USB'], 'hatch', 104300, '2026-07-22', '2026-10-22', 'Passed', 'Fair — cosmetic wear', 120, 'approved', 4.1, 21);