import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatGhs } from "@/lib/admin-utils";
import { createGymUser } from "@/lib/admin-users.functions";
import { Trash2, UserPlus, X } from "lucide-react";

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

function GymsPage() {
  const createUser = useServerFn(createGymUser);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignPass, setAssignPass] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("gyms")
      .select("*")
      .order("name");
    if (error) toast.error(error.message);
    setGyms((data as Gym[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const wantsOwner = ownerEmail.trim().length > 0;
    if (wantsOwner && ownerPassword.length < 8) {
      toast.error("Owner password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { data: gym, error } = await supabase
        .from("gyms")
        .insert({
          name: name.trim(),
          commission_per_crate: Number(rate) || 0,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (wantsOwner && gym) {
        await createUser({
          data: {
            email: ownerEmail.trim(),
            password: ownerPassword,
            role: "gym_owner",
            gym_ids: [gym.id],
          },
        });
        toast.success(
          `Gym added and owner account created. Share login: ${ownerEmail.trim()}`,
        );
      } else {
        toast.success("Gym added");
      }

      setName("");
      setRate("");
      setOwnerEmail("");
      setOwnerPassword("");
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
    // remove owner links first (no FK cascade)
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
    setAssignPass("");
  };

  const submitAssign = async (gymId: string) => {
    if (!assignEmail.trim() || assignPass.length < 8) {
      toast.error("Email required and password must be at least 8 characters");
      return;
    }
    setAssignSubmitting(true);
    try {
      await createUser({
        data: {
          email: assignEmail.trim(),
          password: assignPass,
          role: "gym_owner",
          gym_ids: [gymId],
        },
      });
      toast.success(`Owner login created: ${assignEmail.trim()}`);
      setAssignFor(null);
      setAssignEmail("");
      setAssignPass("");
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
              Optionally create the owner's login at the same time so they can
              sign in and see their sales & commission.
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
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div>
                <Label htmlFor="owner-pass">Temporary password (min 8)</Label>
                <Input
                  id="owner-pass"
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Leave blank to add the gym only — you can create their login later
              from the list below.
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
                <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    type="email"
                    placeholder="owner@example.com"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    autoComplete="off"
                  />
                  <Input
                    type="text"
                    placeholder="Password (min 8)"
                    value={assignPass}
                    onChange={(e) => setAssignPass(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    size="sm"
                    disabled={assignSubmitting}
                    onClick={() => submitAssign(g.id)}
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
    </div>
  );
}
