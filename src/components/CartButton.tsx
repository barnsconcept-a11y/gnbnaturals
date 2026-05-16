import { MapPin, Minus, MessageCircle, Plus, ShoppingCart, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCart, formatGHS } from "@/lib/cart";
import { PICKUP_STATIONS } from "@/lib/pickup";

// Update this to your real number, in international format without "+"
const WHATSAPP_NUMBER = "233548363844";

function buildWhatsAppUrl(message: string) {
  const text = encodeURIComponent(message);
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return isMobile
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`;
}

export function CartButton() {
  const {
    items,
    totalItems,
    totalCrates,
    totalPrice,
    pickup,
    setPickup,
    isOpen,
    open,
    close,
    setQty,
    remove,
    clear,
  } = useCart();

  const message = (() => {
    if (items.length === 0) return "";
    const lines = items.map(
      (i) =>
        `• ${i.qty}× ${i.stack} — ${i.variant} (${formatGHS(i.unitPrice)} ea) = ${formatGHS(
          i.unitPrice * i.qty,
        )}`,
    );
    return [
      "Hi G&B Naturals! I'd like to reserve the following:",
      "",
      ...lines,
      "",
      `Total crates: ${totalCrates}`,
      `Total: ${formatGHS(totalPrice)}`,
      "",
      `Pickup station: ${pickup || "(not selected)"}`,
      "Name:",
    ].join("\n");
  })();

  const canSubmit = items.length > 0 && pickup.length > 0;
  const whatsappUrl = canSubmit ? buildWhatsAppUrl(message) : "#";

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Open cart (${totalItems} items)`}
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 items-center gap-2.5 rounded-full bg-primary px-5 text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 active:translate-y-0 md:bottom-7 md:right-7"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="text-sm font-semibold">
          {totalItems > 0 ? `${totalItems} · ${formatGHS(totalPrice)}` : "Cart"}
        </span>
        {totalItems > 0 && (
          <span className="ml-1 grid h-6 min-w-6 place-items-center rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary">
            {totalItems}
          </span>
        )}
      </button>

      <Sheet open={isOpen} onOpenChange={(o) => (o ? open() : close())}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-6">
            <SheetTitle className="text-xl">Your reservation</SheetTitle>
            <SheetDescription>
              Reserve weekly crates and monthly stacks. Confirm via WhatsApp — we hold them for you.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="grid place-items-center gap-3 py-16 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your cart is empty. Pick a stack and add crates or a 4-crate monthly bundle.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {items.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight">{i.stack}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{i.variant}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(i.id)}
                        aria-label="Remove"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => setQty(i.id, i.qty - 1)}
                          aria-label="Decrease"
                          className="grid h-9 w-9 place-items-center rounded-l-full text-foreground transition-colors hover:bg-secondary"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">{i.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(i.id, i.qty + 1)}
                          aria-label="Increase"
                          className="grid h-9 w-9 place-items-center rounded-r-full text-foreground transition-colors hover:bg-secondary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {formatGHS(i.unitPrice * i.qty)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatGHS(i.unitPrice)} ea
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <SheetFooter className="border-t border-border bg-secondary/30 p-6">
              <div className="w-full space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Pickup station / gym
                  </label>
                  <Select value={pickup} onValueChange={setPickup}>
                    <SelectTrigger className="h-11 rounded-xl bg-background">
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {totalCrates} crate{totalCrates !== 1 ? "s" : ""} total
                  </span>
                  <span className="text-lg font-bold tracking-tight">
                    {formatGHS(totalPrice)}
                  </span>
                </div>
                <Button
                  asChild={canSubmit}
                  size="lg"
                  disabled={!canSubmit}
                  className="h-12 w-full rounded-full text-base shadow-elevated"
                >
                  {canSubmit ? (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> Reserve via WhatsApp
                    </a>
                  ) : (
                    <span>
                      <MessageCircle className="h-4 w-4" />
                      {pickup ? "Reserve via WhatsApp" : "Pick a station to continue"}
                    </span>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={clear}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear cart
                </button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
