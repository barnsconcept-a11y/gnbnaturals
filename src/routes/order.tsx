import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Leaf, MapPin, ShoppingBag } from "lucide-react";
import { CartProvider } from "@/lib/cart";
import { OrderBuilder, type BuilderStack } from "@/components/OrderBuilder";
import { CartButton } from "@/components/CartButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order")({
  component: OrderPage,
  head: () => ({
    meta: [
      { title: "Place Your Order — G&B Naturals" },
      {
        name: "description",
        content:
          "Scan, pick your stack, choose your gym pickup station and pay with MoMo. Fresh eggs reserved weekly.",
      },
      { property: "og:title", content: "Place Your Order — G&B Naturals" },
      {
        property: "og:description",
        content: "Reserve your weekly egg stack in under a minute.",
      },
    ],
  }),
});

const builderStacks: BuilderStack[] = [
  { id: "starter", name: "The Daily Starter Stack™", cratePrice: 60, stackPrice: 230 },
  { id: "performance", name: "The 4-A-Day Performance Stack™", cratePrice: 70, stackPrice: 270 },
  { id: "elite", name: "The Elite Jumbo Stack™", cratePrice: 80, stackPrice: 310 },
];

function OrderPage() {
  return (
    <CartProvider>
      <OrderPageInner />
    </CartProvider>
  );
}

function OrderPageInner() {
  const [open, setOpen] = useState(true);
  const [initial, setInitial] = useState<string | undefined>("performance");

  const startWith = (id: string) => {
    setInitial(id);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream/40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <span className="font-brand text-base leading-none">
                G<span className="italic opacity-90">&amp;</span>B
              </span>
            </div>
            <div className="text-sm font-semibold tracking-tight">NATURALS</div>
          </div>
          <CartButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Leaf className="h-3 w-3 text-primary" /> Natural Protein · Real Results
          </div>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            Place your weekly order
          </h1>
          <p className="mt-3 text-balance text-muted-foreground">
            Pick a stack, choose your gym pickup station, and pay with MoMo. Takes under a minute.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              size="lg"
              className="h-12 rounded-full px-6 text-base shadow-elevated"
              onClick={() => setOpen(true)}
            >
              <ShoppingBag className="h-4 w-4" /> Start order <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <MapPin className="mr-1 inline h-3 w-3 text-primary" />
            Pickup at your gym — no delivery needed.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {builderStacks.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => startWith(s.id)}
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="text-sm font-semibold leading-tight">{s.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                GHS {s.cratePrice} / crate · GHS {s.stackPrice} per 4-crate stack
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Choose <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </main>

      <OrderBuilder
        open={open}
        onOpenChange={setOpen}
        stacks={builderStacks}
        initialStackId={initial}
      />
    </div>
  );
}
