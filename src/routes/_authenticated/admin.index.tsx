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
import { MessageCircle } from "lucide-react";
import {
  ORDER_STATUSES,
  formatGhs,
  statusClass,
  statusLabel,
} from "@/lib/admin-utils";
import { toE164Ghana, whatsappLink } from "@/lib/whatsapp";

function customerWhatsappForStatus(o: { id: string; customer_name: string; customer_phone: string; pickup_station: string; status: string }) {
  const shortId = o.id.slice(0, 8).toUpperCase();
  const trackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/track/${o.id}`;
  let msg = `Hi ${o.customer_name.split(" ")[0]}, this is G&B Naturals about your order #${shortId}. Track: ${trackUrl}`;
  if (o.status === "confirmed") {
    msg = `Hi ${o.customer_name.split(" ")[0]}! ✅ Payment confirmed for order #${shortId}. We're preparing your crates — we'll let you know once they're ready for pickup at ${o.pickup_station}. Track: ${trackUrl}`;
  } else if (o.status === "ready") {
    msg = `Hi ${o.customer_name.split(" ")[0]}! 📦 Your order #${shortId} is ready for pickup at ${o.pickup_station}. See you soon! Track: ${trackUrl}`;
  } else if (o.status === "pending_review") {
    msg = `Hi ${o.customer_name.split(" ")[0]}, we received your order #${shortId} and are verifying payment. We'll confirm shortly. Track: ${trackUrl}`;
  }
  return whatsappLink(msg, toE164Ghana(o.customer_phone));
}

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
  const [ownerGymNames, setOwnerGymNames] = useState<string[]>([]);
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
      const gymRows = (gymsData as Gym[]) ?? [];
      setOrders(((ordersData ?? []) as unknown) as Order[]);
      setGyms(gymRows);
      setOwnerGymNames(admin ? [] : gymRows.map((g) => g.name));
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
    const updated = orders.find((o) => o.id === id);
    if (updated && (status === "confirmed" || status === "ready")) {
      const link = customerWhatsappForStatus({ ...updated, status });
      toast.success("Status updated", {
        description: "Notify the customer on WhatsApp",
        action: {
          label: "Send",
          onClick: () => window.open(link, "_blank", "noopener,noreferrer"),
        },
      });
    } else {
      toast.success("Status updated");
    }
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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <div>
            <h1 className="text-base font-semibold text-foreground md:text-lg">
              {isAdmin
                ? "G&B Naturals — Orders"
                : `Welcome back, ${email}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? `${email} · Admin`
                : ownerGymNames.length > 0
                  ? `Gym owner · ${ownerGymNames.join(", ")}`
                  : "Gym owner"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:space-y-6 md:px-6 md:py-8">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard label="Orders" value={String(stats.count)} />
          <StatCard label="Crates" value={String(stats.crates)} />
          <StatCard label="Revenue" value={formatGhs(stats.revenue)} />
          <StatCard label="Commission" value={formatGhs(stats.commission)} />
        </section>

        <section className="flex flex-wrap items-center gap-2 md:gap-3">
          {isAdmin && (
            <Select value={gymFilter} onValueChange={setGymFilter}>
              <SelectTrigger className="w-full sm:w-64">
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
            <SelectTrigger className="w-full sm:w-48">
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
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-1 last:border-0"
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

        {/* Mobile: card list */}
        <section className="space-y-3 md:hidden">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{o.customer_name}</div>
                  <a href={`tel:${o.customer_phone}`} className="text-xs text-muted-foreground">
                    {o.customer_phone}
                  </a>
                </div>
                <div className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusClass(o.status)}`}>
                  {statusLabel(o.status)}
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()} · {o.pickup_station}
              </div>
              <div className="mt-3 space-y-0.5 text-sm">
                {(o.items ?? []).map((it, i) => (
                  <div key={i} className="text-muted-foreground">
                    {it.qty}× {it.stack} · {it.variant}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{o.total_crates} crates</span>
                <span className="font-semibold text-foreground">{formatGhs(Number(o.total_amount))}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => viewProof(o.proof_path)}>
                  View proof
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="border-[#25D366]/40 text-[#1ebe57] hover:bg-[#25D366]/10"
                >
                  <a href={customerWhatsappForStatus(o)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              </div>
              <div className="mt-2">
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="h-9">
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
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-muted-foreground">
              No orders match these filters.
            </div>
          )}
        </section>

        {/* Desktop: table */}
        <section className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
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
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewProof(o.proof_path)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="border-[#25D366]/40 text-[#1ebe57] hover:bg-[#25D366]/10"
                      >
                        <a href={customerWhatsappForStatus(o)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      </Button>
                    </div>
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
