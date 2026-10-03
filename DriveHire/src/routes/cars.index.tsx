import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VehicleCard, type VehicleWithCompany } from "@/components/vehicle-card";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  transmission: z.string().optional(),
  max: z.number().optional(),
  sort: z.enum(["price_asc", "price_desc", "rating"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/cars/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Browse rental cars — DriveHire" },
      { name: "description", content: "Filter rental cars by city, type, transmission and price." },
      { property: "og:title", content: "Browse rental cars — DriveHire" },
      {
        property: "og:description",
        content: "Filter rental cars by city, type, transmission and price.",
      },
    ],
  }),
  component: Cars,
});

function Cars() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/cars/" });
  const set = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const { data = [], isLoading } = useQuery({
    queryKey: ["cars", s],
    queryFn: async () => {
      let q = supabase
        .from("vehicles")
        .select("*, companies(name,is_verified)")
        .eq("status", "approved");
      if (s.city) q = q.ilike("city", `%${s.city}%`);
      if (s.type) q = q.eq("vehicle_type", s.type);
      if (s.transmission) q = q.eq("transmission", s.transmission);
      if (s.max) q = q.lte("price_per_day", s.max);
      if (s.q) q = q.or(`brand.ilike.%${s.q}%,model.ilike.%${s.q}%`);
      if (s.sort === "price_asc") q = q.order("price_per_day");
      else if (s.sort === "price_desc") q = q.order("price_per_day", { ascending: false });
      else q = q.order("rating", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as VehicleWithCompany[];
    },
  });

  const all = (v?: string) => (v && v !== "all" ? v : undefined);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Find your car" subtitle={`${data.length} cars available`} />
      <div className="mb-6 grid gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Search brand or model"
          defaultValue={s.q}
          onChange={(e) => set({ q: e.target.value || undefined })}
          className="lg:col-span-2"
        />
        <Input
          placeholder="City"
          defaultValue={s.city}
          onChange={(e) => set({ city: e.target.value || undefined })}
        />
        <Select value={s.type ?? "all"} onValueChange={(v) => set({ type: all(v) })}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {["all", "Sedan", "SUV", "Hatchback", "Luxury", "Van", "Pickup"].map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "Any type" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={s.transmission ?? "all"}
          onValueChange={(v) => set({ transmission: all(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "Automatic", "Manual"].map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "Any gearbox" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={s.sort ?? "rating"} onValueChange={(v) => set({ sort: v as "rating" })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Top rated</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading cars…</p>
      ) : data.length === 0 ? (
        <p className="rounded-2xl bg-card p-10 text-center text-muted-foreground">
          No cars match these filters.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
