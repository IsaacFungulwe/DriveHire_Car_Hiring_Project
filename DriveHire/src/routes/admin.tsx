import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CalendarDays, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — DriveHire" },
      { name: "description", content: "Oversee users, companies, cars and bookings." },
      { property: "og:title", content: "Admin — DriveHire" },
      { property: "og:description", content: "Oversee users, companies, cars and bookings." },
    ],
  }),
  component: () => <Gate need="admin">{(a) => <Admin actorId={a.user!.id} />}</Gate>,
});

function Admin({ actorId }: { actorId: string }) {
  const qc = useQueryClient();
  const q = <T,>(key: string, fn: () => PromiseLike<{ data: T[] | null }>) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: ["admin", key], queryFn: async () => (await fn()).data ?? [] }).data ?? [];
  const users = q("users", () => supabase.from("profiles").select("*").order("created_at", { ascending: false }));
  const companies = q("companies", () => supabase.from("companies").select("*").order("created_at", { ascending: false }));
  const vehicles = q("vehicles", () => supabase.from("vehicles").select("*, companies(name)").order("created_at", { ascending: false }));
  const bookings = q("bookings", () => supabase.from("bookings").select("*, vehicles(brand,model)").order("created_at", { ascending: false }).limit(200));
  const logs = q("logs", () => supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100));
  const companyRequests = companies.filter((company) => !company.is_verified && !company.is_suspended);

  const act = useMutation({
    mutationFn: async ({ table, id, patch, action }: { table: "profiles" | "companies" | "vehicles"; id: string; patch: Record<string, unknown>; action: string }) => {
      const { error } = await supabase.from(table).update(patch as never).eq("id", id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ actor_id: actorId, action, detail: `${table}:${id}` });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Done"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revenue = bookings.filter((b) => b.payment_status === "paid").reduce((s, b) => s + Number(b.total), 0);
  const stats = [
    { l: "Users", v: users.length }, { l: "Company requests", v: companyRequests.length },
    { l: "Cars awaiting approval", v: vehicles.filter((v) => v.status === "pending").length }, { l: "Paid volume", v: money(revenue) },
  ];
  const card = "flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader title="Admin dashboard" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => <div key={s.l} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"><p className="text-xs text-muted-foreground">{s.l}</p><p className="text-2xl font-extrabold">{s.v}</p></div>)}
      </div>
      <Tabs defaultValue="applications">
        <TabsList className="flex-wrap"><TabsTrigger value="applications">Company requests ({companyRequests.length})</TabsTrigger><TabsTrigger value="vehicles">Cars</TabsTrigger><TabsTrigger value="companies">Companies</TabsTrigger><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="bookings">Bookings</TabsTrigger><TabsTrigger value="logs">Audit log</TabsTrigger></TabsList>
        <TabsContent value="applications" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Company applications</h2>
            <p className="text-sm text-muted-foreground">Review business details before approving a company to list cars.</p>
          </div>
          {companyRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Building2 className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 font-semibold">No requests awaiting review</p>
              <p className="mt-1 text-sm text-muted-foreground">New company registrations will appear here.</p>
            </div>
          ) : companyRequests.map((company) => {
            const owner = users.find((user) => user.id === company.owner_id);
            return (
              <article key={company.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground"><Building2 className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />Submitted {dateTime(company.created_at)}</p>
                    </div>
                  </div>
                  <StatusBadge status="pending" />
                </div>
                <dl className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="font-medium">{owner?.full_name || owner?.email || "Owner account"}</dd></div>
                  <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Location</dt><dd>{company.address ? `${company.address}, ` : ""}{company.city || "Not provided"}</dd></div></div>
                  <div className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Email</dt><dd>{company.email || owner?.email || "Not provided"}</dd></div></div>
                  <div className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{company.phone || owner?.phone || "Not provided"}</dd></div></div>
                  {company.description && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">About the business</dt><dd className="mt-1">{company.description}</dd></div>}
                </dl>
                <div className="mt-4 flex justify-end border-t pt-4">
                  <Button disabled={act.isPending} onClick={() => act.mutate({ table: "companies", id: company.id, patch: { is_verified: true }, action: "company application approved" })}>
                    Approve company
                  </Button>
                </div>
              </article>
            );
          })}
        </TabsContent>
        <TabsContent value="vehicles" className="space-y-2">
          {vehicles.map((v) => (
            <div key={v.id} className={card}>
              <div className="flex-1"><p className="font-semibold">{v.brand} {v.model} ({v.year})</p><p className="text-xs text-muted-foreground">{v.companies?.name} · {money(v.price_per_day)}/day</p></div>
              <StatusBadge status={v.status} />
              {v.status !== "approved" && <Button size="sm" onClick={() => act.mutate({ table: "vehicles", id: v.id, patch: { status: "approved" }, action: "vehicle approved" })}>Approve</Button>}
              {v.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => act.mutate({ table: "vehicles", id: v.id, patch: { status: "rejected" }, action: "vehicle rejected" })}>Reject</Button>}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="companies" className="space-y-2">
          {companies.map((c) => (
            <div key={c.id} className={card}>
              <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.city} · {c.email ?? c.phone}</p></div>
              {c.is_verified ? <StatusBadge status="approved" /> : <Button size="sm" onClick={() => act.mutate({ table: "companies", id: c.id, patch: { is_verified: true }, action: "company verified" })}>Verify</Button>}
              <Button size="sm" variant={c.is_suspended ? "outline" : "destructive"} onClick={() => act.mutate({ table: "companies", id: c.id, patch: { is_suspended: !c.is_suspended }, action: c.is_suspended ? "company reinstated" : "company suspended" })}>{c.is_suspended ? "Reinstate" : "Suspend"}</Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="users" className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className={card}>
              <div className="flex-1"><p className="font-semibold">{u.full_name || "—"}</p><p className="text-xs text-muted-foreground">{u.email} · joined {dateTime(u.created_at)}</p></div>
              {u.id !== actorId && <Button size="sm" variant={u.is_suspended ? "outline" : "destructive"} onClick={() => act.mutate({ table: "profiles", id: u.id, patch: { is_suspended: !u.is_suspended }, action: u.is_suspended ? "user reinstated" : "user suspended" })}>{u.is_suspended ? "Reinstate" : "Suspend"}</Button>}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="bookings" className="space-y-2">
          {bookings.map((b) => (
            <Link key={b.id} to="/bookings/$id" params={{ id: b.id }} className={card}>
              <div className="flex-1"><p className="font-semibold">{b.reference} · {b.vehicles?.brand} {b.vehicles?.model}</p><p className="text-xs text-muted-foreground">{dateTime(b.pickup_at)} · {money(b.total)} · {b.payment_status}</p></div>
              <StatusBadge status={b.status} />
            </Link>
          ))}
        </TabsContent>
        <TabsContent value="logs" className="space-y-1 text-sm">
          {logs.length === 0 && <p className="text-muted-foreground">No actions logged yet.</p>}
          {logs.map((l) => <p key={l.id} className="rounded-xl bg-card px-4 py-2"><b>{l.action}</b> <span className="text-muted-foreground">{l.detail} · {dateTime(l.created_at)}</span></p>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
