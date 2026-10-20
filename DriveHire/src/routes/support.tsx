import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support and disputes — DriveHire" },
      {
        name: "description",
        content: "Get help with DriveHire accounts, vehicles, bookings, safety, and disputes.",
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const account = useAccount();
  const qc = useQueryClient();
  const [category, setCategory] = useState("booking");
  const [subject, setSubject] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [message, setMessage] = useState("");
  const {
    data: requests = [],
    error: requestsError,
    isLoading: requestsLoading,
  } = useQuery({
    queryKey: ["my-support-requests", account.user?.id],
    enabled: Boolean(account.user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (subject.trim().length < 3) throw new Error("Enter a subject of at least 3 characters.");
      if (message.trim().length < 10) throw new Error("Add at least 10 characters of detail.");
      const { error } = await supabase.from("support_requests").insert({
        user_id: account.user!.id,
        category,
        subject: subject.trim(),
        message: message.trim(),
        booking_id: bookingId.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubject("");
      setBookingId("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my-support-requests", account.user?.id] });
      toast.success("Your support request was submitted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        title="Support and disputes"
        subtitle="Tell us what happened and include your booking reference if you have one."
      />
      <section className="space-y-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-bold">Get help</h2>
        <p className="text-sm text-muted-foreground">
          Use this form for booking problems, cancellations, vehicle concerns, account access,
          privacy requests, payment questions, or safety reports. For immediate danger, contact
          local emergency services first. This app does not provide a live emergency response.
        </p>
        {!account.user && (
          <div className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            <p>Sign in to send a private support request and see replies.</p>
            <Button asChild className="mt-3">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        )}
        {account.user && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit.mutate();
            }}
          >
            <div>
              <Label htmlFor="support-category">What do you need help with?</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="support-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking">Booking or cancellation</SelectItem>
                  <SelectItem value="payment">Payment or deposit</SelectItem>
                  <SelectItem value="vehicle">Vehicle or listing</SelectItem>
                  <SelectItem value="safety">Safety concern</SelectItem>
                  <SelectItem value="account">Account or privacy</SelectItem>
                  <SelectItem value="other">Other or dispute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                minLength={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="support-booking">Booking ID (optional)</Label>
              <Input
                id="support-booking"
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
                placeholder="Paste the booking ID from the booking details page"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use the booking ID, not your card details or password.
              </p>
            </div>
            <div>
              <Label htmlFor="support-message">Details</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={5000}
                minLength={10}
                required
                rows={5}
                placeholder="Describe the issue and what outcome would help."
              />
              <p className="mt-1 text-xs text-muted-foreground">{message.length}/5000</p>
            </div>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit support request"}
            </Button>
          </form>
        )}
      </section>

      {account.user && (
        <section className="space-y-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-bold">Your support requests</h2>
          {requestsLoading && <p className="text-sm text-muted-foreground">Loading requests…</p>}
          {requestsError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load your requests: {requestsError.message}
            </p>
          )}
          {!requestsLoading && !requestsError && requests.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven't sent a support request yet.</p>
          )}
          {requests.map((request) => (
            <article key={request.id} className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{request.subject}</h3>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-sm text-muted-foreground">{request.message}</p>
              <p className="text-xs text-muted-foreground">
                {request.category} · Submitted {dateTime(request.created_at)}
                {request.booking_id ? ` · Booking ${request.booking_id}` : ""}
              </p>
              {request.admin_response && (
                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <p className="font-semibold">DriveHire support</p>
                  <p className="mt-1 whitespace-pre-wrap">{request.admin_response}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated {dateTime(request.updated_at)}
                  </p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
