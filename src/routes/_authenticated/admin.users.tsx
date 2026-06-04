import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createGymUser,
  deleteGymUser,
  listGymUsers,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: UsersPage,
});

type Gym = { id: string; name: string };
type ListedUser = {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  gyms: string[];
};

function UsersPage() {
  const create = useServerFn(createGymUser);
  const list = useServerFn(listGymUsers);
  const remove = useServerFn(deleteGymUser);

  const [users, setUsers] = useState<ListedUser[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "gym_owner">("gym_owner");
  const [gymId, setGymId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [{ data: gymRows }, listed] = await Promise.all([
        supabase.from("gyms").select("id, name").order("name"),
        list(),
      ]);
      setGyms((gymRows as Gym[]) ?? []);
      setUsers(listed as ListedUser[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "gym_owner" && !gymId) {
      toast.error("Pick a gym for the gym owner");
      return;
    }
    setSubmitting(true);
    try {
      await create({
        data: {
          email: email.trim(),
          password,
          role,
          gym_ids: role === "gym_owner" ? [gymId] : [],
        },
      });
      toast.success(`Account created. Share these credentials with the user.`);
      setEmail("");
      setPassword("");
      setGymId("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string, email: string) => {
    if (!confirm(`Delete account ${email}? This cannot be undone.`)) return;
    try {
      await remove({ data: { user_id: id } });
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">Users & access</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">← Orders</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="font-semibold">Create new account</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="u-pass">Temporary password (min 8 chars)</Label>
              <Input
                id="u-pass"
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym_owner">Gym owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "gym_owner" && (
              <div>
                <Label>Gym</Label>
                <Select value={gymId} onValueChange={setGymId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a gym" />
                  </SelectTrigger>
                  <SelectContent>
                    {gyms.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </Button>
          <p className="text-xs text-muted-foreground">
            You'll need to share the email & password with the user manually.
          </p>
        </form>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Gym(s)</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.roles.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.gyms.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(u.id, u.email)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      Delete
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
