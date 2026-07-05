import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DEFAULT_STACKS } from "@/lib/stacks";
import { Percent, Save } from "lucide-react";

type Row = {
  stack_id: string;
  crate_price: string;
  discount_percent: string;
};

const empty = (): Row[] =>
  DEFAULT_STACKS.map((s) => ({
    stack_id: s.id,
    crate_price: "",
    discount_percent: "",
  }));

export function GymDiscountsSection({ gymId }: { gymId: string }) {
  const [rows, setRows] = useState<Row[]>(empty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gym_stack_discounts")
      .select("stack_id, crate_price, stack_price, discount_percent")
      .eq("gym_id", gymId);
    if (error) {
      toast.error(error.message);
    } else {
      const byId = new Map((data ?? []).map((d: any) => [d.stack_id, d]));
      setRows(
        DEFAULT_STACKS.map((s) => {
          const d: any = byId.get(s.id);
          return {
            stack_id: s.id,
            crate_price: d?.crate_price != null ? String(d.crate_price) : "",
            discount_percent:
              d?.discount_percent != null ? String(d.discount_percent) : "",
          };
        }),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.stack_id === id ? { ...x, ...patch } : x)));

  const onSave = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const crate = r.crate_price.trim() === "" ? null : Number(r.crate_price);
        const pct =
          r.discount_percent.trim() === "" ? null : Number(r.discount_percent);

        const allEmpty = crate == null && pct == null;

        if (allEmpty) {
          const { error } = await supabase
            .from("gym_stack_discounts")
            .delete()
            .eq("gym_id", gymId)
            .eq("stack_id", r.stack_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("gym_stack_discounts")
            .upsert(
              {
                gym_id: gymId,
                stack_id: r.stack_id,
                crate_price: crate,
                discount_percent: pct,
              },
              { onConflict: "gym_id,stack_id" },
            );
          if (error) throw error;
        }
      }
      toast.success("Discounts saved");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <div>
        <h2 className="font-semibold">Per-stack discounts</h2>
        <p className="text-xs text-muted-foreground">
          Set a percentage off the default, or override the crate / 4-crate
          stack price. Leave blank to charge the default. Overrides win over
          percentages.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-3">Stack</th>
              <th className="pb-2 pr-3">Default</th>
              <th className="pb-2 pr-3">Discount %</th>
              <th className="pb-2 pr-3">Crate GH₵</th>
              <th className="pb-2">4-crate GH₵</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const def = DEFAULT_STACKS.find((s) => s.id === r.stack_id)!;
              return (
                <tr key={r.stack_id}>
                  <td className="py-2 pr-3 font-medium">{def.name}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    GH₵ {def.cratePrice} · {def.stackPrice}/4
                  </td>
                  <td className="py-2 pr-3">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="—"
                        className="h-9 pr-7"
                        value={r.discount_percent}
                        onChange={(e) =>
                          update(r.stack_id, {
                            discount_percent: e.target.value,
                          })
                        }
                      />
                      <Percent className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(def.cratePrice)}
                      className="h-9"
                      value={r.crate_price}
                      onChange={(e) =>
                        update(r.stack_id, { crate_price: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(def.stackPrice)}
                      className="h-9"
                      value={r.stack_price}
                      onChange={(e) =>
                        update(r.stack_id, { stack_price: e.target.value })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={onSave} disabled={saving} size="sm">
        <Save className="mr-1 h-4 w-4" />
        {saving ? "Saving…" : "Save discounts"}
      </Button>
    </section>
  );
}
