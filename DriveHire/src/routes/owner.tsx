import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const { data: company, isLoading } = useQuery({
    queryKey: ["my-company", userId],
    queryFn: async () => (await supabase.from("companies").select("*").eq("owner_id", userId).maybeSingle()).data,
  });
  const cid = company?.id;
  const { data: vehicles = [] } = useQuery({ queryKey: ["co-vehicles", cid], enabled: !!cid, queryFn: async () => (await supabase.from("vehicles").select("*").eq("company_id", cid!).order("created_at", { ascending: false })).data ?? [] });
  const { data: bookings = [] } = useQuery({ queryKey: ["co-bookings", cid], enabled: !!cid, queryFn: async () => (await supabase.from("bookings").select("*, vehicles(brand,model)").eq("company_id", cid!).order("created_at", { ascending: false })).data ?? [] });
  const { data: reviews = [] } = useQuery({ queryKey: ["co-reviews", cid], enabled: vehicles.length > 0, queryFn: async () => (await supabase.from("reviews").select("*").in("vehicle_id", vehicles.map((v) => v.id)).order("created_at", { ascending: false })).data ?? [] });

  const setStatus = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => { const { error } = await supabase.rpc("set_booking_status", { p_booking_id: id, p_status: s }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["co-bookings"] }); toast.success("Booking updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (v: Tables<"vehicles">) => { await supabase.from("vehicles").update({ is_available: !v.is_available }).eq("id", v.id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["co-vehicles"] }),
  });

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (!company) return <CreateCompany userId={userId} />;

  const earned = bookings.filter((b) => ["confirmed", "ready", "active", "completed"].includes(b.status)).reduce((s, b) => s + Number(b.total), 0);
  const stats = [
    { l: "Earnings", v: money(earned) },
    { l: "Pending requests", v: bookings.filter((b) => b.status === "pending").length },
    { l: "Active rentals", v: bookings.filter((b) => b.status === "active").length },
    { l: "Cars", v: vehicles.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader title={company.name} subtitle={company.is_verified ? "Verified company" : "Awaiting verification by DriveHire — your cars go live once verified"} action={<VehicleDialog companyId={company.id} city={company.city} />} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => <div key={s.l} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"><p className="text-xs text-muted-foreground">{s.l}</p><p className="text-2xl font-extrabold">{s.v}</p></div>)}
      </div>
      <Tabs defaultValue="bookings">
        <TabsList><TabsTrigger value="bookings">Bookings</TabsTrigger><TabsTrigger value="fleet">Fleet</TabsTrigger><TabsTrigger value="reviews">Reviews</TabsTrigger></TabsList>
        <TabsContent value="bookings" className="space-y-3">
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
              <Link to="/bookings/$id" params={{ id: b.id }} className="min-w-0 flex-1">
                <p className="font-semibold">{b.vehicles?.brand} {b.vehicles?.model} · {b.reference}</p>
                <p className="text-xs text-muted-foreground">{dateTime(b.pickup_at)} → {dateTime(b.return_at)} · {money(b.total)}</p>
              </Link>
              <StatusBadge status={b.status} />
              <OwnerActions status={b.status} onSet={(s) => setStatus.mutate({ id: b.id, s })} />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="fleet" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
              <div className="aspect-[3/2]"><VehicleImage imageKey={v.image_key} imagePath={v.image_path} alt="" /></div>
              <div className="space-y-2 p-4">
                <div className="flex justify-between"><p className="font-bold">{v.brand} {v.model}</p><StatusBadge status={v.status} /></div>
                <p className="text-sm">{money(v.price_per_day)} / day</p>
                <label className="flex items-center justify-between text-sm">Available to book<Switch checked={v.is_available} onCheckedChange={() => toggle.mutate(v)} /></label>
                <VehicleDialog companyId={company.id} city={company.city} vehicle={v} />
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="reviews" className="space-y-2">
          {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
          {reviews.map((r) => <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"><p className="font-semibold">{r.rating}/5</p><p className="text-sm">{r.comment}</p></div>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateCompany({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", city: "Lusaka", phone: "" });
  const m = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("companies").insert({ ...f, owner_id: userId }); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-company"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-10">
      <PageHeader title="Register your business" />
      <div><Label>Company name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>City</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
      <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <Button disabled={!f.name || m.isPending} onClick={() => m.mutate()}>Create company</Button>
    </div>
  );
}

function VehicleDialog({ companyId, city, vehicle }: { companyId: string; city: string; vehicle?: Tables<"vehicles"> }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({
    brand: vehicle?.brand ?? "", model: vehicle?.model ?? "", year: vehicle?.year ?? 2022, vehicle_type: vehicle?.vehicle_type ?? "Sedan",
    transmission: vehicle?.transmission ?? "Automatic", fuel_type: vehicle?.fuel_type ?? "Petrol", seats: vehicle?.seats ?? 5, doors: vehicle?.doors ?? 4,
    price_per_day: vehicle?.price_per_day ?? 50, deposit: vehicle?.deposit ?? 200, city: vehicle?.city ?? city, pickup_address: vehicle?.pickup_address ?? "",
    description: vehicle?.description ?? "", features: (vehicle?.features ?? []).join(", "),
  });
  const save = useMutation({
    mutationFn: async () => {
      let image_path = vehicle?.image_path ?? null;
      if (file) {
        image_path = `${companyId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "")}`;
        const { error } = await supabase.storage.from("vehicles").upload(image_path, file);
        if (error) throw error;
      }
      const row = { ...f, year: +f.year, seats: +f.seats, doors: +f.doors, price_per_day: +f.price_per_day, deposit: +f.deposit, features: f.features.split(",").map((s) => s.trim()).filter(Boolean), image_path, image_key: file ? null : vehicle?.image_key ?? null };
      const { error } = vehicle
        ? await supabase.from("vehicles").update(row).eq("id", vehicle.id)
        : await supabase.from("vehicles").insert({ ...row, company_id: companyId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["co-vehicles"] }); setOpen(false); toast.success(vehicle ? "Car updated" : "Car submitted for approval"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div><Label>{label}</Label><Input type={type} value={f[k] as string | number} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{vehicle ? <Button size="sm" variant="outline" className="w-full">Edit</Button> : <Button className="rounded-full"><Plus className="h-4 w-4" />Add car</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{vehicle ? "Edit car" : "Add a car"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {field("brand", "Brand")}{field("model", "Model")}{field("year", "Year", "number")}{field("vehicle_type", "Type")}
          {field("transmission", "Transmission")}{field("fuel_type", "Fuel")}{field("seats", "Seats", "number")}{field("doors", "Doors", "number")}
          {field("price_per_day", "Price per day (K)", "number")}{field("deposit", "Deposit (K)", "number")}{field("city", "City")}{field("pickup_address", "Pickup address")}
        </div>
        {field("features", "Features (comma separated)")}
        <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <Button disabled={!f.brand || !f.model || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
      </DialogContent>
    </Dialog>
  );
}
