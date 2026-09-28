CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role public.app_role := 'customer';
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'owner' THEN v_role := 'owner'; END IF;
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT (user_id, role) DO NOTHING;
  IF v_role = 'owner' AND COALESCE(NEW.raw_user_meta_data->>'company_name','') <> '' THEN
    INSERT INTO public.companies (owner_id, name, city, phone, email, is_verified)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'company_name', COALESCE(NEW.raw_user_meta_data->>'city','Lusaka'), NEW.raw_user_meta_data->>'phone', NEW.email, false);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_booking_status(p_booking_id uuid, p_status text, p_note text DEFAULT NULL)
 RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b public.bookings; v_uid uuid := auth.uid(); is_owner boolean; is_admin boolean;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  is_admin := public.has_role(v_uid, 'admin');
  is_owner := EXISTS (SELECT 1 FROM public.companies c WHERE c.id = b.company_id AND c.owner_id = v_uid);
  IF p_status = 'cancelled' AND b.customer_id = v_uid THEN
    IF b.status NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'This booking can no longer be cancelled.'; END IF;
  ELSIF p_status IN ('confirmed','rejected','ready','active','completed','cancelled') AND (is_owner OR is_admin) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'You are not allowed to make this change.';
  END IF;
  UPDATE public.bookings SET status = p_status,
    payment_status = CASE WHEN p_status IN ('rejected','cancelled') AND payment_status = 'paid' THEN 'refunded'
                          WHEN p_status = 'confirmed' THEN 'paid' ELSE payment_status END
  WHERE id = p_booking_id RETURNING * INTO b;
  INSERT INTO public.booking_events (booking_id, label, note) VALUES (b.id, 'Status: ' || p_status, p_note);
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (b.customer_id, 'Booking ' || b.reference || ' ' || p_status, COALESCE(p_note, 'Your booking status changed.'), 'booking');
  RETURN b;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_booking_status(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;