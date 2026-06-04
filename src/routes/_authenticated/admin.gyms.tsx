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
              Leave blank to add the gym only. You can add owners later from
              the Users page.
            </p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving…" : "Add gym"}
          </Button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Commission / crate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {gyms.map((g) => (
                <tr key={g.id} className="border-t border-border">
                  <td className="px-4 py-3">{g.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={Number(g.commission_per_crate)}
                        className="h-8 w-24"
                        onBlur={(e) => updateRate(g.id, e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">
                        ({formatGhs(Number(g.commission_per_crate))})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant={g.active ? "outline" : "secondary"}
                      onClick={() => toggleActive(g)}
                    >
                      {g.active ? "Active" : "Inactive"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
