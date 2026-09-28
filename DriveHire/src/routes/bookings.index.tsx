import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money } from "@/lib/format";
import { VehicleImage } from "@/lib/vehicle-image";

export const Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "My bookings — DriveHire" },
      { name: "description", content: "Track your upcoming, active and past car hires." },
      { property: "og:title", content: "My bookings — DriveHire" },
      { property: "og:description", content: "Track your upcoming, active and past car hires." },
    ],
  }),
  component: () => <Gate>{(a) => <List userId={a.user!.id} />}</Gate>,
});

function List({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => (await supabase.from("bookings").select("*, vehicles(brand,model,image_key,image_path)").eq("customer_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="My bookings" subtitle="Your trips, past and upcoming" />
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && <p className="text-muted-foreground">No bookings yet. <Link to="/cars" className="text-primary">Find a car</Link></p>}
      <div className="space-y-3">
        {data.map((b) => (
          <Link key={b.id} to="/bookings/$id" params={{ id: b.id }} className="flex items-center gap-4 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl"><VehicleImage imageKey={b.vehicles?.image_key} imagePath={b.vehicles?.image_path} alt="" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{b.vehicles?.brand} {b.vehicles?.model}</p>
              <p className="text-xs text-muted-foreground">{b.reference} · {dateTime(b.pickup_at)} → {dateTime(b.return_at)}</p>
              <p className="mt-1 text-sm font-semibold">{money(b.total)}</p>
            </div>
            <StatusBadge status={b.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
