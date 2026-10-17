import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const PAGE_SIZE = 12;
const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const search = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  transmission: z.string().optional(),
  max: z.number().positive().optional(),
  seats: z.number().int().positive().optional(),
  fuel: z.string().optional(),
  ac: z.boolean().optional(),
  sort: z.enum(["price_asc", "price_desc", "rating"]).optional(),
  q: z.string().optional(),
  pickup: dateParam,
  return: dateParam,
  page: z.number().int().positive().optional(),
});

function dateAtTenLocal(date: string) {
  const [year = NaN, month = NaN, day = NaN] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day, 10);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
    return null;
  }
  return value;
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = localDateString(new Date());

export const Route = createFileRoute("/cars/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Browse rental cars — DriveHire" },
      {
        name: "description",
        content: "Filter available rental cars by dates, city, features and price.",
      },
      { property: "og:title", content: "Browse rental cars — DriveHire" },
      {
        property: "og:description",
        content: "Filter available rental cars by dates, city, features and price.",
      },
    ],
  }),
  component: Cars,
});

function Cars() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/cars/" });
  const page = s.page ?? 1;
  const pickupDate = s.pickup ? dateAtTenLocal(s.pickup) : null;
  const returnDate = s.return ? dateAtTenLocal(s.return) : null;
  const hasPartialDates = Boolean(s.pickup) !== Boolean(s.return);
  const invalidDates =
    hasPartialDates ||
    (Boolean(s.pickup && s.return) &&
      (!pickupDate || !returnDate || s.pickup! < today || s.return! <= s.pickup!));

  const set = (patch: Partial<z.infer<typeof search>>, resetPage = true) =>
    navigate({
      search: (prev) => ({ ...prev, ...patch, ...(resetPage ? { page: undefined } : {}) }),
      replace: true,
    });

  const { data, isLoading, error } = useQuery({
    queryKey: ["cars", s],
    enabled: !invalidDates,
    queryFn: async () => {
      const { data: rows, error: searchError } = await supabase.rpc("search_available_vehicles", {
        ...(s.city ? { p_city: s.city } : {}),
        ...(pickupDate ? { p_pickup_at: pickupDate.toISOString() } : {}),
        ...(returnDate ? { p_return_at: returnDate.toISOString() } : {}),
        ...(s.type ? { p_vehicle_type: s.type } : {}),
        ...(s.transmission ? { p_transmission: s.transmission } : {}),
        ...(s.max ? { p_max_price: s.max } : {}),
        ...(s.seats ? { p_min_seats: s.seats } : {}),
        ...(s.fuel ? { p_fuel_type: s.fuel } : {}),
        ...(s.ac ? { p_air_conditioning: true } : {}),
        ...(s.q ? { p_query: s.q } : {}),
        p_sort: s.sort ?? "rating",
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      });
      if (searchError) throw searchError;
      const ids = rows.map((row) => row.vehicle_id);
      if (ids.length === 0) return { cars: [] as VehicleWithCompany[], total: 0 };

      const { data: cars, error: carsError } = await supabase
        .from("vehicles")
        .select("*, companies(name,is_verified)")
        .in("id", ids);
      if (carsError) throw carsError;
      const byId = new Map((cars as VehicleWithCompany[]).map((car) => [car.id, car]));
      return {
        cars: ids.map((id) => byId.get(id)).filter((car): car is VehicleWithCompany => !!car),
        total: Number(rows[0]?.total_count ?? 0),
      };
    },
  });

  const cars = data?.cars ?? [];
  const pageCount = useMemo(() => Math.ceil((data?.total ?? 0) / PAGE_SIZE), [data?.total]);
  const setOptional = (value: string) => (value === "all" ? undefined : value);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Find your car"
        subtitle={
          data
            ? `${data.total} car${data.total === 1 ? "" : "s"} match your search`
            : "Search verified rental cars"
        }
      />
      <div className="mb-6 grid gap-3 rounded-2xl bg-card p-4 shadow-(--shadow-card) sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search brand or model"
          value={s.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
        />
        <Input
          placeholder="Pickup city"
          value={s.city ?? ""}
          onChange={(e) => set({ city: e.target.value || undefined })}
        />
        <div>
          <label
            htmlFor="pickup-date"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Pickup date (10:00)
          </label>
          <Input
            id="pickup-date"
            type="date"
            min={today}
            value={s.pickup ?? ""}
            onChange={(e) => set({ pickup: e.target.value || undefined })}
          />
        </div>
        <div>
          <label
            htmlFor="return-date"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Return date (10:00)
          </label>
          <Input
            id="return-date"
            type="date"
            min={s.pickup ?? today}
            value={s.return ?? ""}
            onChange={(e) => set({ return: e.target.value || undefined })}
          />
        </div>
        <Select value={s.type ?? "all"} onValueChange={(v) => set({ type: setOptional(v) })}>
          <SelectTrigger aria-label="Vehicle type">
            <SelectValue placeholder="Any vehicle type" />
          </SelectTrigger>
          <SelectContent>
            {["all", "Sedan", "SUV", "Hatchback", "Luxury", "Executive", "Van", "Pickup"].map(
              (t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "Any vehicle type" : t}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={s.transmission ?? "all"}
          onValueChange={(v) => set({ transmission: setOptional(v) })}
        >
          <SelectTrigger aria-label="Transmission">
            <SelectValue placeholder="Any transmission" />
          </SelectTrigger>
          <SelectContent>
            {["all", "Automatic", "Manual"].map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "Any transmission" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={s.fuel ?? "all"} onValueChange={(v) => set({ fuel: setOptional(v) })}>
          <SelectTrigger aria-label="Fuel type">
            <SelectValue placeholder="Any fuel" />
          </SelectTrigger>
          <SelectContent>
            {["all", "Petrol", "Diesel", "Electric", "Hybrid"].map((fuel) => (
              <SelectItem key={fuel} value={fuel}>
                {fuel === "all" ? "Any fuel" : fuel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={s.seats ? String(s.seats) : "all"}
          onValueChange={(v) => set({ seats: v === "all" ? undefined : Number(v) })}
        >
          <SelectTrigger aria-label="Minimum seats">
            <SelectValue placeholder="Any seats" />
          </SelectTrigger>
          <SelectContent>
            {["all", "2", "4", "5", "6", "7", "8"].map((seats) => (
              <SelectItem key={seats} value={seats}>
                {seats === "all" ? "Any number of seats" : `${seats}+ seats`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min="1"
          step="1"
          placeholder="Max price per day"
          aria-label="Maximum price per day"
          value={s.max ?? ""}
          onChange={(e) =>
            set({ max: e.target.value ? Number(e.target.value) || undefined : undefined })
          }
        />
        <Select
          value={s.sort ?? "rating"}
          onValueChange={(v) => set({ sort: v as "rating" | "price_asc" | "price_desc" })}
        >
          <SelectTrigger aria-label="Sort cars">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Top rated</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={s.ac ?? false}
            onCheckedChange={(checked) => set({ ac: !!checked || undefined })}
          />
          Air conditioning
        </label>
      </div>

      {invalidDates && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {hasPartialDates
            ? "Choose both pickup and return dates to check availability."
            : "Choose valid future dates, with the return after pickup."}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          We couldn't load cars: {error.message}
        </p>
      )}
      {isLoading ? (
        <p className="text-muted-foreground">Checking availability…</p>
      ) : cars.length === 0 ? (
        !invalidDates &&
        !error && (
          <p className="rounded-2xl bg-card p-10 text-center text-muted-foreground">
            No cars match these filters and dates. Try different dates or broaden your filters.
          </p>
        )
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((v) => (
              <VehicleCard
                key={v.id}
                v={v}
                {...(s.pickup && s.return
                  ? { search: { pickup: s.pickup, return: s.return } }
                  : {})}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => set({ page: page - 1 }, false)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => set({ page: page + 1 }, false)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
