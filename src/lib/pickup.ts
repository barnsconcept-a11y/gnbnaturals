import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const OTHER_PICKUP = "Other (I'll share on WhatsApp)";

export function gymSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/—|–/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Module-level cache so the dropdown opens instantly after the first fetch
let cache: string[] | null = null;
const subscribers = new Set<(list: string[]) => void>();

async function fetchOnce() {
  const { data, error } = await supabase.rpc("get_pickup_locations");
  if (error) {
    cache = [OTHER_PICKUP];
  } else {
    const names = ((data ?? []) as Array<{ name: string }>).map((r) => r.name);
    cache = [...names, OTHER_PICKUP];
  }
  subscribers.forEach((cb) => cb(cache!));
}

export function usePickupLocations(): string[] {
  const [list, setList] = useState<string[]>(cache ?? []);
  useEffect(() => {
    subscribers.add(setList);
    if (cache) {
      setList(cache);
    } else {
      fetchOnce();
    }
    return () => {
      subscribers.delete(setList);
    };
  }, []);
  return list;
}

export function stationFromSlug(slug: string | undefined): string | undefined {
  if (!slug || !cache) return undefined;
  const s = slug.toLowerCase();
  return cache.find((p) => gymSlug(p) === s);
}
