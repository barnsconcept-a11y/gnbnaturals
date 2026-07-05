import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getGymDetail,
  updateGym,
  removeGymOwner,
  createGymUser,
} from "@/lib/admin-users.functions";
import { Trash2, UserPlus, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/gyms/$gymId")({
  head: () => ({ meta: [{ title: "Gym profile - Admin" }] }),
  component: GymDetailPage,
});

type Owner = {
  user_id: string;
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
};

function GymDetailPage() {
  const { gymId } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getGymDetail);
  const saveGym = useServerFn(updateGym);
  const removeOwner = useServerFn(removeGymOwner);
  const createUser = useServerFn(createGymUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [active, setActive] = useState(true);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [addingOwner, setAddingOwner] = useState(false);

  const load = async () => {
    try {
      const res = await fetchDetail({ data: { gym_id: gymId } });
      setName(res.gym.name);
      setRate(String(res.gym.commission_per_crate ?? 0));
      setActive(!!res.gym.active);
      setOwners(res.owners);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [gymId]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveGym({
        data: {
          gym_id: gymId,
          name: name.trim(),
          commission_per_crate: Number(rate) || 0,
          active,
        },
      });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onRemoveOwner = async (o: Owner) => {
    if (!confirm(`Remove ${o.email} from this gym?`)) return;
    try {
      await removeOwner({ data: { gym_id: gymId, user_id: o.user_id } });
      toast.success("Owner removed");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const onAddOwner = async () => {
    if (!newEmail.trim()) return toast.error("Email required");
    setAddingOwner(true);
    try {
      await createUser({
        data: {
          email: newEmail.trim(),
          role: "gym_owner",
          gym_ids: [gymId],
        },
      });
      toast.success(`Invite sent to ${newEmail.trim()}`);
      setNewEmail("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setAddingOwner(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-base font-semibold md:text-lg">Gym profile</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/gyms">
              <ArrowLeft className="mr-1 h-4 w-4" /> All gyms
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 md:px-6 md:py-8">
        <form
          onSubmit={onSave}
          className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <h2 className="font-semibold">Gym info</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <Label htmlFor="g-name">Name</Label>
              <Input
                id="g-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="g-rate">GH₵ / crate</Label>
              <Input
                id="g-rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant={active ? "outline" : "secondary"}
              onClick={() => setActive((a) => !a)}
            >
              {active ? "Active" : "Inactive"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Click to toggle. Save to apply.
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/admin/gyms" })}
            >
              Cancel
            </Button>
          </div>
        </form>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4 md:p-5">
          <div>
            <h2 className="font-semibold">Owner logins</h2>
            <p className="text-xs text-muted-foreground">
              Emails that can sign in to manage this gym.
            </p>
          </div>

          {owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No owner logins yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {owners.map((o) => (
                <li
                  key={o.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.last_sign_in_at
                        ? `Last sign-in ${new Date(o.last_sign_in_at).toLocaleDateString()}`
                        : "Never signed in"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemoveOwner(o)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto]">
            <Input
              type="email"
              placeholder="owner@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="off"
            />
            <Button size="sm" disabled={addingOwner} onClick={onAddOwner}>
              <UserPlus className="mr-1 h-4 w-4" />
              {addingOwner ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
