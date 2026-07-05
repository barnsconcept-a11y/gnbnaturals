import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
    __gmapsInitCallbacks?: Array<() => void>;
    __gmapsInit?: () => void;
  }
}

const SCRIPT_ID = "google-maps-js";

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.google?.maps) return resolve();

    window.__gmapsInitCallbacks = window.__gmapsInitCallbacks ?? [];
    window.__gmapsInitCallbacks.push(() => resolve());

    if (document.getElementById(SCRIPT_ID)) return;

    window.__gmapsInit = () => {
      (window.__gmapsInitCallbacks ?? []).forEach((cb) => cb());
      window.__gmapsInitCallbacks = [];
    };

    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Maps browser key missing"));

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__gmapsInit${
      channel ? `&channel=${channel}` : ""
    }`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

export function MapPicker({ lat, lng, onChange, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = window.google;
        const initLat = lat ?? 5.6037; // Accra default
        const initLng = lng ?? -0.187;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: initLat, lng: initLng },
          zoom: lat && lng ? 15 : 11,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const marker = new google.maps.Marker({
          map,
          position: { lat: initLat, lng: initLng },
          draggable: true,
          visible: lat != null && lng != null,
        });
        markerRef.current = marker;

        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) onChangeRef.current(p.lat(), p.lng());
        });
        map.addListener("click", (e: any) => {
          const p = e.latLng;
          marker.setPosition(p);
          marker.setVisible(true);
          onChangeRef.current(p.lat(), p.lng());
        });
      })
      .catch((e) => {
        console.error("Map load failed", e);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker/map when props change externally (geocode result)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (lat == null || lng == null) {
      markerRef.current.setVisible(false);
      return;
    }
    const pos = { lat, lng };
    markerRef.current.setPosition(pos);
    markerRef.current.setVisible(true);
    mapRef.current.panTo(pos);
    if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg border border-border bg-muted"
      style={{ height }}
    />
  );
}
