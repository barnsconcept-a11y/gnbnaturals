export function statusLabel(s: string) {
  switch (s) {
    case "pending_review":
      return "Pending review";
    case "confirmed":
      return "Confirmed";
    case "picked_up":
      return "Picked up";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    default:
      return s;
  }
}

export function statusClass(s: string) {
  switch (s) {
    case "pending_review":
      return "bg-amber-100 text-amber-900";
    case "confirmed":
      return "bg-blue-100 text-blue-900";
    case "picked_up":
      return "bg-emerald-100 text-emerald-900";
    case "cancelled":
      return "bg-rose-100 text-rose-900";
    case "refunded":
      return "bg-zinc-200 text-zinc-800";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

export const ORDER_STATUSES = [
  "pending_review",
  "confirmed",
  "picked_up",
  "cancelled",
  "refunded",
] as const;

export function formatGhs(n: number) {
  return `GH₵${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
