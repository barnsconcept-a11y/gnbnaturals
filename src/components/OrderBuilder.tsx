import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CalendarClock, MapPin, Smartphone, Sparkles } from "lucide-react";
import { expectedPickupLabel } from "@/lib/delivery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart, formatGHS, type CartItem } from "@/lib/cart";
import { usePickupLocations } from "@/lib/pickup";
import { CheckoutDialog } from "@/components/CheckoutDialog";

export type BuilderStack = {
  id: string;
  name: string;
  cratePrice: number;
  stackPrice: number;
};

type Choice = {
  stackId: string;
  // crates per month - 1 single crate, 4 = 1 monthly stack, etc.
  crates: number;
};

const QUICK_QTYS = [1, 2, 4, 8];

export function OrderBuilder({
  open,
  onOpenChange,
  stacks,
  initialStackId,
  stationPrefilled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stacks: BuilderStack[];
  initialStackId?: string;
  stationPrefilled?: boolean;
}) {
  const { add, pickup, setPickup, open: openCart } = useCart();
  const pickupLocations = usePickupLocations();
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<Choice>({
    stackId: initialStackId ?? stacks[0].id,
    crates: 4,
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Reset when reopened
  useEffect(() => {
    if (!open) return;
    setChoice({ stackId: initialStackId ?? stacks[0].id, crates: 4 });
    setStep(0);
  }, [open, initialStackId, stacks]);

  const selectedStack = stacks.find((s) => s.id === choice.stackId)!;

  const { totalPrice, packs, singles } = useMemo(() => {
    const packs = Math.floor(choice.crates / 4);
    const singles = choice.crates % 4;
    const price = packs * selectedStack.stackPrice + singles * selectedStack.cratePrice;
    return { totalPrice: price, packs, singles };
  }, [choice, selectedStack]);

  const totalSteps = stationPrefilled ? 2 : 3;
  const isLast = step === totalSteps - 1;

  const commitToCart = () => {
    if (packs > 0) {
      add(
        {
          id: `${selectedStack.id}-pack4`,
          stack: selectedStack.name,
          variant: "4-Crate Monthly Stack",
          unitPrice: selectedStack.stackPrice,
        } as Omit<CartItem, "qty">,
        packs,
      );
    }
    if (singles > 0) {
      add(
        {
          id: `${selectedStack.id}-single`,
          stack: selectedStack.name,
          variant: "Single Crate",
          unitPrice: selectedStack.cratePrice,
        } as Omit<CartItem, "qty">,
        singles,
      );
    }
  };

  const canAdvance =
    (step === 0 && !!choice.stackId) ||
    (step === 1 && choice.crates > 0) ||
    (step === 2 && pickup.length > 0);

  const handleNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      commitToCart();
      setCheckoutOpen(true);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 pb-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">
              {step === 0 && "Pick your stack"}
              {step === 1 && "How many crates?"}
              {step === 2 && "Pickup station"}
            </DialogTitle>
            <StepDots total={totalSteps} current={step} />
          </div>
        </DialogHeader>

        <div className="min-h-[280px] px-5 py-5">
          {step === 0 && (
            <ul className="flex flex-col gap-2.5">
              {stacks.map((s) => {
                const active = s.id === choice.stackId;
                const recommended = s.id === "performance";
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setChoice((c) => ({ ...c, stackId: s.id }))}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 shadow-elevated"
                          : "border-border bg-card hover:border-primary/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold leading-tight">
                              {s.name}
                            </span>
                            {recommended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                                <Sparkles className="h-2.5 w-2.5" /> popular
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatGHS(s.cratePrice)} / crate
                          </p>
                        </div>
                        <div
                          className={[
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background",
                          ].join(" ")}
                        >
                          {active && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                Reserve crates for this month. Save{" "}
                <span className="font-semibold text-foreground">
                  {formatGHS(selectedStack.cratePrice * 4 - selectedStack.stackPrice)}
                </span>{" "}
                per 4-crate stack.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_QTYS.map((q) => {
                  const active = choice.crates === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setChoice((c) => ({ ...c, crates: q }))}
                      className={[
                        "rounded-xl border py-3 text-center transition-all",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-elevated"
                          : "border-border bg-card hover:border-primary/40",
                      ].join(" ")}
                    >
                      <div className="text-lg font-bold leading-none">{q}</div>
                      <div className="mt-1 text-[10px] opacity-80">
                        crate{q !== 1 ? "s" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <span className="text-xs text-muted-foreground">Custom</span>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setChoice((c) => ({ ...c, crates: Math.max(1, c.crates - 1) }))
                    }
                    className="grid h-8 w-8 place-items-center rounded-full bg-background text-foreground"
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="min-w-6 text-center text-base font-bold tabular-nums">
                    {choice.crates}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChoice((c) => ({ ...c, crates: c.crates + 1 }))}
                    className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-cream/60 px-4 py-3 text-xs text-muted-foreground">
                {packs > 0 && (
                  <div>
                    {packs} × 4-crate stack ={" "}
                    <span className="font-semibold text-foreground">
                      {formatGHS(packs * selectedStack.stackPrice)}
                    </span>
                  </div>
                )}
                {singles > 0 && (
                  <div>
                    {singles} × single crate ={" "}
                    <span className="font-semibold text-foreground">
                      {formatGHS(singles * selectedStack.cratePrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Choose where to collect
              </p>
              <div className="mb-1 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="leading-relaxed">
                  We deliver twice a week. Order by <strong>Tue 11:59pm</strong> → pickup Thursday. After Tuesday → pickup the following Monday.
                  <div className="mt-1 text-muted-foreground">
                    Your expected pickup: <span className="font-semibold text-foreground">{expectedPickupLabel()}</span>
                  </div>
                </div>
              </div>
              <ul className="flex max-h-[44vh] flex-col gap-1.5 overflow-y-auto pr-1">
                {pickupLocations.map((p: string) => {
                  const active = pickup === p;
                  return (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => setPickup(p)}
                        className={[
                          "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all",
                          active
                            ? "border-primary bg-primary/5 font-semibold"
                            : "border-border bg-card hover:border-primary/40",
                        ].join(" ")}
                      >
                        <span className="min-w-0 truncate">{p}</span>
                        {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-secondary/30 px-5 py-4">
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {choice.crates} crate{choice.crates !== 1 ? "s" : ""}
            </div>
            <div className="text-lg font-bold tabular-nums tracking-tight">
              {formatGHS(totalPrice)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 rounded-full"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              className="h-11 rounded-full shadow-elevated"
              disabled={!canAdvance}
              onClick={handleNext}
            >
              {isLast ? (
                <>
                  <Smartphone className="h-4 w-4" /> Pay with MoMo
                </>
              ) : (
                <>
                  Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            commitToCart();
            onOpenChange(false);
            openCart();
          }}
          className="border-t border-border bg-background px-5 py-2 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Save to cart and keep shopping
        </button>
      </DialogContent>
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={(v) => {
          setCheckoutOpen(v);
          if (!v) onOpenChange(false);
        }}
      />
    </Dialog>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            "h-1.5 rounded-full transition-all",
            i === current ? "w-5 bg-primary" : "w-1.5 bg-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
