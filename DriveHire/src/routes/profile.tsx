import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useSignOut } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — DriveHire" },
      { name: "description", content: "Manage your details and notification settings." },
      { property: "og:title", content: "Your profile — DriveHire" },
      { property: "og:description", content: "Manage your details and notification settings." },
    ],
  }),
  component: () => <Gate>{(a) => (a.profile ? <Form p={a.profile} roles={a.roles ?? []} /> : null)}</Gate>,
});

function Form({ p, roles }: { p: Tables<"profiles">; roles: string[] }) {
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [f, setF] = useState({ full_name: p.full_name, phone: p.phone ?? "", notify_bookings: p.notify_bookings, notify_promos: p.notify_promos });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("profiles").update(f).eq("id", p.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account"] }); toast.success("Profile saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PageHeader title="Your profile" subtitle={`${p.email} · ${roles.join(", ")}`} />
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <label className="flex items-center justify-between text-sm">Booking updates<Switch checked={f.notify_bookings} onCheckedChange={(c) => setF({ ...f, notify_bookings: c })} /></label>
        <label className="flex items-center justify-between text-sm">Offers & promotions<Switch checked={f.notify_promos} onCheckedChange={(c) => setF({ ...f, notify_promos: c })} /></label>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save changes</Button>
      </div>
      <Button variant="outline" className="mt-4 w-full" onClick={signOut}>Sign out</Button>
    </div>
  );
}
