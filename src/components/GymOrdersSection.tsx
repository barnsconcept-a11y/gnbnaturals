import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ORDER_STATUSES, formatGhs, statusClass, statusLabel } from "@/lib/admin-utils";

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  pickup_station: string;
  items: Array<{ stack: string; variant: string; unit_price: number; qty: number }>;
  total_amount: number;
  total_crates: number;
  proof_path: string;
  status: string;
  is_paid: boolean;
  unpaid_note: string | null;
};


export function GymOrdersSection({ gymName }: { gymName: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!gymName) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("pickup_station", gymName)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      setOrders(((data ?? []) as unknown) as Order[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [gymName]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Status updated");
  };

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 10);
    if (error) return toast.error(error.message);
    setProofUrl(data.signedUrl);
  };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 md:p-5">
      <div>
        <h2 className="font-semibold">Orders for this gym</h2>
        <p className="text-xs text-muted-foreground">
          Exactly what this gym&apos;s owner sees when they sign in.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders for this gym yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{o.customer_name}</div>
                  <a href={`tel:${o.customer_phone}`} className="text-xs text-muted-foreground">
                    {o.customer_phone}
                  </a>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(o.status)}`}>
                    {statusLabel(o.status)}
                  </span>
                  {!o.is_paid && (
                    <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      Unpaid
                    </span>
                  )}
                </div>
              </div>
              {!o.is_paid && o.unpaid_note && (
                <div className="mt-1 text-xs text-destructive">{o.unpaid_note}</div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()}
              </div>

              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {(o.items ?? []).map((it, i) => (
                  <div key={i}>
                    {it.qty}× {it.stack} · {it.variant}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{o.total_crates} crates</span>
                <span className="font-semibold text-foreground">
                  {formatGhs(Number(o.total_amount))}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => viewProof(o.proof_path)}>
                  View proof
                </Button>
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="h-9 w-44">
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
        </div>
      )}

      <Dialog open={!!proofUrl} onOpenChange={(v) => !v && setProofUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment proof</DialogTitle>
          </DialogHeader>
          {proofUrl && (
            <img src={proofUrl} alt="Payment proof" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
