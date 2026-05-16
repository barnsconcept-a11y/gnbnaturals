import { useEffect, useMemo, useState } from "react";
import { MapPin, Minus, Plus, ShoppingBag, Smartphone, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCart, formatGHS, type CartItem } from "@/lib/cart";
import { PICKUP_STATIONS } from "@/lib/pickup";
import { CheckoutDialog } from "@/components/CheckoutDialog";

export type BuilderStack = {
  id: string;
  name: string;
  cratePrice: number;
  stackPrice: number;
};

type LineKey = `${string}-single` | `${string}-pack4`;
type Lines = Record<string, number>;

export function OrderBuilder({
  open,
  onOpenChange,
  stacks,
  initialStackId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stacks: BuilderStack[];
  initialStackId?: string;
}) {
  const { items, add, pickup, setPickup, open: openCart } = useCart();
  const [lines, setLines] = useState<Lines>({});

  // Seed builder with the highlighted stack each time it opens
  useEffect(() => {
    if (!open) return;
    const seed: Lines = {};
    if (initialStackId) {
      seed[`${initialStackId}-pack4`] = 1;
    }
    setLines(seed);
  }, [open, initialStackId]);

  const bump = (key: string, delta: number) =>
    setLines((prev) => {
      const next = Math.max(0, (prev[key] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[key];
      else copy[key] = next;
      return copy;
    });

  const { totalCrates, totalPrice, hasItems } = useMemo(() => {
    let crates = 0;
    let price = 0;
    let count = 0;
    for (const s of stacks) {
      const single = lines[`${s.id}-single`] ?? 0;
      const pack = lines[`${s.id}-pack4`] ?? 0;
      crates += single + pack * 4;
      price += single * s.cratePrice + pack * s.stackPrice;
      count += single + pack;
    }
    return { totalCrates: crates, totalPrice: price, hasItems: count > 0 };
  }, [lines, stacks]);

  const canSubmit = hasItems && pickup.length > 0;
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const commitToCart = () => {
    for (const s of stacks) {
      const single = lines[`${s.id}-single`] ?? 0;
      const pack = lines[`${s.id}-pack4`] ?? 0;
      if (pack > 0) {
        add(
          {
            id: `${s.id}-pack4` as LineKey,
            stack: s.name,
            variant: "4-Crate Monthly Stack",
            unitPrice: s.stackPrice,
          } as Omit<CartItem, "qty">,
          pack,
        );
      }
      if (single > 0) {
        add(
          {
            id: `${s.id}-single` as LineKey,
            stack: s.name,
            variant: "Single Crate",
            unitPrice: s.cratePrice,
          } as Omit<CartItem, "qty">,
          single,
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl">Build your order</DialogTitle>
          <DialogDescription>
            Mix any stacks and single crates, then pick your station.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          <ul className="flex flex-col gap-4">
            {stacks.map((s) => {
              const isInitial = s.id === initialStackId;
              const packQty = lines[`${s.id}-pack4`] ?? 0;
              const singleQty = lines[`${s.id}-single`] ?? 0;
              return (
                <li
                  key={s.id}
                  className={[
                    "rounded-2xl border p-4 shadow-card",
                    isInitial ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{s.name}</h3>
                        {isInitial && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                            <Sparkles className="h-2.5 w-2.5" /> picked
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatGHS(s.cratePrice)} / crate · {formatGHS(s.stackPrice)} per 4-crate stack
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Stepper
                      label="4-Crate Monthly Stack"
                      sub={formatGHS(s.stackPrice)}
                      qty={packQty}
                      onMinus={() => bump(`${s.id}-pack4`, -1)}
                      onPlus={() => bump(`${s.id}-pack4`, 1)}
                      emphasize
                    />
                    <Stepper
                      label="Single Crate"
                      sub={formatGHS(s.cratePrice)}
                      qty={singleQty}
                      onMinus={() => bump(`${s.id}-single`, -1)}
                      onPlus={() => bump(`${s.id}-single`, 1)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Pickup station / gym
            </label>
            <Select value={pickup} onValueChange={setPickup}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Choose your pickup location" />
              </SelectTrigger>
              <SelectContent>
                {PICKUP_STATIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-border bg-secondary/30 p-5 sm:flex-col">
          <div className="flex w-full items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalCrates} crate{totalCrates !== 1 ? "s" : ""}{" "}
              {hasItems ? `· ${pickup ? "ready to send" : "pick a station"}` : ""}
            </span>
            <span className="text-lg font-bold tracking-tight">{formatGHS(totalPrice)}</span>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-full"
              disabled={!hasItems}
              onClick={() => {
                commitToCart();
                onOpenChange(false);
                openCart();
              }}
            >
              <ShoppingBag className="h-4 w-4" /> Save to cart
            </Button>
            <Button
              asChild={canSubmit}
              size="lg"
              className="h-12 rounded-full shadow-elevated"
              disabled={!canSubmit}
            >
              {canSubmit ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Reserve via WhatsApp
                </a>
              ) : (
                <span>
                  <MessageCircle className="h-4 w-4" /> Reserve via WhatsApp
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({
  label,
  sub,
  qty,
  onMinus,
  onPlus,
  emphasize,
}: {
  label: string;
  sub: string;
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  emphasize?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
        emphasize ? "border-primary/30 bg-background" : "border-border bg-background",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{label}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={onMinus}
          disabled={qty === 0}
          className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={onPlus}
          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
