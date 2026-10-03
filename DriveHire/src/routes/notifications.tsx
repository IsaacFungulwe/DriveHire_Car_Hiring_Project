import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DriveHire" },
      { name: "description", content: "Booking updates and alerts." },
      { property: "og:title", content: "Notifications — DriveHire" },
      { property: "og:description", content: "Booking updates and alerts." },
    ],
  }),
  component: () => <Gate>{(a) => <Notes userId={a.user!.id} />}</Gate>,
});

function Notes({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () =>
      (
        await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100)
      ).data ?? [],
  });
  const readAll = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader
        title="Notifications"
        action={
          <Button variant="outline" size="sm" onClick={() => readAll.mutate()}>
            Mark all read
          </Button>
        }
      />
      {data.length === 0 && <p className="text-muted-foreground">You're all caught up.</p>}
      <div className="space-y-2">
        {data.map((n) => (
          <div
            key={n.id}
            className={`flex gap-3 rounded-2xl p-4 shadow-[var(--shadow-card)] ${n.is_read ? "bg-card" : "bg-primary/5"}`}
          >
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{n.title}</p>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{dateTime(n.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
