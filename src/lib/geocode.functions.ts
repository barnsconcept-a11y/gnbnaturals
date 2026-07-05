import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ address: z.string().min(2).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmapsKey) {
      throw new Error("Google Maps connector is not configured");
    }
    const url = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(
      data.address,
    )}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
      },
    });
    if (!res.ok) {
      throw new Error(`Geocoding failed (${res.status})`);
    }
    const body = (await res.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    if (body.status !== "OK" || body.results.length === 0) {
      throw new Error(`No result for that address (${body.status})`);
    }
    const top = body.results[0];
    return {
      formatted_address: top.formatted_address,
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
    };
  });
