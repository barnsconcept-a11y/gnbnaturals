export const PICKUP_STATIONS = [
  "Pulse Fitness — Osu",
  "Fitness Vault — East Legon",
  "Body Tech Gym — Spintex",
  "Accra Sports Stadium Gym",
  "Lifestyle Gym — Airport Residential",
  "Bond's Gym — Adenta",
  "The Matrix Gym — Legon",
  "Fit Dons — Adenta",
  "The Klus Fitness Club",
  "Gym Ike Fitness & Health Club Center",
  "Other (I'll share on WhatsApp)",
];

export function gymSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/—|–/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function stationFromSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return PICKUP_STATIONS.find((p) => gymSlug(p) === s);
}
