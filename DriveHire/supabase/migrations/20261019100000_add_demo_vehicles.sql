INSERT INTO public.vehicles (
  company_id,
  brand,
  model,
  year,
  vehicle_type,
  transmission,
  fuel_type,
  seats,
  doors,
  price_per_day,
  city,
  pickup_address,
  description,
  features,
  image_key,
  mileage,
  last_maintenance,
  next_maintenance,
  inspection_status,
  condition_note,
  deposit,
  status
)
SELECT
  demo.company_id,
  demo.brand,
  demo.model,
  demo.year,
  demo.vehicle_type,
  demo.transmission,
  demo.fuel_type,
  demo.seats,
  demo.doors,
  demo.price_per_day,
  demo.city,
  demo.pickup_address,
  demo.description,
  demo.features,
  demo.image_key,
  demo.mileage,
  demo.last_maintenance,
  demo.next_maintenance,
  'Passed',
  'Demo listing — verify vehicle condition before publishing.',
  demo.deposit,
  'approved'
FROM (
  VALUES
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Toyota', 'RAV4', 2022,
      'SUV', 'Automatic', 'Petrol', 5, 5, 95::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'Versatile five-seat SUV for comfortable city travel and weekend trips.',
      ARRAY['Air conditioning', 'Bluetooth', 'Reverse camera', 'Cruise control'],
      'suv', 38600, DATE '2026-08-15', DATE '2026-11-15', 280::numeric
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Honda', 'CR-V', 2021,
      'SUV', 'Automatic', 'Petrol', 5, 5, 105::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'Spacious family SUV with a comfortable cabin and generous luggage space.',
      ARRAY['Air conditioning', 'Bluetooth', 'GPS', 'Reverse camera'],
      'suv', 52400, DATE '2026-07-29', DATE '2026-10-29', 300::numeric
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Mazda', 'CX-5', 2023,
      'SUV', 'Automatic', 'Petrol', 5, 5, 110::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'Modern crossover with a refined interior for business or family travel.',
      ARRAY['Air conditioning', 'Bluetooth', 'Leather seats', 'Reverse camera'],
      'suv', 27100, DATE '2026-09-05', DATE '2026-12-05', 320::numeric
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Suzuki', 'Swift', 2022,
      'Hatchback', 'Automatic', 'Petrol', 5, 5, 42::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'Compact automatic hatchback that is easy to park and economical around town.',
      ARRAY['Air conditioning', 'Bluetooth', 'USB'],
      'hatch', 33800, DATE '2026-08-08', DATE '2026-11-08', 150::numeric
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Honda', 'Fit', 2021,
      'Hatchback', 'Automatic', 'Petrol', 5, 5, 40::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'Practical city car with flexible seating and a surprisingly roomy cabin.',
      ARRAY['Air conditioning', 'Bluetooth', 'USB', 'Reverse camera'],
      'hatch', 45100, DATE '2026-07-24', DATE '2026-10-24', 140::numeric
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Toyota', 'Axio', 2020,
      'Sedan', 'Automatic', 'Petrol', 5, 4, 46::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'Reliable compact sedan with a comfortable ride for daily errands and longer journeys.',
      ARRAY['Air conditioning', 'Bluetooth', 'USB'],
      'corolla', 68900, DATE '2026-07-12', DATE '2026-10-12', 170::numeric
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid, 'Toyota', 'HiAce', 2021,
      'Van', 'Manual', 'Diesel', 12, 4, 140::numeric, 'Lusaka',
      'Plot 45, Great East Road, Lusaka',
      'People carrier suited to group transfers, events and airport trips.',
      ARRAY['Air conditioning', 'USB', 'Sliding doors'],
      'suv', 79200, DATE '2026-08-01', DATE '2026-11-01', 400::numeric
    ),
    (
      '22222222-2222-2222-2222-222222222222'::uuid, 'Nissan', 'X-Trail', 2022,
      'SUV', 'Automatic', 'Petrol', 7, 5, 100::numeric, 'Ndola',
      '12 Buteko Avenue, Ndola',
      'Seven-seat SUV with room for family trips and Copperbelt excursions.',
      ARRAY['Air conditioning', 'GPS', 'Bluetooth', 'Reverse camera'],
      'suv', 40900, DATE '2026-08-12', DATE '2026-11-12', 290::numeric
    ),
    (
      '22222222-2222-2222-2222-222222222222'::uuid, 'Mazda', 'Demio', 2020,
      'Hatchback', 'Automatic', 'Petrol', 5, 5, 36::numeric, 'Ndola',
      '12 Buteko Avenue, Ndola',
      'Affordable automatic hatchback for easy everyday journeys around Ndola.',
      ARRAY['Air conditioning', 'Bluetooth', 'USB'],
      'hatch', 71800, DATE '2026-07-16', DATE '2026-10-16', 130::numeric
    ),
    (
      '22222222-2222-2222-2222-222222222222'::uuid, 'Nissan', 'Note', 2021,
      'Hatchback', 'Automatic', 'Petrol', 5, 5, 39::numeric, 'Ndola',
      '12 Buteko Avenue, Ndola',
      'Comfortable compact with generous headroom and practical boot space.',
      ARRAY['Air conditioning', 'Bluetooth', 'USB', 'Reverse camera'],
      'hatch', 53200, DATE '2026-08-04', DATE '2026-11-04', 145::numeric
    ),
    (
      '22222222-2222-2222-2222-222222222222'::uuid, 'Toyota', 'Hilux', 2022,
      'Pickup', 'Manual', 'Diesel', 5, 4, 125::numeric, 'Ndola',
      '12 Buteko Avenue, Ndola',
      'Rugged double-cab pickup for work travel and rural routes.',
      ARRAY['Air conditioning', '4x4', 'Bluetooth', 'Tow bar'],
      'suv', 61600, DATE '2026-08-18', DATE '2026-11-18', 380::numeric
    ),
    (
      '22222222-2222-2222-2222-222222222222'::uuid, 'BMW', '5 Series', 2021,
      'Executive', 'Automatic', 'Diesel', 5, 4, 185::numeric, 'Ndola',
      '12 Buteko Avenue, Ndola',
      'Executive saloon with a quiet cabin for business travel and special occasions.',
      ARRAY['Air conditioning', 'Leather seats', 'GPS', 'Bluetooth', 'Cruise control'],
      'exec', 35400, DATE '2026-08-25', DATE '2026-11-25', 500::numeric
    )
) AS demo (
  company_id,
  brand,
  model,
  year,
  vehicle_type,
  transmission,
  fuel_type,
  seats,
  doors,
  price_per_day,
  city,
  pickup_address,
  description,
  features,
  image_key,
  mileage,
  last_maintenance,
  next_maintenance,
  deposit
)
WHERE EXISTS (
  SELECT 1 FROM public.companies c WHERE c.id = demo.company_id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.vehicles existing
  WHERE existing.company_id = demo.company_id
    AND existing.brand = demo.brand
    AND existing.model = demo.model
    AND existing.year = demo.year
);
