import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/auth";

type Need = "user" | "owner" | "admin";

export function Gate({
  need = "user",
  children,
}: {
  need?: Need;
  children: (a: ReturnType<typeof useAccount>) => ReactNode;
}) {
  const account = useAccount();
  if (account.loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (!account.user)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Please sign in</h1>
        <p className="mt-2 text-muted-foreground">You need an account to see this page.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  if ((need === "owner" && !account.isOwner) || (need === "admin" && !account.isAdmin))
    return (
      <p className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">
        You don't have access to this page.
      </p>
    );
  return <>{children(account)}</>;
}
