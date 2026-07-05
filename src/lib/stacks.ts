export type StackDef = {
  id: "starter" | "performance" | "elite";
  name: "Small" | "Medium" | "Jumbo";
  cratePrice: number;
  stackPrice: number;
};

// Default retail prices. Per-gym overrides live in gym_stack_discounts.
export const DEFAULT_STACKS: StackDef[] = [
  { id: "starter", name: "Small", cratePrice: 60, stackPrice: 230 },
  { id: "performance", name: "Medium", cratePrice: 65, stackPrice: 250 },
  { id: "elite", name: "Jumbo", cratePrice: 75, stackPrice: 290 },
];

export type GymDiscountRow = {
  stack_id: string;
  crate_price: number | null;
  stack_price: number | null;
  discount_percent: number | null;
};

export function applyDiscounts(
  stacks: StackDef[],
  discounts: GymDiscountRow[] | null | undefined,
): StackDef[] {
  if (!discounts?.length) return stacks;
  const byId = new Map(discounts.map((d) => [d.stack_id, d]));
  return stacks.map((s) => {
    const d = byId.get(s.id);
    if (!d) return s;
    const pct = d.discount_percent ?? null;
    const factor = pct != null ? 1 - Number(pct) / 100 : 1;
    const crate =
      d.crate_price != null
        ? Number(d.crate_price)
        : Math.round(s.cratePrice * factor);
    const stack =
      d.stack_price != null
        ? Number(d.stack_price)
        : Math.round(s.stackPrice * factor);
    return { ...s, cratePrice: crate, stackPrice: stack };
  });
}
