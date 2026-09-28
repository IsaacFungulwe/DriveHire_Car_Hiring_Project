import { Link } from "@tanstack/react-router";
import { Fuel, Settings2, Star, Users } from "lucide-react";

import type { Tables } from "@/integrations/supabase/types";
import { moneyShort } from "@/lib/format";
import { VehicleImage } from "@/lib/vehicle-image";

export type VehicleWithCompany = Tables<"vehicles"> & { companies?: { name: string; is_verified: boolean } | null };

export function VehicleCard({ v }: { v: VehicleWithCompany }) {
  return (
    <Link to="/cars/$id" params={{ id: v.id }} className="group overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]">
      <div className="aspect-[3/2] overflow-hidden bg-muted">
        <VehicleImage imageKey={v.image_key} imagePath={v.image_path} alt={`${v.brand} ${v.model}`} className="transition duration-500 group-hover:scale-105" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-foreground">{v.brand} {v.model}</h3>
            <p className="text-xs text-muted-foreground">{v.year} · {v.vehicle_type} · {v.city}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold"><Star className="h-4 w-4 fill-warning text-warning" />{Number(v.rating).toFixed(1)}</span>
        </div>
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{v.seats}</span>
          <span className="flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" />{v.transmission}</span>
          <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" />{v.fuel_type}</span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <p><span className="text-xl font-extrabold text-foreground">{moneyShort(v.price_per_day)}</span><span className="text-xs text-muted-foreground"> / day</span></p>
          {v.companies?.name && <p className="max-w-[50%] truncate text-xs text-muted-foreground">{v.companies.name}</p>}
        </div>
      </div>
    </Link>
  );
}
