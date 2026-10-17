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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money } from "@/lib/format";
import { extraLabel } from "@/lib/pricing";
import { VehicleImage } from "@/lib/vehicle-image";

export const Route = createFileRoute("/bookings/$id")({
  head: () => ({
    meta: [
      { title: "Booking details — DriveHire" },
      {
        name: "description",
        content: "Status, timeline, pickup code and messages for your booking.",
      },
      { property: "og:title", content: "Booking details — DriveHire" },
      {
        property: "og:description",
        content: "Status, timeline, pickup code and messages for your booking.",
      },
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
  const [requestType, setRequestType] = useState<"cancellation" | "modification">("cancellation");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestedPickup, setRequestedPickup] = useState("");
  const [requestedReturn, setRequestedReturn] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const { data: b } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () =>
      (
        await supabase
          .from("bookings")
          .select(
            "*, vehicles(brand,model,image_key,image_path,cancellation_policy), companies(name,phone,owner_id)",
          )
          .eq("id", id)
          .maybeSingle()
      ).data,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["events", id],
    queryFn: async () =>
      (await supabase.from("booking_events").select("*").eq("booking_id", id).order("created_at"))
        .data ?? [],
  });
  const {
    data: changeRequests = [],
    error: changeRequestsError,
    isLoading: changeRequestsLoading,
  } = useQuery({
    queryKey: ["booking-change-requests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_change_requests")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ["msgs", id],
    refetchInterval: 8000,
    queryFn: async () =>
      (await supabase.from("messages").select("*").eq("booking_id", id).order("created_at")).data ??
      [],
  });
  const { data: review } = useQuery({
    queryKey: ["review", id],
    queryFn: async () =>
      (await supabase.from("reviews").select("*").eq("booking_id", id).maybeSingle()).data,
  });

  useEffect(() => {
    if (b)
      QRCode.toDataURL(`DRIVEHIRE:${b.reference}:${b.verify_token}`, {
        margin: 1,
        width: 220,
      }).then(setQr);
  }, [b]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["booking", id] });
    qc.invalidateQueries({ queryKey: ["events", id] });
    qc.invalidateQueries({ queryKey: ["booking-change-requests", id] });
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
    qc.invalidateQueries({ queryKey: ["co-bookings"] });
  };
  const setStatus = useMutation({
    mutationFn: async (s: string) => {
      const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_status: s });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Booking updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const requestChange = useMutation({
    mutationFn: async () => {
      if (!requestMessage.trim()) throw new Error("Add a message for the rental company.");
      if (requestType === "modification" && (!requestedPickup || !requestedReturn)) {
        throw new Error("Choose the requested pickup and return dates.");
      }
      const { error } = await supabase.rpc("request_booking_change", {
        p_booking_id: id,
        p_request_type: requestType,
        p_message: requestMessage.trim(),
        p_pickup_at:
          requestType === "modification" ? new Date(requestedPickup).toISOString() : null,
        p_return_at:
          requestType === "modification" ? new Date(requestedReturn).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRequestMessage("");
      refresh();
      toast.success("Your request was sent to the rental company.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const decideChange = useMutation({
    mutationFn: async ({
      requestId,
      decision,
    }: {
      requestId: string;
      decision: "approved" | "declined";
    }) => {
      const { error } = await supabase.rpc("decide_booking_change", {
        p_request_id: requestId,
        p_decision: decision,
        p_note: decisionNote.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_, { decision }) => {
      setDecisionNote("");
      refresh();
      toast.success(decision === "approved" ? "Request approved" : "Request declined");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("messages")
        .insert({ booking_id: id, sender_id: userId, body: msg.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["msgs", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        booking_id: id,
        vehicle_id: b!.vehicle_id,
        customer_id: userId,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review", id] });
      toast.success("Thanks for your review!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!b) return <p className="p-8 text-muted-foreground">Loading…</p>;
  const isCustomer = b.customer_id === userId;
  const hasPendingChange = changeRequests.some((r) => r.status === "pending");
  const statusDescription: Record<string, string> = {
    pending: "Your request is with the rental company. They will confirm or decline it.",
    confirmed: "The rental company confirmed your booking. Contact them if your plans change.",
    ready: "The car is ready for pickup. Show the pickup code to the rental company.",
    active: "Your rental is in progress. Contact the company if you need assistance.",
    completed: "This rental is complete. You can leave a review for the car and company.",
    cancelled: "This booking has been cancelled.",
    rejected: "The rental company declined this booking request.",
  };
  const row = (l: string, n: number) => (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{l}</span>
      <span>{money(n)}</span>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="h-20 w-28 overflow-hidden rounded-xl">
            <VehicleImage
              imageKey={b.vehicles?.image_key}
              imagePath={b.vehicles?.image_path}
              alt=""
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{b.reference}</p>
            <h1 className="text-xl font-extrabold">
              {b.vehicles?.brand} {b.vehicles?.model}
            </h1>
            <p className="text-sm text-muted-foreground">{b.companies?.name}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={b.status} />
            <p className="mt-1 text-xs text-muted-foreground">Payment: {b.payment_status}</p>
          </div>
        </div>
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {statusDescription[b.status] ?? "Your booking status has been updated."}
        </p>

        <section className="grid gap-3 rounded-2xl bg-card p-5 text-sm shadow-[var(--shadow-card)] sm:grid-cols-2">
          <p>
            <b>Pickup</b>
            <br />
            {dateTime(b.pickup_at)}
            <br />
            <span className="text-muted-foreground">{b.pickup_location}</span>
          </p>
          <p>
            <b>Return</b>
            <br />
            {dateTime(b.return_at)}
            <br />
            <span className="text-muted-foreground">{b.return_location}</span>
          </p>
          {b.extras.length > 0 && (
            <p className="sm:col-span-2">
              <b>Extras:</b> {b.extras.map(extraLabel).join(", ")}
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Timeline</h2>
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">No booking updates yet.</li>
            )}
            {events.map((e) => (
              <li key={e.id} className="relative text-sm">
                <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary" />
                <p className="font-semibold">{e.label}</p>
                {e.note && <p className="text-muted-foreground">{e.note}</p>}
                <p className="text-xs text-muted-foreground">{dateTime(e.created_at)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Booking change requests</h2>
          {changeRequestsError && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              Couldn't load booking requests: {changeRequestsError.message}
            </p>
          )}
          {changeRequestsLoading && (
            <p className="text-sm text-muted-foreground">Loading requests…</p>
          )}
          {!changeRequestsLoading && !changeRequestsError && changeRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No cancellation or date-change requests.
            </p>
          )}
          <div className="space-y-3">
            {changeRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold capitalize">
                    {request.request_type === "cancellation"
                      ? "Cancellation request"
                      : "Date change request"}
                  </p>
                  <StatusBadge status={request.status} />
                </div>
                {request.request_type === "modification" &&
                  request.requested_pickup_at &&
                  request.requested_return_at && (
                    <p className="mt-2 text-sm">
                      Pickup {dateTime(request.requested_pickup_at)} · Return{" "}
                      {dateTime(request.requested_return_at)}
                    </p>
                  )}
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {request.message}
                </p>
                {request.decision_note && (
                  <p className="mt-2 text-sm">
                    Company note:{" "}
                    <span className="text-muted-foreground">{request.decision_note}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {dateTime(request.created_at)}
                </p>
                {!isCustomer && request.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Optional note to the customer"
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={decideChange.isPending}
                        onClick={() =>
                          decideChange.mutate({ requestId: request.id, decision: "approved" })
                        }
                      >
                        Approve request
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decideChange.isPending}
                        onClick={() =>
                          decideChange.mutate({ requestId: request.id, decision: "declined" })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
          {isCustomer &&
            ["pending", "confirmed"].includes(b.status) &&
            !changeRequestsLoading &&
            !changeRequestsError && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {hasPendingChange ? (
                  <p className="text-sm text-muted-foreground">
                    Your request is awaiting a response. You can send another after it is handled.
                  </p>
                ) : (
                  <>
                    <h3 className="font-semibold">Need to change your plans?</h3>
                    <Select
                      value={requestType}
                      onValueChange={(value) =>
                        setRequestType(value as "cancellation" | "modification")
                      }
                    >
                      <SelectTrigger aria-label="Request type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cancellation">Request cancellation</SelectItem>
                        <SelectItem value="modification">Request new dates</SelectItem>
                      </SelectContent>
                    </Select>
                    {requestType === "modification" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="requested-pickup"
                            className="mb-1 block text-xs text-muted-foreground"
                          >
                            Requested pickup
                          </label>
                          <Input
                            id="requested-pickup"
                            type="datetime-local"
                            min={new Date().toISOString().slice(0, 16)}
                            value={requestedPickup}
                            onChange={(e) => setRequestedPickup(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="requested-return"
                            className="mb-1 block text-xs text-muted-foreground"
                          >
                            Requested return
                          </label>
                          <Input
                            id="requested-return"
                            type="datetime-local"
                            min={requestedPickup || new Date().toISOString().slice(0, 16)}
                            value={requestedReturn}
                            onChange={(e) => setRequestedReturn(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground sm:col-span-2">
                          If approved, the booking total will be recalculated using the new dates.
                        </p>
                      </div>
                    )}
                    <Textarea
                      placeholder={
                        requestType === "cancellation"
                          ? "Tell the company why you need to cancel"
                          : "Add a note about your requested dates"
                      }
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      maxLength={1000}
                    />
                    <Button
                      variant={requestType === "cancellation" ? "destructive" : "default"}
                      disabled={requestChange.isPending || hasPendingChange}
                      onClick={() => requestChange.mutate()}
                    >
                      {requestChange.isPending
                        ? "Sending request…"
                        : requestType === "cancellation"
                          ? "Request cancellation"
                          : "Request date change"}
                    </Button>
                  </>
                )}
              </div>
            )}
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Messages</h2>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {m.body}
              </div>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (msg.trim()) send.mutate();
            }}
          >
            <Input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Write a message…"
            />
            <Button type="submit" disabled={send.isPending}>
              Send
            </Button>
          </form>
        </section>

        {isCustomer && b.status === "completed" && (
          <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 font-bold">Rate your rental</h2>
            {review ? (
              <p className="text-sm">You rated this {review.rating}/5. Thank you!</p>
            ) : (
              <>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                      <Star
                        className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-border"}`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  className="mt-3"
                  placeholder="How was the car and service?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button className="mt-3" onClick={() => rate.mutate()} disabled={rate.isPending}>
                  Submit review
                </Button>
              </>
            )}
          </section>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {qr && ["confirmed", "ready", "active"].includes(b.status) && (
          <div className="rounded-3xl bg-card p-5 text-center shadow-[var(--shadow-lift)]">
            <p className="font-bold">Pickup code</p>
            <img src={qr} alt="Booking QR code" className="mx-auto mt-2" />
            <p className="text-xs text-muted-foreground">Show this at the counter</p>
          </div>
        )}
        <div className="space-y-2 rounded-3xl bg-card p-5 text-sm shadow-[var(--shadow-card)]">
          <p className="font-bold">
            Rental agreement · {b.days} day{b.days > 1 ? "s" : ""}
          </p>
          {row("Rental", b.rental_total)}
          {row("Insurance", b.insurance_total)}
          {b.extras_total > 0 && row("Extras", b.extras_total)}
          {b.delivery_fee > 0 && row("Delivery", b.delivery_fee)}
          {row("Tax", b.tax)}
          <div className="flex justify-between border-t border-border pt-2 font-extrabold">
            <span>Total</span>
            <span>{money(b.total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Deposit {money(b.deposit)} · {b.vehicles?.cancellation_policy}
          </p>
        </div>
        {b.companies?.phone && (
          <Button asChild variant="outline" className="w-full">
            <a href={`tel:${b.companies.phone}`}>
              <Phone className="h-4 w-4" />
              Call company / roadside help
            </a>
          </Button>
        )}
        {!isCustomer && <OwnerActions status={b.status} onSet={(s) => setStatus.mutate(s)} />}
      </aside>
    </div>
  );
}

export function OwnerActions({ status, onSet }: { status: string; onSet: (s: string) => void }) {
  const next: Record<string, { s: string; l: string; v?: "destructive" | "outline" }[]> = {
    pending: [
      { s: "confirmed", l: "Accept" },
      { s: "rejected", l: "Reject", v: "destructive" },
    ],
    confirmed: [
      { s: "ready", l: "Mark ready for pickup" },
      { s: "cancelled", l: "Cancel", v: "outline" },
    ],
    ready: [{ s: "active", l: "Car picked up" }],
    active: [{ s: "completed", l: "Car returned" }],
  };
  return (
    <div className="flex flex-wrap gap-2">
      {(next[status] ?? []).map((a) => (
        <Button key={a.s} size="sm" variant={a.v} onClick={() => onSet(a.s)}>
          {a.l}
        </Button>
      ))}
    </div>
  );
}
