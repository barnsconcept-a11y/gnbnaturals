import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatGhs } from "@/lib/admin-utils";
import { createGymUser } from "@/lib/admin-users.functions";
import { Trash2, UserPlus, X, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/gyms")({
  head: () => ({ meta: [{ title: "Gyms — Admin" }] }),
  component: GymsPage,
});

type Gym = {
  id: string;
  name: string;
  commission_per_crate: number;
  active: boolean;
};

type Creds = { email: string; password: string; gymName: string };

function GymsPage() {
  const createUser = useServerFn(createGymUser);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [ownerCounts, setOwnerCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | "all" | null>(
    null,
  );

  const load = async () => {
    const [{ data, error }, { data: owners, error: ownersErr }] =
      await Promise.all([
        supabase.from("gyms").select("*").order("name"),
        supabase.from("gym_owners").select("gym_id"),
      ]);
    if (error) toast.error(error.message);
    if (ownersErr) toast.error(ownersErr.message);
    setGyms((data as Gym[]) ?? []);
    const counts: Record<string, number> = {};
    for (const o of (owners ?? []) as { gym_id: string }[]) {
      counts[o.gym_id] = (counts[o.gym_id] ?? 0) + 1;
    }
    setOwnerCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const copy = async (text: string, which: "email" | "password" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { data: gym, error } = await supabase
        .from("gyms")
        .insert({
          name: name.trim(),
          commission_per_crate: Number(rate) || 0,
        })
        .select("id, name")
        .single();
      if (error) throw new Error(error.message);

      if (ownerEmail.trim() && gym) {
        const res = await createUser({
          data: {
            email: ownerEmail.trim(),
            role: "gym_owner",
            gym_ids: [gym.id],
          },
        });
        setCreds({
          email: res.email,
          password: res.temp_password,
          gymName: gym.name,
        });
      } else {
        toast.success("Gym added");
      }

      setName("");
      setRate("");
      setOwnerEmail("");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add gym");
    } finally {
      setSubmitting(false);
    }
  };

  const updateRate = async (id: string, value: string) => {
    const { error } = await supabase
      .from("gyms")
      .update({ commission_per_crate: Number(value) || 0 })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const toggleActive = async (g: Gym) => {
    await supabase.from("gyms").update({ active: !g.active }).eq("id", g.id);
    load();
  };

  const removeGym = async (g: Gym) => {
    if (
      !confirm(
        `Delete "${g.name}"? This removes the gym and any owner-login links to it. Orders already placed at this pickup are kept.`,
      )
    )
      return;
    const { error: linkErr } = await supabase
      .from("gym_owners")
      .delete()
      .eq("gym_id", g.id);
    if (linkErr) return toast.error(linkErr.message);
    const { error } = await supabase.from("gyms").delete().eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success("Gym deleted");
    load();
  };

  const openAssign = (gymId: string) => {
    setAssignFor(gymId);
    setAssignEmail("");
  };

  const submitAssign = async (gym: Gym) => {
    if (!assignEmail.trim()) {
      toast.error("Email required");
      return;
    }
    setAssignSubmitting(true);
    try {
      const res = await createUser({
        data: {
          email: assignEmail.trim(),
          role: "gym_owner",
          gym_ids: [gym.id],
        },
      });
      setAssignFor(null);
      setAssignEmail("");
      setCreds({
        email: res.email,
        password: res.temp_password,
        gymName: gym.name,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create owner");
    } finally {
      setAssignSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-base font-semibold md:text-lg">Gyms & commission</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">← Orders</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 md:px-6 md:py-8">
        <form
          onSubmit={add}
          className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div>
            <h2 className="font-semibold">Add a gym</h2>
            <p className="text-xs text-muted-foreground">
              Optionally enter the owner's email — we'll auto-generate a
              temporary password and show it to you to share.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <Label htmlFor="gym-name">Gym name (must match pickup spelling)</Label>
              <Input
                id="gym-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pulse Fitness — Osu"
              />
            </div>
            <div>
              <Label htmlFor="gym-rate">GH₵ / crate</Label>
              <Input
                id="gym-rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Owner login (optional)
            </p>
            <div>
              <Label htmlFor="owner-email">Owner email</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                autoComplete="off"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              A secure temporary password is generated automatically. The owner
              must change it on first sign-in.
            </p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving…" : "Add gym"}
          </Button>
        </form>

        <div className="space-y-3">
          {gyms.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatGhs(Number(g.commission_per_crate))} per crate
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">
                      GH₵
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(g.commission_per_crate)}
                      className="h-8 w-20"
                      onBlur={(e) => updateRate(g.id, e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant={g.active ? "outline" : "secondary"}
                    onClick={() => toggleActive(g)}
                  >
                    {g.active ? "Active" : "Inactive"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      assignFor === g.id ? setAssignFor(null) : openAssign(g.id)
                    }
                  >
                    {assignFor === g.id ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-4 w-4" />
                        Add login
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeGym(g)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {assignFor === g.id && (
                <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    type="email"
                    placeholder="owner@example.com"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    size="sm"
                    disabled={assignSubmitting}
                    onClick={() => submitAssign(g)}
                  >
                    {assignSubmitting ? "Creating…" : "Create login"}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {gyms.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No gyms yet. Add your first one above.
            </p>
          )}
        </div>
      </main>

      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Owner login created</DialogTitle>
            <DialogDescription>
              Share these credentials with the owner of{" "}
              <strong>{creds?.gymName}</strong>. They'll be required to set a
              new password on first sign-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="flex gap-2">
                <Input readOnly value={creds?.email ?? ""} className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => creds && copy(creds.email, "email")}
                >
                  {copied === "email" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Temporary password</Label>
              <div className="flex gap-2">
                <Input readOnly value={creds?.password ?? ""} className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => creds && copy(creds.password, "password")}
                >
                  {copied === "password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                creds &&
                copy(
                  `Email: ${creds.email}\nTemporary password: ${creds.password}\nSign in at: ${window.location.origin}/auth`,
                  "all",
                )
              }
            >
              {copied === "all" ? "Copied!" : "Copy all"}
            </Button>
            <Button type="button" onClick={() => setCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
