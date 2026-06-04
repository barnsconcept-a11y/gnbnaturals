import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Package, MapPin, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/whatsapp";
import { formatGHS } from "@/lib/cart";

export const Route = createFileRoute("/track/$orderId")({
  head: () => ({ meta: [{ title: "Track your order — G&B Naturals" }] }),
  component: TrackPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
      Couldn't load this order: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-8 text-center">Order not found.</div>
  ),
});

type TrackedOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_station: string;
  total_amount: number;
  total_crates: number;
  status: string;
  created_at: string;
};

const STEPS = [
  { key: "pending_review", label: "Order received", desc: "We're verifying your payment" },
  { key: "confirmed", label: "Payment confirmed", desc: "We're preparing your crates" },
  { key: "ready", label: "Ready for pickup", desc: "Come collect at your station" },
  { key: "completed", label: "Picked up", desc: "Enjoy! See you next time" },
] as const;

function statusIndex(status: string) {
  const i = STEPS.findIndex((s) => s.key === status);
  if (i >= 0) return i;
  if (status === "cancelled" || status === "refunded") return -1;
  return 0;
}

function TrackPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,customer_name,customer_phone,pickup_station,total_amount,total_crates,status,created_at",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setOrder(data as TrackedOrder);
      }
      setLoading(false);
    };
    load();

    // Live status updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          if (!active) return;
          setOrder((prev) => (prev ? { ...prev, ...(payload.new as Partial<TrackedOrder>) } : prev));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-base font-semibold">Order not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Double-check the link, or contact us on WhatsApp for help.
        </p>
        <Button asChild className="mt-6 rounded-full" size="lg">
          <a href={whatsappLink("Hi! I need help finding my order.")}>
            <MessageCircle className="h-4 w-4" /> Message on WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  const cur = statusIndex(order.status);
  const cancelled = order.status === "cancelled" || order.status === "refunded";
  const shortId = order.id.slice(0, 8).toUpperCase();
  const waMsg = `Hi! I'm asking about my order #${shortId} (${order.customer_name}).`;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        ← G&B Naturals
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-elevated">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Order #{shortId}
        </div>
        <div className="mt-1 text-xl font-bold">Hi {order.customer_name.split(" ")[0]}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {order.total_crates} crate{order.total_crates !== 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-foreground">{formatGHS(Number(order.total_amount))}</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" /> Pickup: {order.pickup_station}
        </div>
      </div>

      {cancelled ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          This order was {order.status}. Message us on WhatsApp if you have questions.
        </div>
      ) : (
        <ol className="mt-6 space-y-3">
          {STEPS.map((s, i) => {
            const done = i < cur;
            const active = i === cur;
            return (
              <li
                key={s.key}
                className={`flex gap-3 rounded-xl border p-3 ${
                  active
                    ? "border-primary bg-primary/5"
                    : done
                      ? "border-border bg-card"
                      : "border-border bg-card/50 opacity-60"
                }`}
              >
                <div
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Button asChild size="lg" className="mt-6 h-12 w-full rounded-full bg-[#25D366] text-white shadow-elevated hover:bg-[#1ebe57]">
        <a href={whatsappLink(waMsg)}>
          <MessageCircle className="h-5 w-5" /> Message us on WhatsApp
        </a>
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Bookmark this page — it updates automatically as your order progresses.
      </p>
    </div>
  );
}
