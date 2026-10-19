import { Link } from "@tanstack/react-router";
import { Fuel, Settings2, Snowflake, Star, Users } from "lucide-react";

import type { Tables } from "@/integrations/supabase/types";
import { moneyShort } from "@/lib/format";
import { VehicleImage } from "@/lib/vehicle-image";

export type VehicleWithCompany = Tables<"vehicles"> & {
  companies?: {
    name: string;
    is_verified: boolean;
    rating?: number;
    review_count?: number;
  } | null;
};

type RecentReview = Pick<Tables<"reviews">, "rating" | "company_rating" | "comment" | "created_at">;

export function VehicleCard({
  v,
  search,
  recentReview,
}: {
  v: VehicleWithCompany;
  search?: { pickup?: string; return?: string };
  recentReview?: RecentReview;
}) {
  return (
    <Link
      to="/cars/$id"
      params={{ id: v.id }}
      {...(search ? { search } : {})}
      className="group overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        <VehicleImage
          imageKey={v.image_key}
          imagePath={v.image_path}
          alt={`${v.brand} ${v.model}`}
          className="transition duration-500 group-hover:scale-105"
        />
        {!v.image_path && (
          <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow">
            Illustrative photo
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-foreground">
              {v.brand} {v.model}
            </h3>
            <p className="text-xs text-muted-foreground">
              {v.year} · {v.vehicle_type} · {v.city}
            </p>
          </div>
          <span
            className="flex items-center gap-1 text-sm font-semibold"
            aria-label={`${Number(v.rating).toFixed(1)} out of 5 from ${v.review_count} reviews`}
          >
            <Star className="h-4 w-4 fill-warning text-warning" />
            {Number(v.rating).toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground">({v.review_count})</span>
          </span>
        </div>
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {v.seats}
          </span>
          <span className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            {v.transmission}
          </span>
          <span className="flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" />
            {v.fuel_type}
          </span>
          {v.features.some((feature) => feature.toLowerCase() === "air conditioning") && (
            <span className="flex items-center gap-1" title="Air conditioning">
              <Snowflake className="h-3.5 w-3.5" />
              A/C
            </span>
          )}
        </div>
        {recentReview?.comment && (
          <p className="mt-3 line-clamp-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Recent renter:</span>{" "}
            {recentReview.comment}
          </p>
        )}
        <div className="mt-4 flex items-end justify-between">
          <p>
            <span className="text-xl font-extrabold text-foreground">
              {moneyShort(v.price_per_day)}
            </span>
            <span className="text-xs text-muted-foreground"> / day</span>
          </p>
          {v.companies?.name && (
            <div className="max-w-[50%] text-right">
              <p className="truncate text-xs text-muted-foreground">{v.companies.name}</p>
              {v.companies.review_count ? (
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {Number(v.companies.rating).toFixed(1)} company
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
