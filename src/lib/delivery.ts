// Delivery schedule helpers.
// Rule: pickup twice a week - Tuesdays and Thursdays.
//   - Orders placed Monday, Tuesday or Wednesday → pickup this Thursday
//   - Orders placed Thursday, Friday, Saturday or Sunday → pickup next Tuesday
// Africa/Accra is UTC+0 year-round, so we can use UTC directly.

export const DELIVERY_SCHEDULE_TEXT =
  "Pickup runs twice a week - Tuesdays and Thursdays. Order Mon-Wed for Thursday pickup; order Thu-Sun for the following Tuesday.";

export function expectedPickupDate(placedAt: Date = new Date()): Date {
  // Work in UTC (Africa/Accra == UTC)
  const d = new Date(placedAt.getTime());
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const result = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Mon(1), Tue(2), Wed(3) → Thursday (day 4) this week
  // Thu(4), Fri(5), Sat(6), Sun(0) → next Tuesday (day 2)
  let add: number;
  if (day >= 1 && day <= 3) {
    add = 4 - day;
  } else {
    // days until next Tuesday
    add = ((2 - day + 7) % 7) || 7;
  }
  result.setUTCDate(result.getUTCDate() + add);
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
