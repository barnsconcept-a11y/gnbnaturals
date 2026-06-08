// Delivery schedule helpers.
// Rule: we deliver twice a week.
//   - Orders placed by Tuesday 23:59 Africa/Accra → delivered Thursday (same week)
//   - Orders placed after Tuesday 23:59 → delivered the following Monday
// Africa/Accra is UTC+0 year-round, so we can use UTC directly.

export const DELIVERY_SCHEDULE_TEXT =
  "We deliver twice a week. Order by Tuesday 11:59pm for Thursday pickup - later orders are ready the following Monday.";

export function expectedPickupDate(placedAt: Date = new Date()): Date {
  // Work in UTC (Africa/Accra == UTC)
  const d = new Date(placedAt.getTime());
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  // Cutoff: end of Tuesday (day === 2). After Tuesday → next Monday.
  // Sun(0), Mon(1), Tue(2) → Thursday this week (day 4)
  // Wed(3), Thu(4), Fri(5), Sat(6) → next Monday (day 1)
  const result = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (day <= 2) {
    result.setUTCDate(result.getUTCDate() + (4 - day));
  } else {
    result.setUTCDate(result.getUTCDate() + ((8 - day) % 7 || 7));
  }
  return result;
}

export function formatPickupDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Accra",
  });
}

export function expectedPickupLabel(placedAt?: Date | string): string {
  const d = placedAt ? new Date(placedAt) : new Date();
  return formatPickupDate(expectedPickupDate(d));
}
