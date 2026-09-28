import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Phone, Star } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money } from "@/lib/format";
import { extraLabel } from "@/lib/pricing";
import { VehicleImage } from "@/lib/vehicle-image";

export const Route = createFileRoute("/bookings/$id")({
  head: () => ({
    meta: [
      { title: "Booking details — DriveHire" },
      { name: "description", content: "Status, timeline, pickup code and messages for your booking." },
      { property: "og:title", content: "Booking details — DriveHire" },
      { property: "og:description", content: "Status, timeline, pickup code and messages for your booking." },
    ],
  }),
  component: () => <Gate>{(a) => <Detail userId={a.user!.id} />}</Gate>,
});

function Detail({ userId }: { userId: string }) {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [qr, setQr] = useState("");
  const [msg, setMsg] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: b } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => (await supabase.from("bookings").select("*, vehicles(brand,model,image_key,image_path,cancellation_policy), companies(name,phone,owner_id)").eq("id", id).maybeSingle()).data,
  });
  const { data: events = [] } = useQuery({ queryKey: ["events", id], queryFn: async () => (await supabase.from("booking_events").select("*").eq("booking_id", id).order("created_at")).data ?? [] });
  const { data: msgs = [] } = useQuery({ queryKey: ["msgs", id], refetchInterval: 8000, queryFn: async () => (await supabase.from("messages").select("*").eq("booking_id", id).order("created_at")).data ?? [] });
  const { data: review } = useQuery({ queryKey: ["review", id], queryFn: async () => (await supabase.from("reviews").select("*").eq("booking_id", id).maybeSingle()).data });

  useEffect(() => { if (b) QRCode.toDataURL(`DRIVEHIRE:${b.reference}:${b.verify_token}`, { margin: 1, width: 220 }).then(setQr); }, [b]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["booking", id] }); qc.invalidateQueries({ queryKey: ["events", id] }); };
  const setStatus = useMutation({
    mutationFn: async (s: string) => { const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_status: s }); if (error) throw error; },
    onSuccess: () => { refresh(); toast.success("Booking updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("messages").insert({ booking_id: id, sender_id: userId, body: msg.trim() }); if (error) throw error; },
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: ["msgs", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rate = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("reviews").insert({ booking_id: id, vehicle_id: b!.vehicle_id, customer_id: userId, rating, comment: comment || null }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["review", id] }); toast.success("Thanks for your review!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!b) return <p className="p-8 text-muted-foreground">Loading…</p>;
  const isCustomer = b.customer_id === userId;
  const row = (l: string, n: number) => <div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{money(n)}</span></div>;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="h-20 w-28 overflow-hidden rounded-xl"><VehicleImage imageKey={b.vehicles?.image_key} imagePath={b.vehicles?.image_path} alt="" /></div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{b.reference}</p>
            <h1 className="text-xl font-extrabold">{b.vehicles?.brand} {b.vehicles?.model}</h1>
            <p className="text-sm text-muted-foreground">{b.companies?.name}</p>
          </div>
          <div className="text-right"><StatusBadge status={b.status} /><p className="mt-1 text-xs text-muted-foreground">Payment: {b.payment_status}</p></div>
        </div>

        <section className="grid gap-3 rounded-2xl bg-card p-5 text-sm shadow-[var(--shadow-card)] sm:grid-cols-2">
          <p><b>Pickup</b><br />{dateTime(b.pickup_at)}<br /><span className="text-muted-foreground">{b.pickup_location}</span></p>
          <p><b>Return</b><br />{dateTime(b.return_at)}<br /><span className="text-muted-foreground">{b.return_location}</span></p>
          {b.extras.length > 0 && <p className="sm:col-span-2"><b>Extras:</b> {b.extras.map(extraLabel).join(", ")}</p>}
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Timeline</h2>
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative text-sm"><span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary" />
                <p className="font-semibold">{e.label}</p>{e.note && <p className="text-muted-foreground">{e.note}</p>}<p className="text-xs text-muted-foreground">{dateTime(e.created_at)}</p></li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Messages</h2>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.body}</div>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (msg.trim()) send.mutate(); }}>
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message…" /><Button type="submit" disabled={send.isPending}>Send</Button>
          </form>
        </section>

        {isCustomer && b.status === "completed" && (
          <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 font-bold">Rate your rental</h2>
            {review ? <p className="text-sm">You rated this {review.rating}/5. Thank you!</p> : (
              <>
                <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-border"}`} /></button>)}</div>
                <Textarea className="mt-3" placeholder="How was the car and service?" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button className="mt-3" onClick={() => rate.mutate()} disabled={rate.isPending}>Submit review</Button>
              </>
            )}
          </section>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {qr && ["confirmed", "ready", "active"].includes(b.status) && (
          <div className="rounded-3xl bg-card p-5 text-center shadow-[var(--shadow-lift)]">
            <p className="font-bold">Pickup code</p><img src={qr} alt="Booking QR code" className="mx-auto mt-2" /><p className="text-xs text-muted-foreground">Show this at the counter</p>
          </div>
        )}
        <div className="space-y-2 rounded-3xl bg-card p-5 text-sm shadow-[var(--shadow-card)]">
          <p className="font-bold">Rental agreement · {b.days} day{b.days > 1 ? "s" : ""}</p>
          {row("Rental", b.rental_total)}{row("Insurance", b.insurance_total)}{b.extras_total > 0 && row("Extras", b.extras_total)}{b.delivery_fee > 0 && row("Delivery", b.delivery_fee)}{row("Tax", b.tax)}
          <div className="flex justify-between border-t border-border pt-2 font-extrabold"><span>Total</span><span>{money(b.total)}</span></div>
          <p className="text-xs text-muted-foreground">Deposit {money(b.deposit)} · {b.vehicles?.cancellation_policy}</p>
        </div>
        {b.companies?.phone && <Button asChild variant="outline" className="w-full"><a href={`tel:${b.companies.phone}`}><Phone className="h-4 w-4" />Call company / roadside help</a></Button>}
        {isCustomer && ["pending", "confirmed"].includes(b.status) && (
          <Button variant="destructive" className="w-full" onClick={() => confirm("Cancel this booking?") && setStatus.mutate("cancelled")}>Cancel booking</Button>
        )}
        {!isCustomer && <OwnerActions status={b.status} onSet={(s) => setStatus.mutate(s)} />}
      </aside>
    </div>
  );
}

export function OwnerActions({ status, onSet }: { status: string; onSet: (s: string) => void }) {
  const next: Record<string, { s: string; l: string; v?: "destructive" | "outline" }[]> = {
    pending: [{ s: "confirmed", l: "Accept" }, { s: "rejected", l: "Reject", v: "destructive" }],
    confirmed: [{ s: "ready", l: "Mark ready for pickup" }, { s: "cancelled", l: "Cancel", v: "outline" }],
    ready: [{ s: "active", l: "Car picked up" }],
    active: [{ s: "completed", l: "Car returned" }],
  };
  return <div className="flex flex-wrap gap-2">{(next[status] ?? []).map((a) => <Button key={a.s} size="sm" variant={a.v} onClick={() => onSet(a.s)}>{a.l}</Button>)}</div>;
}
