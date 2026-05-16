import { useRef, useState } from "react";
import { Copy, CheckCircle2, Upload, Loader2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart, formatGHS } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const MOMO_NUMBER = "0548363844";
export const MOMO_NAME = "Philomina Afedu";
export const MOMO_NETWORK = "MTN Mobile Money";

export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { items, totalPrice, totalCrates, pickup, clear, close } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(MOMO_NUMBER);
      toast.success("MoMo number copied");
    } catch {
      toast.error("Copy failed — please copy manually");
    }
  };

  const reset = () => {
    setName("");
    setPhone("");
    setNotes("");
    setFile(null);
    setDone(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please attach a screenshot of your payment");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("orders").insert({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        pickup_station: pickup,
        items: items.map((i) => ({
          stack: i.stack,
          variant: i.variant,
          unit_price: i.unitPrice,
          qty: i.qty,
        })),
        total_amount: totalPrice,
        currency: "GHS",
        momo_reference: reference.trim() || null,
        proof_path: path,
        notes: notes.trim() || null,
      });
      if (insErr) throw insErr;

      setDone(true);
      toast.success("Order received — we'll confirm shortly");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't submit order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (submitting) return;
    if (!v && done) {
      clear();
      close();
      reset();
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl">
            {done ? "Order received" : "Pay with Mobile Money"}
          </DialogTitle>
          <DialogDescription>
            {done
              ? "We'll verify your payment and confirm your pickup shortly."
              : "Send payment, then upload the screenshot to complete checkout."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold">Thanks, {name || "champ"}!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your order for {totalCrates} crate{totalCrates !== 1 ? "s" : ""} ({formatGHS(totalPrice)})
                is being reviewed. We'll text you at {phone || "your number"} once confirmed.
              </p>
            </div>
            <Button
              size="lg"
              className="mt-2 h-12 rounded-full px-8"
              onClick={() => handleClose(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-5 px-6 py-5">
              {/* MoMo card */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Smartphone className="h-3.5 w-3.5" /> Step 1 · Send {formatGHS(totalPrice)}
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-medium">{MOMO_NETWORK}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Number</span>
                    <button
                      type="button"
                      onClick={copyNumber}
                      className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1 font-mono text-base font-bold tracking-wide text-foreground transition-colors hover:bg-secondary"
                    >
                      {MOMO_NUMBER} <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Account name</span>
                    <span className="font-medium">{MOMO_NAME}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="co-name">Your name</Label>
                  <Input
                    id="co-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-phone">Phone</Label>
                  <Input
                    id="co-phone"
                    required
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="02XX XXX XXXX"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-ref">MoMo transaction ID (optional)</Label>
                <Input
                  id="co-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-proof">Step 2 · Upload payment screenshot</Label>
                <label
                  htmlFor="co-proof"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm transition-colors hover:bg-secondary/50"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {file ? (
                      <>
                        <div className="truncate font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB · tap to change
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium">Tap to attach screenshot</div>
                        <div className="text-xs text-muted-foreground">
                          JPG or PNG of your MoMo confirmation
                        </div>
                      </>
                    )}
                  </div>
                </label>
                <input
                  id="co-proof"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-notes">Notes (optional)</Label>
                <Textarea
                  id="co-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything we should know?"
                />
              </div>

              <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                Pickup at <span className="font-semibold text-foreground">{pickup || "—"}</span>
                {" · "}
                {totalCrates} crate{totalCrates !== 1 ? "s" : ""} ·{" "}
                <span className="font-semibold text-foreground">{formatGHS(totalPrice)}</span>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-12 w-full rounded-full text-base shadow-elevated"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>Complete checkout</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
