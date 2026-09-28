import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { VehicleCard } from "@/components/vehicle-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Saved cars — DriveHire" },
      { name: "description", content: "Cars you've saved for later." },
      { property: "og:title", content: "Saved cars — DriveHire" },
      { property: "og:description", content: "Cars you've saved for later." },
    ],
  }),
  component: () => <Gate>{(a) => <Favs userId={a.user!.id} />}</Gate>,
});

function Favs({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => (await supabase.from("favorites").select("vehicles(*, companies(name,is_verified))").eq("user_id", userId)).data ?? [],
  });
  const cars = data.map((f) => f.vehicles).filter(Boolean);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader title="Saved cars" />
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && cars.length === 0 && <p className="text-muted-foreground">Nothing saved yet. <Link to="/cars" className="text-primary">Browse cars</Link></p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {cars.map((v: any) => <VehicleCard key={v.id} v={v} />)}
      </div>
    </div>
  );
}
