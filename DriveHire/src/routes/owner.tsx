import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money } from "@/lib/format";
import { VehicleImage } from "@/lib/vehicle-image";
import { OwnerActions } from "./bookings.$id";

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

type CompanyBooking = Tables<"bookings"> & {
  vehicles: { brand: string; model: string } | null;
};

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Company dashboard — DriveHire" },
      { name: "description", content: "Manage your fleet, bookings and earnings." },
      { property: "og:title", content: "Company dashboard — DriveHire" },
      { property: "og:description", content: "Manage your fleet, bookings and earnings." },
    ],
  }),
  component: () => <Gate need="owner">{(a) => <Dashboard userId={a.user!.id} />}</Gate>,
});

function Dashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [reportStart, setReportStart] = useState(() => {
    const now = new Date();
    return localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [reportEnd, setReportEnd] = useState(() => localDateKey(new Date()));
  const {
    data: company,
    isLoading,
    error: companyError,
  } = useQuery({
    queryKey: ["my-company", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const cid = company?.id;
  const { data: vehicles = [], error: vehiclesError } = useQuery({
    queryKey: ["co-vehicles", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", cid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: bookings = [], error: bookingsError } = useQuery({
    queryKey: ["co-bookings", cid],
    enabled: !!cid,
    queryFn: async () => {
      const allBookings: CompanyBooking[] = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*, vehicles(brand,model)")
          .eq("company_id", cid!)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        allBookings.push(...data);
        if (data.length < pageSize) return allBookings;
      }
    },
  });
  const { data: reviews = [], error: reviewsError } = useQuery({
    queryKey: ["co-reviews", cid],
    enabled: vehicles.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .in(
          "vehicle_id",
          vehicles.map((v) => v.id),
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_status: s });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["co-bookings"] });
      toast.success("Booking updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_available: isAvailable })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["co-vehicles"] });
      toast.success("Fleet availability updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (companyError)
    return (
      <p role="alert" className="p-8 text-destructive">
        Couldn't load your company dashboard: {companyError.message}
      </p>
    );
  if (!company) return <CreateCompany userId={userId} />;

  const earned = bookings
    .filter((b) => ["confirmed", "ready", "active", "completed"].includes(b.status))
    .reduce((s, b) => s + Number(b.total), 0);
  const stats = [
    { l: "Confirmed booking value", v: money(earned) },
    { l: "Pending requests", v: bookings.filter((b) => b.status === "pending").length },
    { l: "Active rentals", v: bookings.filter((b) => b.status === "active").length },
    { l: "Cars", v: vehicles.length },
  ];
  const monthDays = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = calendarMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const reportInvalid = reportStart > reportEnd;
  const reportBookings = bookings.filter((booking) => {
    const pickupDay = localDateKey(new Date(booking.pickup_at));
    return pickupDay >= reportStart && pickupDay <= reportEnd;
  });
  const reportConfirmed = reportBookings.filter((booking) =>
    ["confirmed", "ready", "active", "completed"].includes(booking.status),
  );
  const reportRevenue = reportConfirmed.reduce((sum, booking) => sum + Number(booking.total), 0);
  const exportReport = () => {
    if (reportInvalid) {
      toast.error("The report start date must be before the end date.");
      return;
    }
    const rows = [
      ["Booking reference", "Vehicle", "Status", "Pickup", "Return", "Total (K)", "Payment status"],
      ...reportBookings.map((booking) => [
        booking.reference,
        `${booking.vehicles?.brand ?? ""} ${booking.vehicles?.model ?? ""}`.trim(),
        booking.status,
        booking.pickup_at,
        booking.return_at,
        Number(booking.total).toFixed(2),
        booking.payment_status,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `drivehire-bookings-${reportStart}-to-${reportEnd}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        title={company.name}
        subtitle={
          company.is_verified
            ? "Verified company"
            : "Awaiting verification by DriveHire — your cars go live once verified"
        }
        action={<VehicleDialog companyId={company.id} city={company.city} />}
      />
      {(vehiclesError || bookingsError) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Dashboard data could not be fully loaded:{" "}
          {[vehiclesError?.message, bookingsError?.message].filter(Boolean).join(" ")}
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className="text-2xl font-extrabold">{s.v}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="calendar">Availability calendar</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings" className="space-y-3">
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <Link to="/bookings/$id" params={{ id: b.id }} className="min-w-0 flex-1">
                <p className="font-semibold">
                  {b.vehicles?.brand} {b.vehicles?.model} · {b.reference}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateTime(b.pickup_at)} → {dateTime(b.return_at)} · {money(b.total)}
                </p>
              </Link>
              <StatusBadge status={b.status} />
              <OwnerActions status={b.status} onSet={(s) => setStatus.mutate({ id: b.id, s })} />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="fleet" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehiclesError ? (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load fleet: {vehiclesError.message}
            </p>
          ) : (
            vehicles.map((v) => (
              <div
                key={v.id}
                className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]"
              >
                <div className="aspect-[3/2]">
                  <VehicleImage imageKey={v.image_key} imagePath={v.image_path} alt="" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex justify-between">
                    <p className="font-bold">
                      {v.brand} {v.model}
                    </p>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="text-sm">{money(v.price_per_day)} / day</p>
                  <label className="flex items-center justify-between text-sm">
                    {v.is_available ? "Listed in search" : "Paused"}
                    <Switch
                      checked={v.is_available}
                      disabled={toggle.isPending || v.status !== "approved"}
                      onCheckedChange={(checked) =>
                        toggle.mutate({ id: v.id, isAvailable: checked })
                      }
                      aria-label={`Make ${v.brand} ${v.model} ${v.is_available ? "unavailable" : "available"}`}
                    />
                  </label>
                  {v.status !== "approved" && (
                    <p className="text-xs text-muted-foreground">
                      This car must be approved before it can be listed.
                    </p>
                  )}
                  <VehicleDialog companyId={company.id} city={company.city} vehicle={v} />
                </div>
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="calendar" className="space-y-4">
          {bookingsError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load calendar bookings: {bookingsError.message}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="h-5 w-5" />
              {monthLabel}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next month"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-border bg-card">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="border-b border-border bg-muted p-2 text-center text-xs font-semibold"
              >
                {day}
              </div>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-24 border-b border-r border-border bg-muted/30"
              />
            ))}
            {Array.from({ length: monthDays }, (_, i) => {
              const day = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1);
              const dayKey = localDateKey(day);
              const dayBookings = bookings.filter(
                (booking) =>
                  localDateKey(new Date(booking.pickup_at)) <= dayKey &&
                  localDateKey(new Date(booking.return_at)) >= dayKey &&
                  !["cancelled", "rejected"].includes(booking.status),
              );
              return (
                <div
                  key={dayKey}
                  className="min-h-24 border-b border-r border-border p-1.5 sm:min-h-32 sm:p-2"
                >
                  <p className="text-xs font-semibold">{i + 1}</p>
                  <div className="mt-1 space-y-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <Link
                        key={booking.id}
                        to="/bookings/$id"
                        params={{ id: booking.id }}
                        className="block truncate rounded bg-secondary px-1.5 py-1 text-[10px] text-secondary-foreground hover:bg-accent sm:text-xs"
                        title={`${booking.vehicles?.brand ?? ""} ${booking.vehicles?.model ?? ""} · ${booking.status}`}
                      >
                        {booking.vehicles?.brand} {booking.vehicles?.model}
                      </Link>
                    ))}
                    {dayBookings.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{dayBookings.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Calendar entries show bookings from pickup through return dates. Cancelled and declined
            bookings are excluded.
          </p>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          {bookingsError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load report bookings: {bookingsError.message}
            </p>
          )}
          <div>
            <h2 className="text-lg font-bold">Booking & earnings report</h2>
            <p className="text-sm text-muted-foreground">
              Report dates are matched against pickup dates. Confirmed booking totals are booking
              value, not payout or cleared cash.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="report-start">Pickup from</Label>
              <Input
                id="report-start"
                type="date"
                value={reportStart}
                onChange={(event) => setReportStart(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="report-end">Pickup through</Label>
              <Input
                id="report-end"
                type="date"
                value={reportEnd}
                onChange={(event) => setReportEnd(event.target.value)}
              />
            </div>
            <Button onClick={exportReport} disabled={reportInvalid}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          {reportInvalid && (
            <p role="alert" className="text-sm text-destructive">
              The report start date must be before the end date.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Bookings in period", value: String(reportBookings.length) },
              { label: "Confirmed bookings", value: String(reportConfirmed.length) },
              { label: "Confirmed booking value", value: money(reportRevenue) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-xl font-extrabold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {bookingsError ? null : reportBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pickups in this date range.</p>
            ) : (
              reportBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to="/bookings/$id"
                  params={{ id: booking.id }}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card p-3 text-sm shadow-[var(--shadow-card)]"
                >
                  <span>
                    {booking.vehicles?.brand} {booking.vehicles?.model} · {booking.reference}
                  </span>
                  <span className="text-muted-foreground">
                    {dateTime(booking.pickup_at)} · {money(booking.total)} · {booking.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="space-y-2">
          {reviewsError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load reviews: {reviewsError.message}
            </p>
          )}
          {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
              <p className="font-semibold">
                Car {r.rating}/5
                {r.company_rating ? ` · Company ${r.company_rating}/5` : ""}
              </p>
              <p className="text-sm">{r.comment}</p>
              <p className="mt-1 text-xs text-muted-foreground">{dateTime(r.created_at)}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateCompany({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", city: "Lusaka", phone: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").insert({ ...f, owner_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-company"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-10">
      <PageHeader title="Register your business" />
      <div>
        <Label>Company name</Label>
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </div>
      <div>
        <Label>City</Label>
        <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <Button disabled={!f.name || m.isPending} onClick={() => m.mutate()}>
        Create company
      </Button>
    </div>
  );
}

function VehicleDialog({
  companyId,
  city,
  vehicle,
}: {
  companyId: string;
  city: string;
  vehicle?: Tables<"vehicles">;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({
    brand: vehicle?.brand ?? "",
    model: vehicle?.model ?? "",
    year: vehicle?.year ?? 2022,
    vehicle_type: vehicle?.vehicle_type ?? "Sedan",
    transmission: vehicle?.transmission ?? "Automatic",
    fuel_type: vehicle?.fuel_type ?? "Petrol",
    seats: vehicle?.seats ?? 5,
    doors: vehicle?.doors ?? 4,
    price_per_day: vehicle?.price_per_day ?? 50,
    deposit: vehicle?.deposit ?? 200,
    city: vehicle?.city ?? city,
    pickup_address: vehicle?.pickup_address ?? "",
    description: vehicle?.description ?? "",
    features: (vehicle?.features ?? []).join(", "),
  });
  const save = useMutation({
    mutationFn: async () => {
      let image_path = vehicle?.image_path ?? null;
      if (file) {
        image_path = `${companyId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "")}`;
        const { error } = await supabase.storage.from("vehicles").upload(image_path, file);
        if (error) throw error;
      }
      const row = {
        ...f,
        year: +f.year,
        seats: +f.seats,
        doors: +f.doors,
        price_per_day: +f.price_per_day,
        deposit: +f.deposit,
        features: f.features
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        image_path,
        image_key: file ? null : (vehicle?.image_key ?? null),
      };
      const { error } = vehicle
        ? await supabase.from("vehicles").update(row).eq("id", vehicle.id)
        : await supabase
            .from("vehicles")
            .insert({ ...row, company_id: companyId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["co-vehicles"] });
      setOpen(false);
      toast.success(vehicle ? "Car updated" : "Car submitted for approval");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={f[k] as string | number}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {vehicle ? (
          <Button size="sm" variant="outline" className="w-full">
            Edit
          </Button>
        ) : (
          <Button className="rounded-full">
            <Plus className="h-4 w-4" />
            Add car
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit car" : "Add a car"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {field("brand", "Brand")}
          {field("model", "Model")}
          {field("year", "Year", "number")}
          {field("vehicle_type", "Type")}
          {field("transmission", "Transmission")}
          {field("fuel_type", "Fuel")}
          {field("seats", "Seats", "number")}
          {field("doors", "Doors", "number")}
          {field("price_per_day", "Price per day (K)", "number")}
          {field("deposit", "Deposit (K)", "number")}
          {field("city", "City")}
          {field("pickup_address", "Pickup address")}
        </div>
        {field("features", "Features (comma separated)")}
        <div>
          <Label>Description</Label>
          <Textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </div>
        <div>
          <Label>Photo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button disabled={!f.brand || !f.model || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
