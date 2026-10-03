import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarDays,
  DoorOpen,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  Settings2,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { dateOnly, money } from "@/lib/format";
import { VehicleImage } from "@/lib/vehicle-image";

export const Route = createFileRoute("/cars/$id")({
  head: () => ({
    meta: [
      { title: "Car details — DriveHire" },
      {
        name: "description",
        content: "Specs, pricing, availability and reviews for this rental car.",
      },
      { property: "og:title", content: "Car details — DriveHire" },
      {
        property: "og:description",
        content: "Specs, pricing, availability and reviews for this rental car.",
      },
    ],
  }),
  component: CarDetail,
});

function CarDetail() {
  const { id } = Route.useParams();
  const { user } = useAccount();
  const qc = useQueryClient();

  const { data: v, isLoading } = useQuery({
    queryKey: ["car", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*, companies(name,is_verified,city,phone)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("*")
          .eq("vehicle_id", id)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(10)
      ).data ?? [],
  });
  const { data: fav } = useQuery({
    queryKey: ["fav", id, user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("favorites")
          .select("id")
          .eq("vehicle_id", id)
          .eq("user_id", user!.id)
          .maybeSingle()
      ).data,
  });
  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save cars.");
      if (fav) await supabase.from("favorites").delete().eq("id", fav.id);
      else await supabase.from("favorites").insert({ user_id: user.id, vehicle_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fav", id] });
      toast.success(fav ? "Removed from saved" : "Saved to favourites");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (!v)
    return (
      <p className="p-8">
        This car isn't available.{" "}
        <Link to="/cars" className="text-primary">
          Browse cars
        </Link>
      </p>
    );

  const specs = [
    { icon: Users, l: `${v.seats} seats` },
    { icon: DoorOpen, l: `${v.doors} doors` },
    { icon: Settings2, l: v.transmission },
    { icon: Fuel, l: v.fuel_type },
    { icon: Gauge, l: `${v.mileage.toLocaleString()} km` },
    { icon: CalendarDays, l: String(v.year) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-[3/2] overflow-hidden rounded-3xl bg-muted">
            <VehicleImage
              imageKey={v.image_key}
              imagePath={v.image_path}
              alt={`${v.brand} ${v.model}`}
              priority
            />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {specs.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-card p-3 text-center shadow-[var(--shadow-card)]"
              >
                <s.icon className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xs font-medium">{s.l}</p>
              </div>
            ))}
          </div>
          {v.description && (
            <p className="mt-6 leading-relaxed text-muted-foreground">{v.description}</p>
          )}
          {v.features.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {v.features.map((f) => (
                <span key={f} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {f}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 grid gap-3 rounded-2xl bg-card p-5 text-sm shadow-[var(--shadow-card)] sm:grid-cols-2">
            <p>
              <span className="font-semibold">Mileage policy:</span> {v.mileage_policy}
            </p>
            <p>
              <span className="font-semibold">Cancellation:</span> {v.cancellation_policy}
            </p>
            <p>
              <span className="font-semibold">Inspection:</span> {v.inspection_status}
            </p>
            <p>
              <span className="font-semibold">Last service:</span> {dateOnly(v.last_maintenance)}
            </p>
          </div>
          <h2 className="mt-8 text-xl font-bold">Reviews ({v.review_count})</h2>
          <div className="mt-3 space-y-3">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No written reviews yet.</p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-border"}`}
                    />
                  ))}
                </p>
                {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{dateOnly(r.created_at)}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-extrabold">
                  {v.brand} {v.model}
                </h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {v.pickup_address ?? v.city}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => toggleFav.mutate()}
                aria-label="Save"
              >
                <Heart className={`h-5 w-5 ${fav ? "fill-destructive text-destructive" : ""}`} />
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <b>{Number(v.rating).toFixed(1)}</b>
              <span className="text-muted-foreground">({v.review_count} reviews)</span>
            </p>
            <p className="mt-5">
              <span className="text-3xl font-extrabold">{money(v.price_per_day)}</span>
              <span className="text-muted-foreground"> / day</span>
            </p>
            <p className="text-sm text-muted-foreground">Refundable deposit {money(v.deposit)}</p>
            <Button asChild size="lg" className="mt-6 w-full rounded-xl" disabled={!v.is_available}>
              {user ? (
                <Link to="/book/$id" params={{ id: v.id }}>
                  Choose dates & book
                </Link>
              ) : (
                <Link to="/auth">Sign in to book</Link>
              )}
            </Button>
            {v.companies && (
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary font-bold">
                  {v.companies.name[0]}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    {v.companies.name}
                    {v.companies.is_verified && <BadgeCheck className="h-4 w-4 text-accent" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.companies.city}
                    {v.companies.phone ? ` · ${v.companies.phone}` : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
