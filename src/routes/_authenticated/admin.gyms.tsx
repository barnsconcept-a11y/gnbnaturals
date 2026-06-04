import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatGhs } from "@/lib/admin-utils";

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
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.from("gyms").insert({
      name: name.trim(),
      commission_per_crate: Number(rate) || 0,
    });
    if (error) return toast.error(error.message);
    setName("");
    setRate("");
    toast.success("Gym added");
    load();
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">Gyms & commission rates</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">← Orders</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <form
          onSubmit={add}
          className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_140px_auto]"
        >
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
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add gym
            </Button>
          </div>
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
                        className="h-8 w-28"
                        onBlur={(e) =>
                          updateRate(g.id, e.target.value)
                        }
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
