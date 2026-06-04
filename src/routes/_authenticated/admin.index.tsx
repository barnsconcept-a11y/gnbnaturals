import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ORDER_STATUSES,
  formatGhs,
  statusClass,
  statusLabel,
} from "@/lib/admin-utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Orders — G&B Naturals Admin" }] }),
  component: AdminDashboard,
});

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  pickup_station: string;
  items: Array<{ stack: string; variant: string; unit_price: number; qty: number }>;
  total_amount: number;
  total_crates: number;
  currency: string;
  momo_reference: string | null;
  proof_path: string;
  status: string;
  notes: string | null;
};

type Gym = { id: string; name: string; commission_per_crate: number };

function AdminDashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [gymFilter, setGymFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user!.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);

      const [{ data: ordersData, error: oErr }, { data: gymsData }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.from("gyms").select("*").order("name"),
        ]);
      if (oErr) toast.error(oErr.message);
      setOrders((ordersData as Order[]) ?? []);
      setGyms((gymsData as Gym[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (gymFilter !== "all" && o.pickup_station !== gymFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, gymFilter, statusFilter]);

  const stats = useMemo(() => {
    let revenue = 0;
    let crates = 0;
    const byGym = new Map<string, number>();
    for (const o of filtered) {
      if (o.status === "cancelled" || o.status === "refunded") continue;
      revenue += Number(o.total_amount);
      crates += o.total_crates;
      byGym.set(
        o.pickup_station,
        (byGym.get(o.pickup_station) ?? 0) + o.total_crates,
      );
    }
    let commission = 0;
    for (const [name, c] of byGym) {
      const g = gyms.find((g) => g.name === name);
      if (g) commission += c * Number(g.commission_per_crate);
    }
    return { revenue, crates, commission, count: filtered.length, byGym };
  }, [filtered, gyms]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Status updated");
  };

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 10);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProofUrl(data.signedUrl);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              G&B Naturals — Orders
            </h1>
            <p className="text-xs text-muted-foreground">
              Signed in as {email} {isAdmin ? "· Admin" : "· Gym owner"}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/gyms">Gyms</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/users">Users</Link>
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Orders" value={String(stats.count)} />
          <StatCard label="Crates" value={String(stats.crates)} />
          <StatCard label="Revenue" value={formatGhs(stats.revenue)} />
          <StatCard label="Commission" value={formatGhs(stats.commission)} />
        </section>

        <section className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Select value={gymFilter} onValueChange={setGymFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All gyms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gyms</SelectItem>
                {gyms.map((g) => (
                  <SelectItem key={g.id} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {isAdmin && stats.byGym.size > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Commission owed by gym
            </h2>
            <div className="space-y-2 text-sm">
              {Array.from(stats.byGym.entries()).map(([name, crates]) => {
                const g = gyms.find((g) => g.name === name);
                const rate = g ? Number(g.commission_per_crate) : 0;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between border-b border-border/60 py-1 last:border-0"
                  >
                    <span className="text-foreground">{name}</span>
                    <span className="text-muted-foreground">
                      {crates} crates × {formatGhs(rate)} ={" "}
                      <span className="font-semibold text-foreground">
                        {formatGhs(crates * rate)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Crates</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {o.customer_name}
                    </div>
                    <a
                      href={`tel:${o.customer_phone}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {o.customer_phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs">{o.pickup_station}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(o.items ?? []).map((it, i) => (
                      <div key={i}>
                        {it.qty}× {it.stack} · {it.variant}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">{o.total_crates}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatGhs(Number(o.total_amount))}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewProof(o.proof_path)}
                    >
                      View
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs ${statusClass(o.status)}`}
                    >
                      {statusLabel(o.status)}
                    </div>
                    <Select
                      value={o.status}
                      onValueChange={(v) => updateStatus(o.id, v)}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>

      <Dialog
        open={!!proofUrl}
        onOpenChange={(o) => !o && setProofUrl(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment proof</DialogTitle>
          </DialogHeader>
          {proofUrl && (
            <img
              src={proofUrl}
              alt="Payment proof"
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
