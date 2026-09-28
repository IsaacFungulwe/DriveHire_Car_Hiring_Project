import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — DriveHire" },
      { name: "description", content: "Sign in to book cars, or register your rental company on DriveHire." },
      { property: "og:title", content: "Sign in — DriveHire" },
      { property: "og:description", content: "Sign in to book cars, or register your rental company." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState<"customer" | "owner">("customer");

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: f.get("full_name"),
          phone: f.get("phone"),
          role: accountType,
          company_name: accountType === "owner" ? f.get("company_name") : undefined,
          city: f.get("city"),
        },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) toast.success("Check your email to confirm your account.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-3xl font-extrabold">Welcome to DriveHire</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Rent a car or grow your rental business.</p>
      <Tabs defaultValue="signin" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={signIn} className="space-y-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
            <div><Label htmlFor="e1">Email</Label><Input id="e1" name="email" type="email" required /></div>
            <div><Label htmlFor="p1">Password</Label><Input id="p1" name="password" type="password" required /></div>
            <Button className="w-full" disabled={busy}>Sign in</Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={signUp} className="space-y-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-2 gap-2">
              {(["customer", "owner"] as const).map((t) => (
                <button type="button" key={t} onClick={() => setAccountType(t)} className={`rounded-xl border p-3 text-sm font-semibold ${accountType === t ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                  {t === "customer" ? "I want to rent" : "I'm a rental company"}
                </button>
              ))}
            </div>
            <div><Label htmlFor="n">Full name</Label><Input id="n" name="full_name" required /></div>
            <div><Label htmlFor="ph">Phone</Label><Input id="ph" name="phone" type="tel" /></div>
            {accountType === "owner" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="cn">Company name</Label><Input id="cn" name="company_name" required /></div>
                <div><Label htmlFor="ct">City</Label><Input id="ct" name="city" defaultValue="Lusaka" /></div>
              </div>
            )}
            <div><Label htmlFor="e2">Email</Label><Input id="e2" name="email" type="email" required /></div>
            <div><Label htmlFor="p2">Password</Label><Input id="p2" name="password" type="password" required minLength={8} /></div>
            <Button className="w-full" disabled={busy}>Create account</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
