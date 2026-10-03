/**
 * Client-side cost estimate. Mirrors the server calculation in create_booking
 * so customers see a transparent breakdown before they book, but the server
 * figures are always the ones charged.
 */
export const EXTRA_OPTIONS = [
  { id: "child_seat", label: "Child seat", perDay: 5, description: "Fitted before pickup" },
  { id: "gps", label: "GPS navigation", perDay: 4, description: "Offline maps included" },
  {
    id: "additional_driver",
    label: "Additional driver",
    perDay: 7,
    description: "Second licensed driver",
  },
  { id: "delivery", label: "Vehicle delivery", flat: 25, description: "Delivered to your address" },
] as const;

export const INSURANCE_PER_DAY = 15;
export const TAX_RATE = 0.08;

export type Quote = {
  days: number;
  rental: number;
  insurance: number;
  extras: number;
  delivery: number;
  tax: number;
  total: number;
  deposit: number;
};

export function quote(pricePerDay: number, days: number, extras: string[], deposit: number): Quote {
  const d = Math.max(1, days || 1);
  const rental = round(pricePerDay * d);
  const insurance = round(INSURANCE_PER_DAY * d);
  let extrasTotal = 0;
  let delivery = 0;
  for (const option of EXTRA_OPTIONS) {
    if (!extras.includes(option.id)) continue;
    if ("perDay" in option) extrasTotal += option.perDay * d;
    else delivery += option.flat;
  }
  extrasTotal = round(extrasTotal);
  const tax = round((rental + insurance + extrasTotal + delivery) * TAX_RATE);
  return {
    days: d,
    rental,
    insurance,
    extras: extrasTotal,
    delivery,
    tax,
    total: round(rental + insurance + extrasTotal + delivery + tax),
    deposit,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function extraLabel(id: string) {
  return EXTRA_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
