import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreditCard, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { daysBetween, money, toLocalInput } from "@/lib/format";
import { EXTRA_OPTIONS, quote } from "@/lib/pricing";
import { VehicleImage } from "@/lib/vehicle-image";

export const Route = createFileRoute("/book/$id")({
  head: () => ({
    meta: [
      { title: "Book your car — DriveHire" },
      { name: "description", content: "Choose dates, extras and confirm your car hire." },
      { property: "og:title", content: "Book your car — DriveHire" },
      { property: "og:description", content: "Choose dates, extras and confirm your car hire." },
    ],
  }),
  component: () => <Gate>{() => <BookPage />}</Gate>,
});

function BookPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(10, 0, 0, 0);
  const later = new Date(tomorrow.getTime() + 3 * 86400000);
  const [pickupAt, setPickupAt] = useState(toLocalInput(tomorrow));
  const [returnAt, setReturnAt] = useState(toLocalInput(later));
  const [pickupLoc, setPickupLoc] = useState("");
  const [returnLoc, setReturnLoc] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [card, setCard] = useState("");

  const { data: v } = useQuery({
    queryKey: ["car", id],
    queryFn: async () => (await supabase.from("vehicles").select("*, companies(name,is_verified,city,phone)").eq("id", id).maybeSingle()).data,
  });
  const days = daysBetween(pickupAt, returnAt);
  const q = useMemo(() => (v ? quote(Number(v.price_per_day), days, extras, Number(v.deposit)) : null), [v, days, extras]);

  const book = useMutation({
    mutationFn: async () => {
      if (card.replace(/\D/g, "").length < 12) throw new Error("Enter a valid card number.");
      const { data, error } = await supabase.rpc("create_booking", {
        p_vehicle_id: id,
        p_pickup_at: new Date(pickupAt).toISOString(),
        p_return_at: new Date(returnAt).toISOString(),
        p_pickup_location: pickupLoc || v!.pickup_address || v!.city,
        p_return_location: returnLoc || pickupLoc || v!.pickup_address || v!.city,
        p_extras: extras,
        p_terms_accepted: terms,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (b) => { toast.success(`Booking ${b.reference} requested`); navigate({ to: "/bookings/$id", params: { id: b.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!v || !q) return <p className="p-8 text-muted-foreground">Loading…</p>;
  const row = (l: string, n: number) => <div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{money(n)}</span></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader title={`Book ${v.brand} ${v.model}`} subtitle={`${money(v.price_per_day)} per day · ${v.city}`} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="surface space-y-4 rounded-2xl bg-card p-5">
            <h2 className="font-bold">1. Dates & places</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Pickup</Label><Input type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} /></div>
              <div><Label>Return</Label><Input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} /></div>
              <div><Label>Pickup location</Label><Input placeholder={v.pickup_address ?? v.city} value={pickupLoc} onChange={(e) => setPickupLoc(e.target.value)} /></div>
              <div><Label>Return location</Label><Input placeholder="Same as pickup" value={returnLoc} onChange={(e) => setReturnLoc(e.target.value)} /></div>
            </div>
          </section>
          <section className="space-y-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">2. Extras</h2>
            {EXTRA_OPTIONS.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
                <Checkbox checked={extras.includes(o.id)} onCheckedChange={(c) => setExtras((x) => (c ? [...x, o.id] : x.filter((i) => i !== o.id)))} />
                <div className="flex-1"><p className="text-sm font-semibold">{o.label}</p><p className="text-xs text-muted-foreground">{o.description}</p></div>
                <span className="text-sm">{"perDay" in o ? `${money(o.perDay)}/day` : money(o.flat)}</span>
              </label>
            ))}
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" />Basic insurance (K15/day) is always included.</p>
          </section>
          <section className="space-y-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">3. Payment</h2>
            <div className="relative"><CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Card number" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" /></div>
            <p className="text-xs text-muted-foreground">Demo payment — your card is only charged once the company confirms. No real money moves yet.</p>
            <label className="flex items-start gap-2 text-sm"><Checkbox checked={terms} onCheckedChange={(c) => setTerms(!!c)} />I accept the rental agreement, cancellation policy ({v.cancellation_policy}) and refundable deposit of {money(v.deposit)}.</label>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-2 rounded-3xl bg-card p-5 text-sm shadow-[var(--shadow-lift)]">
            <div className="mb-3 aspect-[3/2] overflow-hidden rounded-2xl"><VehicleImage imageKey={v.image_key} imagePath={v.image_path} alt={v.model} /></div>
            <p className="font-semibold">{q.days} day{q.days > 1 ? "s" : ""}</p>
            {row("Rental", q.rental)}{row("Insurance", q.insurance)}{q.extras > 0 && row("Extras", q.extras)}{q.delivery > 0 && row("Delivery", q.delivery)}{row("Tax (8%)", q.tax)}
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total</span><span>{money(q.total)}</span></div>
            <p className="text-xs text-muted-foreground">+ {money(q.deposit)} refundable deposit held at pickup</p>
            <Button size="lg" className="mt-3 w-full rounded-xl" disabled={!terms || book.isPending} onClick={() => book.mutate()}>{book.isPending ? "Booking…" : "Confirm & pay"}</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
