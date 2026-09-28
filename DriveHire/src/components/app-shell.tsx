import { Link } from "@tanstack/react-router";
import { Bell, Building2, CalendarCheck, Car, Heart, Home, LogOut, Shield, User } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAccount, useSignOut } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isOwner, isAdmin } = useAccount();
  const signOut = useSignOut();
  const link = "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground";
  const active = { className: "bg-secondary text-foreground" };
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-navy">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Car className="h-5 w-5" /></span>
            DriveHire
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <Link to="/cars" className={link} activeProps={active}>Browse cars</Link>
            {user && <Link to="/bookings" className={link} activeProps={active}>My bookings</Link>}
            {user && <Link to="/favorites" className={link} activeProps={active}>Saved</Link>}
            {isOwner && <Link to="/owner" className={link} activeProps={active}><Building2 className="h-4 w-4" />Company</Link>}
            {isAdmin && <Link to="/admin" className={link} activeProps={active}><Shield className="h-4 w-4" />Admin</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link to="/notifications" className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Notifications"><Bell className="h-5 w-5" /></Link>
                <Link to="/profile" className="hidden rounded-full p-2 text-muted-foreground hover:bg-secondary md:block" aria-label="Profile"><User className="h-5 w-5" /></Link>
                <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:inline-flex"><LogOut className="h-4 w-4" />Sign out</Button>
              </>
            ) : (
              <Button asChild size="sm" className="rounded-full"><Link to="/auth">Sign in</Link></Button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
        {[
          { to: "/", icon: Home, label: "Home" },
          { to: "/cars", icon: Car, label: "Cars" },
          { to: "/bookings", icon: CalendarCheck, label: "Trips" },
          { to: "/favorites", icon: Heart, label: "Saved" },
          { to: isOwner ? "/owner" : isAdmin ? "/admin" : "/profile", icon: isOwner ? Building2 : isAdmin ? Shield : User, label: isOwner ? "Company" : isAdmin ? "Admin" : "Profile" },
        ].map((i) => (
          <Link key={i.label} to={i.to} activeOptions={{ exact: i.to === "/" }} className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <i.icon className="h-5 w-5" />{i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: "bg-warning/15 text-warning-foreground",
    confirmed: "bg-primary/10 text-primary",
    ready: "bg-accent/15 text-accent-foreground",
    active: "bg-accent/20 text-accent-foreground",
    completed: "bg-success/15 text-success",
    approved: "bg-success/15 text-success",
    paid: "bg-success/15 text-success",
    cancelled: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/10 text-destructive",
    refunded: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
