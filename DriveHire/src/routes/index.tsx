import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, CalendarClock, MapPin, Search, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleCard, type VehicleWithCompany } from "@/components/vehicle-card";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/cars/suv.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DriveHire — Rent a car from trusted local companies" },
      {
        name: "description",
        content:
          "Search cars by city and dates, see transparent prices and book instantly with DriveHire.",
      },
      { property: "og:title", content: "DriveHire — Rent a car from trusted local companies" },
      {
        property: "og:description",
        content: "Search cars by city and dates, see transparent prices and book instantly.",
      },
    ],
  }),
  component: Home,
});

const TYPES = ["Sedan", "SUV", "Hatchback", "Luxury"];

function Home() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const { data: cars = [] } = useQuery({
    queryKey: ["popular"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*, companies(name,is_verified)")
        .eq("status", "approved")
        .order("rating", { ascending: false })
        .limit(8);
      return (data ?? []) as VehicleWithCompany[];
    },
  });

  return (
    <>
      <section className="navy-gradient relative overflow-hidden text-navy-foreground">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Car hire, simplified
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight md:text-6xl">
            Your next drive, booked in minutes.
          </h1>
          <p className="mt-4 max-w-xl text-navy-foreground/80">
            Verified local rental companies, clear prices with no surprises, and real-time
            availability.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/cars", search: { city: city || undefined } });
            }}
            className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-card p-2 shadow-[var(--shadow-lift)]"
          >
            <div className="flex flex-1 items-center gap-2 px-3 text-foreground">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Pickup city, e.g. Lusaka"
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-xl">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Link
              key={t}
              to="/cars"
              search={{ type: t }}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            >
              {t}
            </Link>
          ))}
        </div>
        <div className="mt-8 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Popular cars</h2>
          <Link to="/cars" className="text-sm font-semibold text-primary">
            See all
          </Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cars.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-4">
        {[
          { icon: BadgeCheck, t: "Verified companies", d: "Every partner is checked by our team." },
          {
            icon: Wallet,
            t: "Transparent pricing",
            d: "See rental, insurance, extras and tax up front.",
          },
          { icon: CalendarClock, t: "Live availability", d: "Double bookings are impossible." },
          { icon: ShieldCheck, t: "Insurance included", d: "Basic cover on every rental." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <f.icon className="h-6 w-6 text-accent" />
            <h3 className="mt-3 font-bold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
